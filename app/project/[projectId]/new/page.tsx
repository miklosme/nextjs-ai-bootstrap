import { notFound, redirect } from 'next/navigation'

import { createThread } from '@/lib/chat/history'
import { unlabel } from '@/lib/id'
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

  const thread = await createThread(projectId)

  redirect(`/project/${projectId}/chat/${unlabel(thread.id)}`)
}
