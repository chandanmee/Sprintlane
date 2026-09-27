import { z } from 'zod'

export const PROJECT_STATUSES = ['Active', 'Completed', 'Archived'] as const
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Delayed'] as const
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]

const title = z.string().trim().min(1, 'Required').max(200)
const description = z.string().trim().max(5000).default('')
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .nullable()
  .optional()

export const projectCreateSchema = z.object({
  name: title,
  description,
  priority: z.enum(PRIORITIES).default('Medium'),
})
export const projectUpdateSchema = z.object({
  id: z.string().min(1),
  name: title.optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
})

export const taskCreateSchema = z.object({
  projectId: z.string().min(1),
  parentTaskId: z.string().min(1).nullable().optional(),
  title,
  description,
  status: z.enum(TASK_STATUSES).default('Pending'),
  priority: z.enum(PRIORITIES).default('Medium'),
  dueDate,
})
export const taskUpdateSchema = z.object({
  id: z.string().min(1),
  title: title.optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate,
})

export type ProjectCreateInput = z.input<typeof projectCreateSchema>
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>
export type TaskCreateInput = z.input<typeof taskCreateSchema>
export type TaskUpdateInput = z.input<typeof taskUpdateSchema>

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface Task {
  id: string
  projectId: string
  parentTaskId: string | null
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

/** Counts are for top-level tasks only (subtasks never double-count). */
export interface ProjectStats {
  total: number
  pending: number
  inProgress: number
  delayed: number
  completed: number
  progress: number
}

export interface ProjectWithStats extends Project {
  stats: ProjectStats
}

export interface DatabaseInfo {
  path: string
  sizeBytes: number
  projects: number
  tasks: number
  backupsDir: string
}

export type BackupResult =
  | { ok: true; path: string }
  | { ok: false; canceled?: boolean; error?: string }

export type ImportResult =
  | { ok: true; safetyBackupPath: string }
  | { ok: false; canceled?: boolean; error?: string }

/** Desktop reminders. Notifications only fire while SprintLane is running (open or in the tray). */
export interface AppSettings {
  notificationsEnabled: boolean
  /** Remind this many days before a task's due date (0 = due-today only). */
  reminderDays: number
  /** Start SprintLane, minimized to the tray, when Windows logs in. */
  launchAtLogin: boolean
}

export const appSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  reminderDays: z.number().int().min(0).max(14).optional(),
  launchAtLogin: z.boolean().optional(),
})
export type AppSettingsInput = z.input<typeof appSettingsSchema>

export interface SprintLaneApi {
  projects: {
    list(): Promise<ProjectWithStats[]>
    create(input: ProjectCreateInput): Promise<Project>
    update(input: ProjectUpdateInput): Promise<Project>
    archive(id: string): Promise<Project>
  }
  tasks: {
    list(projectId: string): Promise<Task[]>
    create(input: TaskCreateInput): Promise<Task>
    update(input: TaskUpdateInput): Promise<Task>
    delete(id: string): Promise<void>
  }
  backup: {
    info(): Promise<DatabaseInfo>
    export(): Promise<BackupResult>
    import(): Promise<ImportResult>
  }
  settings: {
    get(): Promise<AppSettings>
    update(patch: AppSettingsInput): Promise<AppSettings>
    /** Fires an immediate desktop notification so the user can confirm they actually see it. Resolves false if the OS reports notifications aren't supported. */
    testNotification(): Promise<boolean>
  }
  app: {
    quit(): Promise<void>
    /** Fired when a notification is clicked; returns an unsubscribe function. */
    onNavigate(callback: (path: string) => void): () => void
  }
}
