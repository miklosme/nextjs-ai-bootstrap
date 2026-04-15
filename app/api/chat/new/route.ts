import { createThreadFromFirstMessage } from '@/lib/chat/history'
import { unlabel } from '@/lib/id'
import { resolveProjectHostRoot } from '@/lib/projects'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string
      text?: string
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId : null
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!projectId || !text) {
      return Response.json({ error: 'Invalid new chat request.' }, { status: 400 })
    }

    try {
      await resolveProjectHostRoot(projectId)
    } catch {
      return Response.json({ error: 'Project not found.' }, { status: 404 })
    }

    const thread = await createThreadFromFirstMessage(projectId, text)

    return Response.json({
      redirectPath: `/project/${projectId}/chat/${unlabel(thread.id)}`,
      threadId: thread.id,
    })
  } catch (error) {
    console.error('New chat API error:', error)

    return Response.json({ error: 'Failed to create chat.' }, { status: 500 })
  }
}
