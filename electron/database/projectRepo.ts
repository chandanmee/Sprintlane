import { desc, eq } from 'drizzle-orm'
import { projectStats } from '../../shared/progress'
import {
  projectCreateSchema,
  projectUpdateSchema,
  type Project,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  type ProjectWithStats,
} from '../../shared/types'
import { getDb } from './client'
import { projects } from './schema'
import { listAllTasks } from './taskRepo'

const now = () => new Date().toISOString()

export async function getProject(id: string): Promise<Project> {
  const [row] = await getDb().select().from(projects).where(eq(projects.id, id))
  if (!row) throw new Error('Project not found')
  return row
}

export async function listProjects(): Promise<ProjectWithStats[]> {
  const [rows, allTasks] = await Promise.all([
    getDb().select().from(projects).orderBy(desc(projects.createdAt)),
    listAllTasks(),
  ])
  return rows.map((p) => ({
    ...p,
    stats: projectStats(allTasks.filter((t) => t.projectId === p.id)),
  }))
}

export async function createProject(raw: ProjectCreateInput): Promise<Project> {
  const input = projectCreateSchema.parse(raw)
  const ts = now()
  const [row] = await getDb()
    .insert(projects)
    .values({ ...input, status: 'Active', createdAt: ts, updatedAt: ts })
    .returning()
  return row
}

export async function updateProject(raw: ProjectUpdateInput): Promise<Project> {
  const { id, ...input } = projectUpdateSchema.parse(raw)
  const current = await getProject(id)
  const patch: Partial<typeof projects.$inferInsert> = { ...input, updatedAt: now() }
  if (input.status) {
    patch.archivedAt = input.status === 'Archived' ? (current.archivedAt ?? now()) : null
  }
  await getDb().update(projects).set(patch).where(eq(projects.id, id))
  return getProject(id)
}

export async function archiveProject(id: string): Promise<Project> {
  return updateProject({ id, status: 'Archived' })
}
