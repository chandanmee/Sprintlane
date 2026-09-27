import { FolderKanban, LayoutDashboard, Settings, X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false },
]

const settingsNav = { to: '/settings', label: 'Settings', icon: Settings, end: false }

function Toast() {
  const toast = useStore((s) => s.toast)
  const dismiss = useStore((s) => s.dismissToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismiss, toast.kind === 'error' ? 6000 : 3500)
    return () => clearTimeout(t)
  }, [toast, dismiss])
  if (!toast) return null
  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg',
        toast.kind === 'error' ? 'bg-red-600' : 'bg-slate-900',
      )}
    >
      <span className="flex-1">{toast.text}</span>
      <button onClick={dismiss} aria-label="Dismiss" className="cursor-pointer opacity-80 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function SideLink({ to, label, icon: Icon, end }: (typeof nav)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}

export function AppShell() {
  const loadProjects = useStore((s) => s.loadProjects)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // Refresh on navigation so counts and progress are never stale.
  useEffect(() => {
    void loadProjects()
  }, [loadProjects, pathname])

  // Clicking a Windows notification tells the renderer where to go.
  useEffect(() => window.sprintlane.app.onNavigate((path) => navigate(path)), [navigate])

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4">
        <div className="mb-5 px-2">
          <img src={logo} alt="SprintLane" className="-mx-1 -my-3 h-auto w-45 max-w-none" />
          {/* <div className="text-[12px] leading-none font-medium  text-slate-500 mt-1">Stop Stalling. Start Moving.</div> */}
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <SideLink {...settingsNav} />
        </div>
      </aside>
      <main className="scroll-stable min-w-0 flex-1 overflow-y-auto">
        <div className="w-full px-6 py-5">
          <Outlet />
        </div>
      </main>
      <Toast />
    </div>
  )
}
