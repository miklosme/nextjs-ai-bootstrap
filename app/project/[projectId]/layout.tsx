import { ProjectSidebar } from '@/components/chat/project-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { listThreadSummaries } from '@/lib/chat/history'
import { resolveProjectHostRoot } from '@/lib/projects'
import { FolderIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
            <div className="min-w-0 flex-1">
              <div className="flex flex-row truncate text-sm font-medium">
                <Link className="flex flex-row gap-2 hover:underline" href="/">
                  <FolderIcon className="size-4" data-icon="inline-start" /> Projects
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
