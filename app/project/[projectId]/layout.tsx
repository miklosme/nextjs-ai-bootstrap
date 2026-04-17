import { ProjectSidebar } from '@/components/chat/project-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="bg-background/90 sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b px-4 py-3 backdrop-blur">
            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link className="flex min-w-0 items-center gap-2" href="/">
                        <FolderIcon data-icon="inline-start" />
                        <span className="truncate">Projects</span>
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="block max-w-full truncate">
                      {projectId}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <SidebarTrigger />
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">{children}</div>
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
