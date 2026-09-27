import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TaskDetailPage } from '@/features/tasks/TaskDetailPage'

// Hash routing works from file:// once packaged.
export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
