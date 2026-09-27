import { Archive, ArrowLeft, ListChecks, Pencil } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { projectStats } from '@shared/progress'
import { PRIORITIES, PROJECT_STATUSES, type Priority, type ProjectStatus, type TaskStatus } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { cn, compareTasks, priorityStyles, projectStatusStyles } from '@/lib/utils'
import { QuickAddTask } from '@/features/tasks/QuickAddTask'
import { TaskRow } from '@/features/tasks/TaskRow'
import { ProjectFormDialog } from './ProjectFormDialog'

type Filter = 'All' | TaskStatus
const FILTERS: Filter[] = ['All', 'Pending', 'In Progress', 'Delayed', 'Completed']

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const project = useStore((s) => s.projects.find((p) => p.id === projectId))
  const projectsLoaded = useStore((s) => s.projectsLoaded)
  const allTasks = useStore((s) => s.tasks)
  const tasksProjectId = useStore((s) => s.tasksProjectId)
  const { loadTasks, updateProject, archiveProject } = useStore()
  const [filter, setFilter] = useState<Filter>('All')
  const [editing, setEditing] = useState(false)
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadTasks(projectId)
  }, [projectId, loadTasks])

  const tasks = useMemo(() => (tasksProjectId === projectId ? allTasks : []), [allTasks, tasksProjectId, projectId])
  const stats = useMemo(() => projectStats(tasks), [tasks])
  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks])
  const shown = useMemo(
    () => topLevel.filter((t) => filter === 'All' || t.status === filter).sort(compareTasks),
    [topLevel, filter],
  )
  const countFor = (f: Filter) => (f === 'All' ? topLevel.length : topLevel.filter((t) => t.status === f).length)

  if (!project) {
    return projectsLoaded ? (
      <div>
        <Link to="/projects" className="text-sm text-brand-700">← Back to Projects</Link>
        <p className="mt-6 text-slate-600">This project no longer exists.</p>
      </div>
    ) : null
  }

  return (
    <div className="space-y-5">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{project.name}</h1>
          {project.description && <p className="mt-1 text-slate-500">{project.description}</p>}
          <div className="mt-2 flex items-center gap-2">
            <select
              aria-label="Project status"
              value={project.status}
              onChange={(e) => updateProject({ id: project.id, status: e.target.value as ProjectStatus })}
              className={cn('cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', projectStatusStyles[project.status])}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Project priority"
              value={project.priority}
              onChange={(e) => updateProject({ id: project.id, priority: e.target.value as Priority })}
              className={cn('cursor-pointer rounded-full px-2 py-0.5 text-xs ring-1 ring-inset', priorityStyles[project.priority])}
            >
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          {project.status !== 'Archived' && (
            <Button variant="outline" size="sm" onClick={() => void archiveProject(project.id)}>
              <Archive className="h-3 w-3" /> Archive
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Progress: {stats.progress}%</span>
          <span className="text-slate-500">
            {stats.completed} of {stats.total} tasks completed
            {stats.delayed > 0 && <Badge className="ml-2 bg-red-50 text-red-700 ring-red-400">{stats.delayed} delayed</Badge>}
          </span>
        </div>
        <Progress value={stats.progress} className="h-3" />
      </div>

      <QuickAddTask ref={addRef} projectId={project.id} />

      <div role="tablist" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1 text-sm ring-1 ring-inset',
              filter === f ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50',
            )}
          >
            {f} <span className="opacity-70">{countFor(f)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ListChecks className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-2 font-medium">{topLevel.length === 0 ? 'No tasks yet' : `No ${filter.toLowerCase()} tasks`}</p>
          <p className="mt-1 text-sm text-slate-500">
            {topLevel.length === 0 ? 'Add your first task above to start moving.' : 'Try a different filter.'}
          </p>
          {topLevel.length === 0 && (
            <Button className="mt-3" variant="outline" onClick={() => addRef.current?.focus()}>
              Add Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} all={tasks} subtasks={tasks.filter((s) => s.parentTaskId === t.id)} />
          ))}
        </div>
      )}

      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={project} />
    </div>
  )
}
