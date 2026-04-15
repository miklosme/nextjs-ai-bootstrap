import { notFound } from 'next/navigation'

import { WorkspaceChat } from '@/components/chat/workspace-chat'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loadThread } from '@/lib/chat/history'
import { label } from '@/lib/id'
import { resolveProjectHostRoot } from '@/lib/projects'

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ projectId: string; threadId: string }>
}) {
  const { projectId, threadId } = await params

  try {
    await resolveProjectHostRoot(projectId)
  } catch {
    notFound()
  }

  const fullThreadId = label('chat', threadId)
  const thread = await loadThread(projectId, fullThreadId)

  if (!thread) {
    notFound()
  }

  const fallbackTitle =
    thread.title ??
    thread.messages
      .find((message) => message.role === 'user')
      ?.parts.filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim() ??
    'New Chat'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className={!thread.title ? 'text-base font-medium' : undefined}>
            {fallbackTitle || 'New Chat'}
          </CardTitle>
          <CardDescription>
            Saved under `/workspace/.history` for this project and available to the mounted agent.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="min-h-0 flex-1">
        <WorkspaceChat
          autostart={thread.pendingResponse}
          initialMessages={thread.messages}
          projectId={projectId}
          threadId={thread.id}
        />
      </div>
    </div>
  )
}
