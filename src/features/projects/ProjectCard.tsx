import { Link } from 'react-router-dom'
import type { ProjectWithStats } from '@shared/types'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, priorityStyles, projectStatusStyles } from '@/lib/utils'

export function ProjectCard({ project }: { project: ProjectWithStats }) {
  const { stats } = project
  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn(
        'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500 hover:shadow',
        project.status !== 'Active' && 'opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate font-semibold">{project.name}</h3>
        <span className="text-sm font-semibold tabular-nums text-slate-700">{stats.progress}%</span>
      </div>
      {project.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description}</p>}
      <Progress value={stats.progress} className="mt-3" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className={projectStatusStyles[project.status]}>{project.status}</Badge>
        <Badge className={priorityStyles[project.priority]}>{project.priority}</Badge>
        <span className="ml-auto text-xs text-slate-500">
          {stats.completed}/{stats.total} done
          {stats.delayed > 0 && <span className="ml-2 font-semibold text-red-600">{stats.delayed} delayed</span>}
        </span>
      </div>
    </Link>
  )
}
