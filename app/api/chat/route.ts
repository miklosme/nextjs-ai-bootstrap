import { convertToModelMessages, generateId, streamText, type UIMessage } from 'ai'

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await request.json()

    const result = streamText({
      model: 'openai/gpt-5.4-mini',
      system:
        'You are a helpful assistant inside a Next.js starter app. Keep answers clear, practical, and concise unless the user asks for more depth.',
      messages: await convertToModelMessages(messages),
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
