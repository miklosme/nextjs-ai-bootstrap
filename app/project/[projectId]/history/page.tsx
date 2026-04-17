import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CHAT_HISTORY_PAGE_SIZE, listThreadSummaries } from '@/lib/chat/history'
import { unlabel } from '@/lib/id'
import { resolveProjectHostRoot } from '@/lib/projects'
import { ChevronLeftIcon, ChevronRightIcon, HistoryIcon } from 'lucide-react'

const parsePage = (value?: string) => {
  const page = Number.parseInt(value ?? '1', 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

export default async function ProjectHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { projectId } = await params
  const { page } = await searchParams

  try {
    await resolveProjectHostRoot(projectId)
  } catch {
    notFound()
  }

  const history = await listThreadSummaries(projectId, parsePage(page), CHAT_HISTORY_PAGE_SIZE)

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
              <HistoryIcon data-icon="inline-start" />
              Chat History
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>All chats for {projectId}</CardTitle>
              <CardDescription>
                Page {history.page} of {history.totalPages}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-3">
          {history.threads.map((thread) => (
            <Card key={thread.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      thread.titleState.kind === 'empty'
                        ? 'text-muted-foreground truncate text-sm'
                        : 'truncate text-sm font-medium'
                    }
                  >
                    {thread.titleState.text}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Intl.DateTimeFormat('en', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(thread.updatedAt))}
                  </p>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/project/${projectId}/chat/${unlabel(thread.id)}`}>Open Chat</Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {history.threads.length === 0 && (
            <Card>
              <CardContent className="text-muted-foreground p-6 text-sm">No chats yet.</CardContent>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {history.hasPreviousPage ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/project/${projectId}/history?page=${history.page - 1}`}>
                <ChevronLeftIcon data-icon="inline-start" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button disabled size="sm" variant="outline">
              <ChevronLeftIcon data-icon="inline-start" />
              Previous
            </Button>
          )}

          <span className="text-muted-foreground text-sm">
            {history.totalThreads} total {history.totalThreads === 1 ? 'chat' : 'chats'}
          </span>

          {history.hasNextPage ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/project/${projectId}/history?page=${history.page + 1}`}>
                Next
                <ChevronRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <Button disabled size="sm" variant="outline">
              Next
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
