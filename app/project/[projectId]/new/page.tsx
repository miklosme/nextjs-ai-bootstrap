import { notFound } from 'next/navigation'

import { NewThreadComposer } from '@/components/chat/new-thread-composer'
import { resolveProjectHostRoot } from '@/lib/projects'

export default async function NewProjectChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  try {
    await resolveProjectHostRoot(projectId)
  } catch {
    notFound()
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="flex w-full flex-1 items-center justify-center py-4">
        <NewThreadComposer projectId={projectId} />
      </div>
    </div>
  )
}
