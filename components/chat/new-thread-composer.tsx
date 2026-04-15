'use client'

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function NewThreadComposer({ projectId }: { projectId: string }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Start a new chat</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Send the first message to create the thread and continue in the full chat view.
        </p>
      </div>

      <div className="bg-background rounded-2xl border p-4 shadow-sm">
        <PromptInput
          onSubmit={async (message) => {
            const text = message.text.trim()

            if (!text || isPending) {
              return
            }

            setError(null)

            const response = await fetch('/api/chat/new', {
              body: JSON.stringify({ projectId, text }),
              headers: {
                'Content-Type': 'application/json',
              },
              method: 'POST',
            })

            if (!response.ok) {
              setError('Unable to start a new chat right now.')
              return
            }

            const data = (await response.json()) as { redirectPath?: string }

            const redirectPath = data.redirectPath

            if (!redirectPath) {
              setError('Unable to start a new chat right now.')
              return
            }

            startTransition(() => {
              router.push(redirectPath)
            })
          }}
        >
          <PromptInputTextarea
            disabled={isPending}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Ask the agent to inspect files, compare folders, or reason from the mounted tree..."
            rows={1}
            value={input}
          />
          <PromptInputFooter>
            <PromptInputTools>
              <span>Enter to start</span>
              <span>Shift+Enter for a new line</span>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!input.trim() || isPending}
              status={isPending ? 'submitted' : 'ready'}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>

      {error && <p className="text-destructive text-center text-sm">{error}</p>}
    </div>
  )
}
