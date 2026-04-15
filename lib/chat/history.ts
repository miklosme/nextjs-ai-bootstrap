import { generateId } from 'ai'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { FilesystemChatMessage } from '@/lib/agents/filesystem-agent'
import { createId, unlabel } from '@/lib/id'
import { resolveProjectHistoryRoot } from '@/lib/projects'

export const CHAT_HISTORY_PAGE_SIZE = 30

export type ChatThreadId = `chat-${string}`

export type ChatThreadRecord = {
  id: ChatThreadId
  createdAt: string
  updatedAt: string
  pendingResponse: boolean
  title: string | null
  messages: FilesystemChatMessage[]
}

export type ChatThreadTitleState =
  | { kind: 'title' | 'message'; text: string }
  | { kind: 'empty'; text: 'New Chat' }

export type ChatThreadSummary = {
  id: ChatThreadId
  createdAt: string
  updatedAt: string
  messageCount: number
  title: string | null
  titleState: ChatThreadTitleState
}

export type PaginatedThreadSummaries = {
  threads: ChatThreadSummary[]
  page: number
  pageSize: number
  totalThreads: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const pad = (value: number) => value.toString().padStart(2, '0')

const isNotFoundError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const formatTimestampForFilename = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`

const getThreadHistoryFilename = (thread: Pick<ChatThreadRecord, 'id' | 'createdAt'>) =>
  `${formatTimestampForFilename(new Date(thread.createdAt))}-${unlabel(thread.id)}.json`

const getTextFromMessage = (message: FilesystemChatMessage) =>
  message.parts.reduce((text, part) => (part.type === 'text' ? text + part.text : text), '')

const getFallbackTitleFromMessages = (messages: FilesystemChatMessage[]) => {
  const firstUserMessage = messages.find((message) => message.role === 'user')

  if (!firstUserMessage) {
    return null
  }

  return collapseWhitespace(getTextFromMessage(firstUserMessage)) || null
}

const toThreadSummary = (thread: ChatThreadRecord): ChatThreadSummary => {
  if (thread.title) {
    return {
      createdAt: thread.createdAt,
      id: thread.id,
      messageCount: thread.messages.length,
      title: thread.title,
      titleState: { kind: 'title', text: thread.title },
      updatedAt: thread.updatedAt,
    }
  }

  const fallbackTitle = getFallbackTitleFromMessages(thread.messages)

  if (fallbackTitle) {
    return {
      createdAt: thread.createdAt,
      id: thread.id,
      messageCount: thread.messages.length,
      title: null,
      titleState: { kind: 'message', text: fallbackTitle },
      updatedAt: thread.updatedAt,
    }
  }

  return {
    createdAt: thread.createdAt,
    id: thread.id,
    messageCount: thread.messages.length,
    title: null,
    titleState: { kind: 'empty', text: 'New Chat' },
    updatedAt: thread.updatedAt,
  }
}

async function ensureProjectHistoryRoot(projectId: string) {
  const historyRoot = await resolveProjectHistoryRoot(projectId)

  await mkdir(historyRoot, { recursive: true })

  return historyRoot
}

async function readProjectHistoryDirectory(projectId: string) {
  const historyRoot = await resolveProjectHistoryRoot(projectId)

  try {
    return {
      entries: await readdir(historyRoot, { withFileTypes: true }),
      historyRoot,
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

async function readThreadRecord(filePath: string): Promise<ChatThreadRecord> {
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as ChatThreadRecord

  if (
    typeof parsed !== 'object' ||
    parsed == null ||
    typeof parsed.id !== 'string' ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.updatedAt !== 'string' ||
    !Array.isArray(parsed.messages)
  ) {
    throw new Error(`Invalid chat history file: ${filePath}`)
  }

  return {
    createdAt: parsed.createdAt,
    id: parsed.id as ChatThreadId,
    messages: parsed.messages as FilesystemChatMessage[],
    pendingResponse: parsed.pendingResponse === true,
    title: typeof parsed.title === 'string' ? parsed.title : null,
    updatedAt: parsed.updatedAt,
  }
}

async function findThreadHistoryFilePath(projectId: string, threadId: ChatThreadId) {
  const historyDirectory = await readProjectHistoryDirectory(projectId)

  if (!historyDirectory) {
    return null
  }

  const suffix = `-${unlabel(threadId)}.json`
  const matchingEntry = historyDirectory.entries.find(
    (entry) => entry.isFile() && entry.name.endsWith(suffix),
  )

  if (!matchingEntry) {
    return null
  }

  return path.join(historyDirectory.historyRoot, matchingEntry.name)
}

async function loadAllThreads(projectId: string): Promise<ChatThreadRecord[]> {
  const historyDirectory = await readProjectHistoryDirectory(projectId)

  if (!historyDirectory) {
    return []
  }

  const threads = (
    await Promise.allSettled(
      historyDirectory.entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => readThreadRecord(path.join(historyDirectory.historyRoot, entry.name))),
    )
  )
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)

  return threads.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export async function createThread(projectId: string): Promise<ChatThreadRecord> {
  const now = new Date().toISOString()
  const thread: ChatThreadRecord = {
    createdAt: now,
    id: createId('chat'),
    messages: [],
    pendingResponse: false,
    title: null,
    updatedAt: now,
  }

  await saveThread(projectId, thread)

  return thread
}

export async function loadThread(
  projectId: string,
  threadId: ChatThreadId,
): Promise<ChatThreadRecord | null> {
  const filePath = await findThreadHistoryFilePath(projectId, threadId)

  if (!filePath) {
    return null
  }

  return readThreadRecord(filePath)
}

export async function saveThread(projectId: string, thread: ChatThreadRecord): Promise<void> {
  const historyRoot = await ensureProjectHistoryRoot(projectId)
  const filePath = path.join(historyRoot, getThreadHistoryFilename(thread))

  await writeFile(filePath, `${JSON.stringify(thread, null, 2)}\n`, 'utf8')
}

export async function saveThreadMessages(
  projectId: string,
  threadId: ChatThreadId,
  messages: FilesystemChatMessage[],
): Promise<ChatThreadRecord> {
  const existingThread = await loadThread(projectId, threadId)

  if (!existingThread) {
    throw new Error(`Thread not found: ${threadId}`)
  }

  const nextThread: ChatThreadRecord = {
    ...existingThread,
    messages,
    pendingResponse: false,
    updatedAt: new Date().toISOString(),
  }

  await saveThread(projectId, nextThread)

  return nextThread
}

export async function createThreadFromFirstMessage(
  projectId: string,
  text: string,
): Promise<ChatThreadRecord> {
  const trimmedText = collapseWhitespace(text)

  if (!trimmedText) {
    throw new Error('First message text is required.')
  }

  const now = new Date().toISOString()
  const thread: ChatThreadRecord = {
    createdAt: now,
    id: createId('chat'),
    messages: [
      {
        id: generateId(),
        parts: [{ text: trimmedText, type: 'text' }],
        role: 'user',
      },
    ],
    pendingResponse: true,
    title: null,
    updatedAt: now,
  }

  await saveThread(projectId, thread)

  return thread
}

export async function saveThreadTitle(
  projectId: string,
  threadId: ChatThreadId,
  title: string,
): Promise<ChatThreadRecord | null> {
  const existingThread = await loadThread(projectId, threadId)

  if (!existingThread) {
    return null
  }

  const trimmedTitle = collapseWhitespace(title)

  if (!trimmedTitle) {
    return existingThread
  }

  const nextThread: ChatThreadRecord = {
    ...existingThread,
    title: trimmedTitle,
  }

  await saveThread(projectId, nextThread)

  return nextThread
}

export async function listThreadSummaries(
  projectId: string,
  page = 1,
  pageSize = CHAT_HISTORY_PAGE_SIZE,
): Promise<PaginatedThreadSummaries> {
  const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const normalizedPageSize = Math.max(1, Math.floor(pageSize))
  const threads = await loadAllThreads(projectId)
  const totalThreads = threads.length
  const totalPages = Math.max(1, Math.ceil(totalThreads / normalizedPageSize))
  const currentPage = Math.min(normalizedPage, totalPages)
  const start = (currentPage - 1) * normalizedPageSize
  const pageThreads = threads.slice(start, start + normalizedPageSize).map(toThreadSummary)

  return {
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    page: currentPage,
    pageSize: normalizedPageSize,
    threads: pageThreads,
    totalPages,
    totalThreads,
  }
}

export async function getMostRecentThreadSummary(
  projectId: string,
): Promise<ChatThreadSummary | null> {
  const { threads } = await listThreadSummaries(projectId, 1, 1)

  return threads[0] ?? null
}
