import { useEffect, useState } from 'react'
import { PRIORITIES, PROJECT_STATUSES, type Priority, type Project, type ProjectStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/field'
import { useStore } from '@/lib/store'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set the dialog edits this project, otherwise it creates a new one. */
  project?: Project
  onCreated?: (project: Project) => void
}

export function ProjectFormDialog({ open, onOpenChange, project, onCreated }: Props) {
  const { createProject, updateProject } = useStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [status, setStatus] = useState<ProjectStatus>('Active')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setPriority(project?.priority ?? 'Medium')
    setStatus(project?.status ?? 'Active')
  }, [open, project])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    if (project) {
      const ok = await updateProject({ id: project.id, name, description, priority, status })
      if (ok) onOpenChange(false)
    } else {
      const created = await createProject({ name, description, priority })
      if (created) {
        onOpenChange(false)
        onCreated?.(created)
      }
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={project ? 'Edit project' : 'New project'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="e.g. Website redesign" />
          </div>
          <div>
            <Label htmlFor="p-desc">Description (optional)</Label>
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-pri">Priority</Label>
              <Select id="p-pri" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </div>
            {project && (
              <div>
                <Label htmlFor="p-status">Status</Label>
                <Select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {project ? 'Save changes' : 'Create project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
