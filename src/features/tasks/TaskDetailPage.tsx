import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { taskProgress } from '@shared/progress'
import { PRIORITIES, type Priority, type TaskStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { cn, compareTasks } from '@/lib/utils'
import { CompleteToggle, StatusSelect } from './TaskRow'

export function TaskDetailPage() {
  const { projectId = '', taskId = '' } = useParams()
  const navigate = useNavigate()
  const tasks = useStore((s) => s.tasks)
  const tasksProjectId = useStore((s) => s.tasksProjectId)
  const projectName = useStore((s) => s.projects.find((p) => p.id === projectId)?.name)
  const { loadTasks, updateTask, createTask, deleteTask } = useStore()

  const task = tasksProjectId === projectId ? tasks.find((t) => t.id === taskId) : undefined
  const subtasks = tasks.filter((t) => t.parentTaskId === taskId).sort(compareTasks)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [status, setStatus] = useState<TaskStatus>('Pending')
  const [dueDate, setDueDate] = useState('')
  const [newSub, setNewSub] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadedId, setLoadedId] = useState('')

  useEffect(() => {
    void loadTasks(projectId)
  }, [projectId, loadTasks])

  // Fill the form once per task; later store refreshes (e.g. subtask toggles) must not clobber edits.
  useEffect(() => {
    if (!task || loadedId === task.id) return
    setTitle(task.title)
    setDescription(task.description)
    setPriority(task.priority)
    setStatus(task.status)
    setDueDate(task.dueDate ?? '')
    setLoadedId(task.id)
  }, [task, loadedId])

  // Status can change from outside the form (completing the last subtask completes the parent).
  useEffect(() => {
    if (task) setStatus(task.status)
  }, [task?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) {
    return (
      <div>
        <Link to={`/projects/${projectId}`} className="text-sm text-brand-700">← Back to project</Link>
        {tasksProjectId === projectId && <p className="mt-6 text-slate-600">This task no longer exists.</p>}
      </div>
    )
  }

  const isSubtask = !!task.parentTaskId
  const back = isSubtask ? `/projects/${projectId}/tasks/${task.parentTaskId}` : `/projects/${projectId}`
  const dirty =
    title !== task.title ||
    description !== task.description ||
    priority !== task.priority ||
    status !== task.status ||
    (dueDate || null) !== task.dueDate

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await updateTask({ id: task!.id, title, description, priority, status, dueDate: dueDate || null })
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSub.trim()) return
    const created = await createTask({ projectId, parentTaskId: task!.id, title: newSub, priority: task!.priority })
    if (created) setNewSub('')
  }

  return (
    <div className="space-y-6">
      <Link to={back} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back to {isSubtask ? 'task' : (projectName ?? 'project')}
      </Link>

      <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">{isSubtask ? 'Subtask' : 'Task'}</h1>
        <div>
          <Label htmlFor="t-title">Title</Label>
          <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div>
          <Label htmlFor="t-desc">Description</Label>
          <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Status</Label>
            <StatusSelect value={status} onChange={setStatus} className="h-9 w-full rounded-md px-3 text-sm" />
          </div>
          <div>
            <Label htmlFor="t-pri">Priority</Label>
            <Select id="t-pri" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="t-due">Due date</Label>
            <Input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button type="submit" disabled={!dirty || !title.trim()}>
            Save changes
          </Button>
        </div>
      </form>

      {!isSubtask && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Subtasks</h2>
            <span className="text-sm text-slate-500">Progress: {taskProgress(task, tasks)}%</span>
          </div>
          <Progress value={taskProgress(task, tasks)} className="mb-4" />
          {subtasks.length === 0 && <p className="mb-3 text-sm text-slate-500">No subtasks. Break this task down if it helps.</p>}
          <ul className="mb-3 space-y-1">
            {subtasks.map((s) => (
              <li key={s.id} className={cn('flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50', s.status === 'Completed' && 'opacity-60')}>
                <CompleteToggle task={s} onToggle={() => updateTask({ id: s.id, status: s.status === 'Completed' ? 'Pending' : 'Completed' })} />
                <Link to={`/projects/${projectId}/tasks/${s.id}`} className={cn('flex-1 truncate hover:text-brand-700', s.status === 'Completed' && 'line-through')}>
                  {s.title}
                </Link>
                <button
                  aria-label={`Delete subtask ${s.title}`}
                  onClick={() => void deleteTask(s.id)}
                  className="cursor-pointer text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addSubtask} className="flex gap-2">
            <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a subtask and press Enter…" maxLength={200} aria-label="Subtask title" />
            <Button type="submit" variant="outline" disabled={!newSub.trim()}>
              <Plus className="h-4 w-4" /> Add Subtask
            </Button>
          </form>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={subtasks.length > 0 ? `This also deletes its ${subtasks.length} subtask(s). This cannot be undone.` : 'This cannot be undone.'}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (await deleteTask(task.id)) navigate(back)
        }}
      />
    </div>
  )
}
