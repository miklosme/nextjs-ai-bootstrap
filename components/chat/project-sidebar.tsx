'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import type { ChatThreadSummary } from '@/lib/chat/history'
import { unlabel } from '@/lib/id'
import { FolderIcon, HistoryIcon, MessageSquarePlusIcon } from 'lucide-react'

export function ProjectSidebar({
  projectId,
  recentThreads,
  totalThreads,
}: {
  projectId: string
  recentThreads: ChatThreadSummary[]
  totalThreads: number
}) {
  const params = useParams<{ threadId?: string }>()
  const activeThreadId = params.threadId

  return (
    <Sidebar collapsible="offcanvas" side="left">
      <SidebarHeader>
        <div className="flex flex-col gap-1 px-2 py-1">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
            <FolderIcon data-icon="inline-start" className="size-4" />
            <span className="truncate text-xs font-medium">{projectId}</span>
          </div>
        </div>
        <Button asChild className="w-full" size="sm">
          <Link href={`/project/${projectId}/new`}>
            <MessageSquarePlusIcon data-icon="inline-start" />
            New Chat
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarSeparator className="ml-0" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {recentThreads.length === 0 ? (
              <div className="text-muted-foreground px-2 py-3 text-sm">No chats yet.</div>
            ) : (
              <SidebarMenu>
                {recentThreads.map((thread) => {
                  const threadPath = `/project/${projectId}/chat/${unlabel(thread.id)}`
                  const isActive = activeThreadId === unlabel(thread.id)

                  return (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton
                        asChild
                        className="h-auto items-start py-2"
                        isActive={isActive}
                      >
                        <Link className="flex min-w-0 flex-col items-start gap-1" href={threadPath}>
                          <span
                            className={
                              thread.titleState.kind === 'empty'
                                ? 'text-muted-foreground block w-full truncate text-sm'
                                : 'block w-full truncate text-sm'
                            }
                          >
                            {thread.titleState.text}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {totalThreads > recentThreads.length && (
          <Button asChild className="w-full" size="sm" variant="outline">
            <Link href={`/project/${projectId}/history`}>
              <HistoryIcon data-icon="inline-start" />
              Browse All Chats
            </Link>
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
