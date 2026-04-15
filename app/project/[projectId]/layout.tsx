import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProjectSidebar } from '@/components/chat/project-sidebar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { listThreadSummaries } from '@/lib/chat/history'
import { resolveProjectHostRoot } from '@/lib/projects'
import { FolderIcon } from 'lucide-react'

export default async function ProjectLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}>) {
  const { projectId } = await params

  try {
    await resolveProjectHostRoot(projectId)
  } catch {
    notFound()
  }

  const recentThreads = await listThreadSummaries(projectId, 1, 30)

  return (
    <SidebarProvider defaultOpen>
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <header className="bg-background/90 sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur">
            <Badge variant="secondary">openai/gpt-5.4-mini</Badge>
            <Separator className="h-4" orientation="vertical" />
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
                <FolderIcon data-icon="inline-start" />
                Workspace
              </div>
              <div className="truncate text-sm font-medium">
                <Link className="hover:underline" href="/">
                  Projects
                </Link>{' '}
                / {projectId}
              </div>
            </div>
            <SidebarTrigger />
          </header>

          <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
        </div>
      </SidebarInset>
      <ProjectSidebar
        projectId={projectId}
        recentThreads={recentThreads.threads}
        totalThreads={recentThreads.totalThreads}
      />
    </SidebarProvider>
  )
}
