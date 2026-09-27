import { FolderPlus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { useStore } from '@/lib/store'
import { ProjectCard } from './ProjectCard'
import { ProjectFormDialog } from './ProjectFormDialog'

export function ProjectsPage() {
  const projects = useStore((s) => s.projects)
  const loaded = useStore((s) => s.projectsLoaded)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const visible = projects.filter((p) => showArchived || p.status !== 'Archived')
  const archivedCount = projects.filter((p) => p.status === 'Archived').length

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Browse and manage all of your projects"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        }
      />

      {archivedCount > 0 && (
        <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived ({archivedCount})
        </label>
      )}

      {loaded && visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FolderPlus className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold">No projects yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create your first project to start tracking tasks.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <ProjectFormDialog open={creating} onOpenChange={setCreating} onCreated={(p) => navigate(`/projects/${p.id}`)} />
    </div>
  )
}
