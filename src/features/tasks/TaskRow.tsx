import { Check, Circle, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isOverdue, taskProgress } from '@shared/progress'
import { TASK_STATUSES, type Task, type TaskStatus } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { cn, formatDate, priorityAccent, priorityStyles, taskStatusStyles } from '@/lib/utils'

export function StatusSelect({ value, onChange, className }: { value: TaskStatus; onChange: (s: TaskStatus) => void; className?: string }) {
  return (
    <select
      aria-label="Status"
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className={cn('cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', taskStatusStyles[value], className)}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  )
}

export function CompleteToggle({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.status === 'Completed'
  return (
    <button
      onClick={onToggle}
      aria-label={done ? 'Mark as pending' : 'Mark as completed'}
      title={done ? 'Reopen' : 'Complete'}
      className="shrink-0 cursor-pointer text-slate-400 hover:text-emerald-600"
    >
      {done ? <Check className="h-5 w-5 rounded-full bg-emerald-500 p-0.5 text-white" /> : <Circle className="h-5 w-5" />}
    </button>
  )
}

export function TaskRow({ task, all, subtasks }: { task: Task; all: Task[]; subtasks: Task[] }) {
  const updateTask = useStore((s) => s.updateTask)
  const done = task.status === 'Completed'
  const overdue = isOverdue(task)
  const toggle = (t: Task) => updateTask({ id: t.id, status: t.status === 'Completed' ? 'Pending' : 'Completed' })
  const link = `/projects/${task.projectId}/tasks/${task.id}`

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 border-slate-200 bg-white shadow-sm',
        priorityAccent[task.priority],
        task.status === 'Delayed' && 'bg-red-50/60 border-red-200',
        done && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <CompleteToggle task={task} onToggle={() => toggle(task)} />
        <div className="min-w-0 flex-1">
          <Link to={link} className={cn('block truncate font-medium hover:text-brand-700', done && 'line-through')}>
            {task.title}
          </Link>
          {subtasks.length > 0 && (
            <div className="text-xs text-slate-500">
              {subtasks.filter((s) => s.status === 'Completed').length}/{subtasks.length} subtasks · {taskProgress(task, all)}%
            </div>
          )}
        </div>
        {task.dueDate && (
          <span className={cn('text-xs tabular-nums', overdue ? 'font-semibold text-red-600' : 'text-slate-500')}>
            {overdue ? 'Overdue · ' : ''}
            {formatDate(task.dueDate)}
          </span>
        )}
        <Badge className={priorityStyles[task.priority]}>
          {task.priority === 'Critical' && <Flame className="mr-1 h-3 w-3" />}
          {task.priority}
        </Badge>
        <StatusSelect value={task.status} onChange={(status) => updateTask({ id: task.id, status })} />
      </div>
      {subtasks.length > 0 && (
        <ul className="border-t border-slate-100 py-1 pl-6 pr-3 text-sm">
          {subtasks.map((s, i) => (
            <li key={s.id} className={cn('flex items-center gap-2 py-1', s.status === 'Completed' && 'opacity-60')}>
              <span className="font-mono text-slate-300">{i === subtasks.length - 1 ? '└─' : '├─'}</span>
              <CompleteToggle task={s} onToggle={() => toggle(s)} />
              <Link to={`/projects/${s.projectId}/tasks/${s.id}`} className={cn('min-w-0 flex-1 truncate hover:text-brand-700', s.status === 'Completed' && 'line-through')}>
                {s.title}
              </Link>
              <span className={cn('rounded-full px-2 py-0.5 text-xs ring-1 ring-inset', taskStatusStyles[s.status])}>{s.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
