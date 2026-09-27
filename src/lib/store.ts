import { create } from 'zustand'
import type {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectWithStats,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
} from '@shared/types'

const api = () => window.sprintlane

/** Electron prefixes IPC errors with "Error invoking remote method ...:"; keep just the message. */
const message = (err: unknown) =>
  (err instanceof Error ? err.message : String(err)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

interface Toast {
  id: number
  kind: 'error' | 'success'
  text: string
}

interface State {
  projects: ProjectWithStats[]
  projectsLoaded: boolean
  tasks: Task[]
  tasksProjectId: string | null
  toast: Toast | null

  notify: (kind: Toast['kind'], text: string) => void
  dismissToast: () => void
  loadProjects: () => Promise<void>
  createProject: (input: ProjectCreateInput) => Promise<Project | null>
  updateProject: (input: ProjectUpdateInput) => Promise<boolean>
  archiveProject: (id: string) => Promise<boolean>
  loadTasks: (projectId: string) => Promise<void>
  createTask: (input: TaskCreateInput) => Promise<Task | null>
  updateTask: (input: TaskUpdateInput) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  /** Drop cached data and reload, e.g. after a backup import replaced the database. */
  reset: () => Promise<void>
}

let toastSeq = 0

export const useStore = create<State>((set, get) => {
  /** Wraps a mutation: reports errors as a toast and refreshes whatever the mutation can affect. */
  async function run<T>(fn: () => Promise<T>, refreshTasksFor?: string): Promise<T | null> {
    try {
      const result = await fn()
      await Promise.all([get().loadProjects(), refreshTasksFor ? get().loadTasks(refreshTasksFor) : undefined])
      return result
    } catch (err) {
      get().notify('error', message(err))
      return null
    }
  }

  return {
    projects: [],
    projectsLoaded: false,
    tasks: [],
    tasksProjectId: null,
    toast: null,

    notify: (kind, text) => set({ toast: { id: ++toastSeq, kind, text } }),
    dismissToast: () => set({ toast: null }),

    loadProjects: async () => {
      try {
        set({ projects: await api().projects.list(), projectsLoaded: true })
      } catch (err) {
        get().notify('error', message(err))
      }
    },
    createProject: (input) => run(() => api().projects.create(input)),
    updateProject: async (input) => (await run(() => api().projects.update(input))) !== null,
    archiveProject: async (id) => (await run(() => api().projects.archive(id))) !== null,

    loadTasks: async (projectId) => {
      try {
        const tasks = await api().tasks.list(projectId)
        set({ tasks, tasksProjectId: projectId })
      } catch (err) {
        get().notify('error', message(err))
      }
    },
    createTask: (input) => run(() => api().tasks.create(input), input.projectId),
    updateTask: async (input) => {
      const pid = get().tasksProjectId ?? undefined
      return (await run(() => api().tasks.update(input), pid)) !== null
    },
    deleteTask: async (id) => {
      const pid = get().tasksProjectId ?? undefined
      return (await run(() => api().tasks.delete(id).then(() => true), pid)) !== null
    },

    reset: async () => {
      set({ tasks: [], tasksProjectId: null })
      await get().loadProjects()
    },
  }
})
