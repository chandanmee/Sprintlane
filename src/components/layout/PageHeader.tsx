import type { ReactNode } from 'react'

/**
 * Shared page title block. Every top-level page uses the exact same title size,
 * subtitle slot and spacing so switching routes doesn't shift the header or the
 * actions next to it — only the words change.
 */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex min-h-9 items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {actions}
    </div>
  )
}
