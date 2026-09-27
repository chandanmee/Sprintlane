import { CheckCircle2, Clock, FolderKanban, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog'

function Stat({ label, value, icon: Icon, tone, bg }: { label: string; value: number; icon: typeof Clock; tone: string; bg: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-5 w-5', tone)} />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-bold leading-tight tabular-nums text-slate-900">{value}</div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const projects = useStore((s) => s.projects)
  const loaded = useStore((s) => s.projectsLoaded)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const live = projects.filter((p) => p.status !== 'Archived')
  const active = live.filter((p) => p.status === 'Active')
  const sum = (k: 'pending' | 'inProgress' | 'delayed' | 'completed') => live.reduce((n, p) => n + p.stats[k], 0)

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Your projects at a glance"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Total Projects" value={live.length} icon={FolderKanban} tone="text-brand-600" bg="bg-brand-50" />
        <Stat label="Pending Tasks" value={sum('pending') + sum('inProgress')} icon={Clock} tone="text-amber-600" bg="bg-amber-50" />
        <Stat label="Delayed" value={sum('delayed')} icon={TriangleAlert} tone={sum('delayed') > 0 ? 'text-red-600' : 'text-slate-400'} bg={sum('delayed') > 0 ? 'bg-red-50' : 'bg-slate-100'} />
        <Stat label="Completed" value={sum('completed')} icon={CheckCircle2} tone="text-emerald-600" bg="bg-emerald-50" />
      </div>

      <h2 className="mb-2 mt-5 text-base font-semibold">Active Projects</h2>
      {loaded && active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No active projects. Create one to get moving.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {active.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-2.5">
              <Link to={`/projects/${p.id}`} className="w-56 shrink-0 truncate font-medium hover:text-brand-700">
                {p.name}
              </Link>
              <span className="w-10 text-right text-sm font-semibold tabular-nums">{p.stats.progress}%</span>
              <Progress value={p.stats.progress} className="flex-1" />
              <span className="w-40 shrink-0 text-right text-xs text-slate-500">
                {p.stats.pending + p.stats.inProgress} open
                {p.stats.delayed > 0 && <span className="ml-2 font-semibold text-red-600">{p.stats.delayed} delayed</span>}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${p.id}`)}>
                <Plus className="h-3 w-3" /> Task
              </Button>
            </div>
          ))}
        </div>
      )}

      <ProjectFormDialog open={creating} onOpenChange={setCreating} onCreated={(p) => navigate(`/projects/${p.id}`)} />
    </div>
  )
}
