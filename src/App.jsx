import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './components/LandingPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import PortalLayout from './components/PortalLayout.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { modules } from './data/modules.js'

const DashboardPage = lazy(() => import('./components/DashboardPage.jsx'))
const ReportsPage = lazy(() => import('./components/ReportsPage.jsx'))
const ResourcePage = lazy(() => import('./components/ResourcePage.jsx'))

function PageLoading() {
  return <div className="page-loading"><span className="spinner spinner-navy" /><span>Loading your JMR space…</span></div>
}

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PortalHome() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'student' ? '/portal/student' : '/portal'} replace />
}

function ResourceRoute({ resource }) {
  const { user } = useAuth()
  if (!modules[resource]) return <Navigate to="/portal" replace />
  if (user?.role === 'student' && !['fees', 'attendance', 'complaints', 'mess', 'announcements'].includes(resource)) return <Navigate to="/portal/student" replace />
  return <ResourcePage resource={resource} user={user} />
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? children : <Navigate to={user?.role === 'student' ? '/portal/student' : '/portal'} replace />
}

export default function App() {
  return <Suspense fallback={<PageLoading />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/portal" element={<RequireAuth><PortalLayout /></RequireAuth>}>
      <Route index element={<DashboardPage />} />
      <Route path="student" element={<RoleRoute roles={['student']}><DashboardPage /></RoleRoute>} />
      <Route path="reports" element={<RoleRoute roles={['admin']}><ReportsPage /></RoleRoute>} />
      {Object.keys(modules).map(resource => <Route key={resource} path={resource} element={<ResourceRoute resource={resource} />} />)}
      <Route path="*" element={<PortalHome />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
