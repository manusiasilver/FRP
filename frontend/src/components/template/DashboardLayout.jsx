import { useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSidebarState } from '../../hooks/useSidebarState'
import { useUser } from '../../contexts/UserContext'
import SelectDivisionPage from '../../pages/SelectDivisionPage'
import {
  ACCESS_DIALOG_CHECKED_USER_KEY,
  POST_LOGIN_ACCESS_DIALOG_KEY,
  isPageReload,
} from '../../utils/auth'

const HIDE_MENU_PATHS = new Set(['/select-company', '/select-division'])

function normalizeText(value) {
  return String(value || '').trim()
}

function getAssignmentCompany(assignment) {
  if (typeof assignment === 'string') {
    return normalizeText(assignment)
  }

  return normalizeText(
    assignment?.name ||
    assignment?.companyName ||
    assignment?.company ||
    assignment?.company_name,
  )
}

function getAssignmentDivisions(assignment) {
  if (Array.isArray(assignment?.classes) && assignment.classes.length > 0) {
    return assignment.classes.map(normalizeText).filter(Boolean)
  }

  return [
    assignment?.class,
    assignment?.dept_class,
    assignment?.departmentClass,
    assignment?.departmentName,
    assignment?.deptName,
  ].map(normalizeText).filter(Boolean)
}

function getUniqueCompanyCount(user) {
  const companies = new Set()

  if (Array.isArray(user?.companies)) {
    user.companies.forEach((company) => {
      const companyName = normalizeText(company?.name || company)
      if (companyName) companies.add(companyName)
    })
  }

  if (Array.isArray(user?.allAssignments)) {
    user.allAssignments.forEach((assignment) => {
      const companyName = getAssignmentCompany(assignment)
      if (companyName) companies.add(companyName)
    })
  }

  return companies.size
}

function getUniqueAccessKeys(user) {
  const accessKeys = new Set()

  if (Array.isArray(user?.allAssignments)) {
    user.allAssignments.forEach((assignment) => {
      const companyName = getAssignmentCompany(assignment) || normalizeText(user?.selectedCompany)
      const divisions = getAssignmentDivisions(assignment)

      if (divisions.length === 0 && companyName) {
        accessKeys.add(`${companyName}::`)
        return
      }

      divisions.forEach((division) => {
        accessKeys.add(`${companyName}::${division}`)
      })
    })
  }

  if (Array.isArray(user?.departments)) {
    user.departments.forEach((department) => {
      const companyName = normalizeText(
        department?.companyName ||
        department?.company ||
        user?.selectedCompany,
      )
      const division = normalizeText(
        department?.class ||
        department?.dept_class ||
        department?.name,
      )

      if (division) accessKeys.add(`${companyName}::${division}`)
    })
  }

  return accessKeys
}

function hasMultipleAccessOptions(user) {
  if (!user) return false

  const companyCount = getUniqueCompanyCount(user)
  const accessKeys = getUniqueAccessKeys(user)

  return companyCount > 1 || accessKeys.size > 1
}

function getAccessDialogUserKey(user) {
  const identity =
    user?.id ||
    user?.internal_id ||
    user?.username ||
    user?.email ||
    'anonymous'
  const accessKeys = [...getUniqueAccessKeys(user)].sort().join('|')

  return `${identity}::${accessKeys}`
}

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
  const navigate = useNavigate()
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebarState()
  const { user } = useUser()
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)
  const u = user || {}
  const canChangeAccess = hasMultipleAccessOptions(u)
  const changeAccessHref = getUniqueCompanyCount(u) > 1 ? '/select-company' : '/select-division'
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

  useEffect(() => {
    if (HIDE_MENU_PATHS.has(pathname)) {
      return
    }

    if (!user) {
      return
    }

    try {
      const shouldOpenAccessDialog = sessionStorage.getItem(POST_LOGIN_ACCESS_DIALOG_KEY) === '1'
      const checkedUserKey = getAccessDialogUserKey(user)
      const hasCheckedCurrentUser = sessionStorage.getItem(ACCESS_DIALOG_CHECKED_USER_KEY) === checkedUserKey

      if (!shouldOpenAccessDialog && hasCheckedCurrentUser) {
        return
      }

      sessionStorage.removeItem(POST_LOGIN_ACCESS_DIALOG_KEY)
      sessionStorage.setItem(ACCESS_DIALOG_CHECKED_USER_KEY, checkedUserKey)

      if (isPageReload()) {
        return
      }

      if (hasMultipleAccessOptions(user)) {
        setIsAccessDialogOpen(true)
      }
    } catch (_) {}
  }, [pathname, user])

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
        canChangeAccess={canChangeAccess}
        changeAccessHref={changeAccessHref}
        onToggleCollapse={handleSidebarToggle}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onChangeAccess={(href) => {
          if (href === '/select-company') {
            navigate('/select-company')
          } else {
            setIsAccessDialogOpen(true)
          }
        }}
        hideMenu={HIDE_MENU_PATHS.has(pathname)}
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

      <SelectDivisionPage
        isOpen={isAccessDialogOpen}
        user={u}
        includeAllCompanies
        onClose={() => setIsAccessDialogOpen(false)}
        onSuccess={() => setIsAccessDialogOpen(false)}
      />
    </div>
  )
}
