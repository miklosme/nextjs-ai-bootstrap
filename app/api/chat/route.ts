import { convertToModelMessages, generateId, stepCountIs, streamText } from 'ai'

import {
  createFilesystemTools,
  FILESYSTEM_AGENT_SYSTEM_PROMPT,
  type FilesystemChatMessage,
} from '@/lib/agents/filesystem-agent'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { messages }: { messages: FilesystemChatMessage[] } = await request.json()
    const tools = createFilesystemTools()
    const modelMessages = await convertToModelMessages(messages, { tools })
    const result = streamText({
      model: 'openai/gpt-5.4-mini',
      stopWhen: stepCountIs(12),
      system: FILESYSTEM_AGENT_SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
    })

    return result.toUIMessageStreamResponse({
      generateMessageId: generateId,
      onError: () => 'Something went wrong.',
      originalMessages: messages,
    })
  } catch (error) {
    console.error('Chat API error:', error)

    return Response.json({ error: 'Failed to process chat request.' }, { status: 500 })
  }
}
