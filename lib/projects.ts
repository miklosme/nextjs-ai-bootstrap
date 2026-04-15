import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const PROJECTS_ROOT = path.join(process.cwd(), 'projects')

const isSafeProjectId = (projectId: string) =>
  !!projectId &&
  projectId === path.basename(projectId) &&
  !projectId.startsWith('.') &&
  !projectId.includes(path.sep)

export async function listProjectIds(): Promise<string[]> {
  const entries = await readdir(PROJECTS_ROOT, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
}

export async function resolveProjectHostRoot(projectId: string): Promise<string> {
  if (!isSafeProjectId(projectId)) {
    throw new Error(`Invalid project id: ${projectId}`)
  }

  const projectRoot = path.join(PROJECTS_ROOT, projectId)
  const projectStats = await stat(projectRoot).catch(() => null)

  if (!projectStats?.isDirectory()) {
    throw new Error(`Project not found: ${projectId}`)
  }

  return projectRoot
}

export async function resolveProjectHistoryRoot(projectId: string): Promise<string> {
  return path.join(await resolveProjectHostRoot(projectId), '.history')
}
