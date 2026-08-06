import { useLocation, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSidebarState } from '../../hooks/useSidebarState'
import { useUser } from '../../contexts/UserContext'

function getDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.displayName ||
    'User'
  )
}

function getDisplayJobLevel(user) {
  return (
    user?.selectedJobLevel ||
    user?.jobLevelName ||
    user?.jobLevel ||
    user?.role ||
    'staff'
  )
}

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebarState()
  const { user } = useUser()
  const u = user || {}
  const breadcrumbLabelMap = {
    '/': 'Dashboard',
    '/frp': 'New FRP',
    '/approval': 'Approval FRP',
    '/approved': 'Approved FRP',
    '/rp': 'New RP',
    '/rp-approval': 'Approval RP',
    '/rp-approved': 'Approved RP',
  }

  const handleSidebarToggle = () => {
    if (window.innerWidth <= 1024) { setMobileMenuOpen(c => !c); return }
    setSidebarCollapsed(c => !c)
  }

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        userName={getDisplayName(u)}
        userJobLevel={getDisplayJobLevel(u)}
        userDivision={u.selectedDivision}
        userRole={u.role || u.selectedRole}
        userIsAdmin={u.role === 'administrator' || u.selectedRole === 'administrator'}
        allAssignments={u.allAssignments || []}
        canChangeAccess={false}
        onToggleCollapse={handleSidebarToggle}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="dashboard-stage">
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)}
          breadcrumb={[
            { label: 'FRP', href: '#' },
            {
              label: breadcrumbLabelMap[pathname] ?? pathname.substring(1),
              href: '#',
              active: true,
            }
          ]}
          notificationProps={{}}
          onRefresh={() => window.location.reload()}
        />
        <Outlet />
      </div>
    </div>
  )
}
