import { cn } from '@/lib/utils'

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}
    >
      <div
        className={cn('h-full rounded-full transition-all', value === 100 ? 'bg-emerald-500' : 'bg-brand-500')}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
