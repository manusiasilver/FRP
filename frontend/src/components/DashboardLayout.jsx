import { useLocation, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSidebarState } from '../hooks/useSidebarState'
import { useUser } from '../contexts/UserContext'

const HIDE_MENU_PATHS = new Set(['/select-company', '/select-division'])

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebarState()
  const { user } = useUser()
  const u = user || {}

  const handleSidebarToggle = () => {
    if (window.innerWidth <= 1024) { setMobileMenuOpen(c => !c); return }
    setSidebarCollapsed(c => !c)
  }

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        userName={u.fullName}
        userJobLevel={u.selectedJobLevel}
        userDivision={u.selectedDivision}
        userRole={u.role}
        userIsAdmin={u.role === 'administrator'}
        allAssignments={u.allAssignments || []}
        onToggleCollapse={handleSidebarToggle}
        onCloseMobile={() => setMobileMenuOpen(false)}
        hideMenu={HIDE_MENU_PATHS.has(pathname)}
      />
      <div className="dashboard-stage">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <Outlet />
      </div>
    </div>
  )
}
