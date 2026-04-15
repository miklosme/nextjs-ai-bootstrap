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
import type { FilesystemChatMessage } from '@/lib/agents/filesystem-agent'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { RotateCcwIcon, SparklesIcon } from 'lucide-react'
import { useState } from 'react'

const chatTransport = new DefaultChatTransport({ api: '/api/chat' })

type BashToolPart = Extract<FilesystemChatMessage['parts'][number], { type: 'tool-bash' }>

const getTextFromMessage = (message: FilesystemChatMessage) =>
  message.parts.reduce((text, part) => (part.type === 'text' ? text + part.text : text), '')

const BashToolInvocation = ({ part }: { part: BashToolPart }) => {
  switch (part.state) {
    case 'input-streaming':
      return (
        <div className="bg-muted/30 text-muted-foreground rounded-md border p-3 text-sm">
          Preparing bash command...
        </div>
      )

    case 'input-available':
      return (
        <div className="bg-muted/30 space-y-2 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Bash</p>
          <pre className="bg-background overflow-x-auto rounded p-3 whitespace-pre-wrap">
            <code>{part.input.command}</code>
          </pre>
        </div>
      )

    case 'output-available':
      return (
        <div className="bg-muted/30 space-y-3 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Bash
            </p>
            <span className="text-muted-foreground text-xs">exit {part.output.exitCode}</span>
          </div>

          <pre className="bg-background overflow-x-auto rounded p-3 whitespace-pre-wrap">
            <code>{part.input.command}</code>
          </pre>

          {part.output.stdout && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Stdout
              </p>
              <pre className="bg-background overflow-x-auto rounded p-3 whitespace-pre-wrap">
                <code>{part.output.stdout}</code>
              </pre>
            </div>
          )}

          {part.output.stderr && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Stderr
              </p>
              <pre className="bg-background overflow-x-auto rounded p-3 whitespace-pre-wrap">
                <code>{part.output.stderr}</code>
              </pre>
            </div>
          )}
        </div>
      )

    case 'output-error':
      return (
        <div className="border-destructive/40 bg-destructive/5 space-y-2 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Bash</p>
          {part.input?.command && (
            <pre className="bg-background overflow-x-auto rounded p-3 whitespace-pre-wrap">
              <code>{part.input.command}</code>
            </pre>
          )}
          <p className="text-destructive whitespace-pre-wrap">{part.errorText}</p>
        </div>
      )

    case 'approval-requested':
    case 'approval-responded':
    case 'output-denied':
      return (
        <div className="bg-muted/30 text-muted-foreground rounded-md border p-3 text-sm">
          Bash execution is waiting on approval.
        </div>
      )
  }
}

export default function Home() {
  const [input, setInput] = useState('')
  const { error, messages, regenerate, sendMessage, status, stop } = useChat<FilesystemChatMessage>(
    {
      transport: chatTransport,
    },
  )

  const isLoading = status === 'submitted' || status === 'streaming'

  return (
    <main className="flex min-h-screen">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SparklesIcon />
                <h1>Filesystem Agent</h1>
              </div>
              <p>Bash-native agent over this repo and the example `projects/` workspaces</p>
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
                    description="Ask it to inspect the codebase, compare project files, or reason from the mounted filesystem."
                    icon={<SparklesIcon className="size-5" />}
                    title="Start a filesystem conversation"
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
                            <div className="space-y-3">
                              {message.parts.map((part, index) => {
                                switch (part.type) {
                                  case 'text':
                                    return (
                                      <MessageResponse key={`${message.id}-text-${index}`}>
                                        {part.text}
                                      </MessageResponse>
                                    )

                                  case 'tool-bash':
                                    return <BashToolInvocation key={part.toolCallId} part={part} />

                                  default:
                                    return null
                                }
                              })}
                            </div>
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
                  placeholder="Ask the agent to inspect files, trace behavior, or reason from the repo..."
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
