import { convertToModelMessages, generateId, stepCountIs, streamText, validateUIMessages } from 'ai'

import {
  createFilesystemTools,
  FILESYSTEM_AGENT_SYSTEM_PROMPT,
  type FilesystemChatMessage,
} from '@/lib/agents/filesystem-agent'
import { saveThreadMessages, saveThreadTitle, type ChatThreadId } from '@/lib/chat/history'
import { generateThreadTitle } from '@/lib/chat/titles'
import { resolveProjectHostRoot } from '@/lib/projects'

export const runtime = 'nodejs'
export const maxDuration = 30

const getFirstUserMessageText = (messages: FilesystemChatMessage[]) => {
  const firstUserMessage = messages.find((message) => message.role === 'user')

  if (!firstUserMessage) {
    return null
  }

  const text = firstUserMessage.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .trim()

  return text || null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string
      messages?: FilesystemChatMessage[]
      projectId?: string
    }

    const { id, messages, projectId } = body

    if (typeof id !== 'string' || typeof projectId !== 'string' || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid chat request.' }, { status: 400 })
    }

    let projectRoot: string

    try {
      projectRoot = await resolveProjectHostRoot(projectId)
    } catch {
      return Response.json({ error: 'Project not found.' }, { status: 404 })
    }

    const tools = createFilesystemTools(projectRoot)
    const validatedMessages = await validateUIMessages<FilesystemChatMessage>({
      messages,
      tools,
    })
    const modelMessages = await convertToModelMessages(validatedMessages, { tools })
    const result = streamText({
      model: 'openai/gpt-5.4-mini',
      messages: modelMessages,
      stopWhen: stepCountIs(12),
      system: FILESYSTEM_AGENT_SYSTEM_PROMPT,
      tools,
    })

    return result.toUIMessageStreamResponse<FilesystemChatMessage>({
      generateMessageId: generateId,
      onFinish: async ({ messages: nextMessages }) => {
        const savedThread = await saveThreadMessages(projectId, id as ChatThreadId, nextMessages)

        if (savedThread.title) {
          return
        }

        const firstUserText = getFirstUserMessageText(savedThread.messages)

        if (!firstUserText) {
          return
        }

        const generatedTitle = await generateThreadTitle(firstUserText)

        if (generatedTitle) {
          await saveThreadTitle(projectId, id as ChatThreadId, generatedTitle)
        }
      },
      onError: () => 'Something went wrong.',
      originalMessages: validatedMessages,
    })
  } catch (error) {
    console.error('Chat API error:', error)

    return Response.json({ error: 'Failed to process chat request.' }, { status: 500 })
  }
}
