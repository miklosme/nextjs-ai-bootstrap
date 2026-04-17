import { WorkspaceChat } from '@/components/chat/workspace-chat'
import { loadThread } from '@/lib/chat/history'
import { label } from '@/lib/id'
import { resolveProjectHostRoot } from '@/lib/projects'
import { notFound } from 'next/navigation'

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspaceChat
        autostart={thread.pendingResponse}
        initialMessages={thread.messages}
        projectId={projectId}
        threadId={thread.id}
      />
    </div>
  )
}
