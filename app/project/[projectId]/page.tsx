import { notFound, redirect } from 'next/navigation'

import { getMostRecentThreadSummary } from '@/lib/chat/history'
import { unlabel } from '@/lib/id'
import { resolveProjectHostRoot } from '@/lib/projects'

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params

  try {
    await resolveProjectHostRoot(projectId)
  } catch {
    notFound()
  }

  const mostRecentThread = await getMostRecentThreadSummary(projectId)

  if (mostRecentThread) {
    redirect(`/project/${projectId}/chat/${unlabel(mostRecentThread.id)}`)
  }

  redirect(`/project/${projectId}/new`)
}
