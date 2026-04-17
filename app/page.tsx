import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { listThreadSummaries } from '@/lib/chat/history'
import { listProjectIds } from '@/lib/projects'
import { ArrowRightIcon, FolderIcon, HistoryIcon } from 'lucide-react'

export default async function Home() {
  const projectIds = await listProjectIds()
  const projects = await Promise.all(
    projectIds.map(async (projectId) => {
      const history = await listThreadSummaries(projectId, 1, 1)

      return {
        id: projectId,
        lastUpdatedAt: history.threads[0]?.updatedAt ?? null,
        threadCount: history.totalThreads,
      }
    }),
  )

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 p-6">
      <section className="flex flex-col gap-3 pt-8">
        <Badge variant="secondary">Mounted Projects</Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Choose a workspace</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            Each project opens its own persistent filesystem chat, mounts only that workspace into
            `/workspace`, and keeps thread history under `.history`.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Card className="flex flex-col" key={project.id}>
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <FolderIcon data-icon="inline-start" />
                <CardTitle>{project.id}</CardTitle>
                <CardDescription>
                  {project.threadCount === 0
                    ? 'No chats yet'
                    : `${project.threadCount} ${project.threadCount === 1 ? 'chat' : 'chats'}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-auto flex items-center justify-between gap-3">
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <HistoryIcon data-icon="inline-start" />
                {project.lastUpdatedAt
                  ? new Intl.DateTimeFormat('en', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(project.lastUpdatedAt))
                  : 'No recent activity'}
              </div>
              <Button asChild size="sm">
                <Link href={`/project/${project.id}`}>
                  Open
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
