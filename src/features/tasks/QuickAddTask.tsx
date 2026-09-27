import { Plus } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { PRIORITIES, type Priority } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { useStore } from '@/lib/store'

/** Inline task creation: a title, optional priority/due date, Enter to save. */
export const QuickAddTask = forwardRef<HTMLInputElement, { projectId: string }>(function QuickAddTask({ projectId }, ref) {
  const createTask = useStore((s) => s.createTask)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [dueDate, setDueDate] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const created = await createTask({ projectId, title, priority, dueDate: dueDate || null })
    if (created) {
      setTitle('')
      setDueDate('')
      setPriority('Medium')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <Input ref={ref} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task and press Enter…" maxLength={200} className="min-w-56 flex-1" aria-label="Task title" />
      <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-28" aria-label="Priority">
        {PRIORITIES.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </Select>
      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-40" aria-label="Due date" />
      <Button type="submit" disabled={!title.trim()}>
        <Plus className="h-4 w-4" /> Add Task
      </Button>
    </form>
  )
})
