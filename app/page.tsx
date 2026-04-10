'use client'

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { RotateCcwIcon, SparklesIcon } from 'lucide-react'
import { useState } from 'react'

const chatTransport = new DefaultChatTransport({ api: '/api/chat' })

const getTextFromMessage = (message: UIMessage) =>
  message.parts.reduce((text, part) => (part.type === 'text' ? text + part.text : text), '')

export default function Home() {
  const [input, setInput] = useState('')
  const { error, messages, regenerate, sendMessage, status, stop } = useChat({
    transport: chatTransport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  return (
    <main className="flex min-h-screen">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SparklesIcon />
                <h1>Starter AI Chat</h1>
              </div>
              <p>Opinionated Next.js AI application starter</p>
            </div>
            <Badge variant="secondary">openai/gpt-5.4-mini</Badge>
          </header>

          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <p className="text-destructive">Something went wrong while generating a reply.</p>
              <Button onClick={() => regenerate()} size="sm" type="button" variant="outline">
                <RotateCcwIcon />
                Retry
              </Button>
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <Conversation>
              {messages.length > 0 && (
                <ConversationDownload filename="starter-ai-chat.md" messages={messages} />
              )}

              <ConversationContent className="mx-auto w-full max-w-3xl">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    className="min-h-[40vh]"
                    description="Ask a question and the response will stream in live."
                    icon={<SparklesIcon className="size-5" />}
                    title="Start the conversation"
                  />
                ) : (
                  messages.map((message) => {
                    const text = getTextFromMessage(message)

                    return (
                      <Message className="max-w-full" from={message.role} key={message.id}>
                        <MessageContent
                          className={message.role === 'assistant' ? 'w-full' : undefined}
                        >
                          {message.role === 'assistant' ? (
                            <MessageResponse>{text}</MessageResponse>
                          ) : (
                            <div className="whitespace-pre-wrap">{text}</div>
                          )}
                        </MessageContent>
                      </Message>
                    )
                  })
                )}

                {status === 'submitted' && (
                  <Message className="max-w-full" from="assistant">
                    <MessageContent className="text-muted-foreground w-full">
                      Thinking...
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>

              <ConversationScrollButton />
            </Conversation>
          </div>

          <div className="border-t p-4">
            <div className="mx-auto w-full max-w-3xl">
              <PromptInput
                onSubmit={async (message) => {
                  const text = message.text.trim()

                  if (!text) {
                    return
                  }

                  await sendMessage({ text })
                  setInput('')
                }}
              >
                <PromptInputTextarea
                  disabled={isLoading}
                  onChange={(event) => setInput(event.currentTarget.value)}
                  placeholder="Ask about the app, request code, or start a conversation..."
                  rows={1}
                  value={input}
                />
                <PromptInputFooter>
                  <PromptInputTools>
                    <span>Enter to send</span>
                    <span>Shift+Enter for a new line</span>
                  </PromptInputTools>
                  <PromptInputSubmit
                    disabled={!input.trim() && !isLoading}
                    onStop={stop}
                    status={status}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
