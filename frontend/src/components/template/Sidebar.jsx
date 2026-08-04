import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getItemKey(item) {
  return item.id ?? item.href ?? item.label
}

function getGroupKey(item) {
  return `group:${getItemKey(item)}`
}

function isItemActive(item, currentPath) {
  if (item.href === '/frp' && currentPath === '/') return true
  if (item.href === '/') return currentPath === '/'
  if (item.href === currentPath) {
    return true
  }

  return item.children?.some((child) => isItemActive(child, currentPath)) ?? false
}

function getInitiallyExpandedGroups(items, currentPath) {
  return items.reduce((expandedGroups, item) => {
    if (item.children?.length && isItemActive(item, currentPath)) {
      expandedGroups[getGroupKey(item)] = true
    }

    if (item.children?.length) {
      Object.assign(expandedGroups, getInitiallyExpandedGroups(item.children, currentPath))
    }

    return expandedGroups
  }, {})
}

function getInitialExpandedByPathname(pathname) {
  const map = {
    'group:FRP': ['/', '/frp', '/approval', '/approved', '/status_frp'],
    'group:RP': ['/rp', '/rp-approval', '/status_rp'],
    'group:Document': ['/document/generate', '/document/riwayat', '/document/template'],
    'group:Report': ['/laporan-frp', '/laporan-rp'],
    'group:Master Data': null,
  }
  const initial = {}
  for (const [key, paths] of Object.entries(map)) {
    if (paths ? paths.includes(pathname) : pathname.startsWith('/admin/')) {
      initial[key] = true
    }
  }
  return initial
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeDivision(value) {
  return String(value || '').trim().toUpperCase()
}

function matchesAuthRule(rule, context) {
  if (!rule) return true

  if (typeof rule === 'function') {
    return rule(context)
  }

  if (rule.allow === 'all') {
    return true
  }

  if (Array.isArray(rule.any)) {
    return rule.any.some((nestedRule) => matchesAuthRule(nestedRule, context))
  }

  if (Array.isArray(rule.all)) {
    return rule.all.every((nestedRule) => matchesAuthRule(nestedRule, context))
  }

  const roleList = Array.isArray(rule.roles) ? rule.roles.map(normalizeText) : null
  const divisionList = Array.isArray(rule.divisions) ? rule.divisions.map(normalizeDivision) : null
  const jobLevelList = Array.isArray(rule.jobLevels) ? rule.jobLevels.map(normalizeText) : null

  if (roleList && !roleList.includes(context.role)) {
    return false
  }

  if (divisionList && !divisionList.some((division) => context.divisions.has(division))) {
    return false
  }

  if (jobLevelList && !jobLevelList.includes(context.jobLevel)) {
    return false
  }

  return true
}

function filterMenuItems(items, context) {
  return (items || [])
    .map((item) => {
      if (!matchesAuthRule(item.auth, context)) {
        return null
      }

      if (item.children?.length) {
        const children = filterMenuItems(item.children, context)

        if (!children.length) {
          return null
        }

        return {
          ...item,
          children,
        }
      }

      return item
    })
    .filter(Boolean)
}

function SidebarNavItem({
  item,
  selectedPath,
  collapsed,
  onSelect,
  expandedGroups,
  onToggleGroup,
  depth = 0,
}) {
  const Icon = item.icon
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, selectedPath)
  const expanded = hasChildren ? expandedGroups[getGroupKey(item)] ?? false : false
  const isButton = hasChildren || !item.href
  const submenuId = hasChildren ? `${getGroupKey(item)}-submenu` : undefined
  const className = [
    'nav-item',
    active ? 'active' : '',
    hasChildren ? 'nav-item--accordion' : '',
    expanded ? 'nav-item--expanded' : '',
    isButton ? 'nav-item--button' : '',
    depth > 0 ? 'nav-item--child' : '',
    item.variant === 'danger' || item.danger ? 'logout-item' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {Icon ? (
        typeof Icon === 'string' ? (
          <span className="material-icons-round nav-icon" style={{ fontSize: depth > 0 ? '18px' : '22px', opacity: depth > 0 ? 0.75 : 1, transform: item.flipIcon ? 'scaleX(-1)' : 'none', display: 'inline-block' }}>{Icon}</span>
        ) : (
          <Icon className="nav-icon" size={22} />
        )
      ) : (
        <span className="nav-item__bullet" aria-hidden="true" />
      )}
      <span className="nav-text">{item.label}</span>
      {hasChildren ? (
        <span 
          className="material-icons-round nav-item__chevron"
          style={{ 
            fontSize: '18px',
            marginLeft: 'auto',
            transform: expanded ? 'rotate(90deg)' : 'none', 
            transition: 'transform 0.2s ease, opacity 0.2s ease' 
          }}
        >
          chevron_right
        </span>
      ) : null}
    </>
  )

  const handleClick = (event) => {
    if (hasChildren) {
      event.preventDefault()
      onToggleGroup?.(item)
      return
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    onSelect?.(item)
  }

  const trigger = isButton ? (
    <button
      type="button"
      className={className}
      data-tooltip={collapsed ? item.label : undefined}
      aria-controls={submenuId}
      aria-current={active && !hasChildren ? 'page' : undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      onClick={handleClick}
    >
      {content}
    </button>
  ) : (
    <a
      href={item.href}
      className={className}
      data-tooltip={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={handleClick}
    >
      {content}
    </a>
  )

  if (hasChildren && !collapsed) {
    return (
      <div className="nav-group">
        {trigger}
        <div
          id={submenuId}
          className={`nav-submenu${expanded ? ' expanded' : ''}`}
          aria-hidden={!expanded}
        >
          <div className="nav-submenu__inner">
            {item.children.map((child) => (
              <SidebarNavItem
                key={getItemKey(child)}
                item={child}
                selectedPath={selectedPath}
                collapsed={collapsed}
                onSelect={onSelect}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return trigger
}

function Sidebar({
  collapsed = false,
  mobileOpen = false,
  userName = 'User',
  userJobLevel = '',
  userDivision = '',
  userRole = 'staff',
  userIsAdmin = false,
  allAssignments = [],
  canChangeAccess = false,
  changeAccessHref = '',
  onToggleCollapse,
  onCloseMobile,
  onChangeAccess,
  hideMenu = false
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [sessionUserInfo, setSessionUserInfo] = useState(null)

  useEffect(() => {
    let cancelled = false

    api.get(`/api/auth/me?_ts=${Date.now()}`, { cache: 'no-store' })
      .then((data) => {
        if (!cancelled) {
          setSessionUserInfo(data?.user || data || null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionUserInfo(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Prefer the latest user state from props so access changes update the sidebar immediately.
  const resolvedUserName = userName || sessionUserInfo?.name || sessionUserInfo?.fullName || sessionUserInfo?.username || 'User'
  const resolvedUserDivision = userDivision || sessionUserInfo?.selectedDivision || sessionUserInfo?.department || ''
  const resolvedUserJobLevel = userJobLevel || sessionUserInfo?.selectedJobLevel || sessionUserInfo?.job_level || sessionUserInfo?.jobLevelName || ''
  const resolvedUserJobPosition = sessionUserInfo?.job_position || sessionUserInfo?.jobPosition || ''
  const resolvedUserRole = userRole || sessionUserInfo?.role || 'staff'
  const resolvedIsAdmin = userIsAdmin || sessionUserInfo?.role === 'administrator'
  const resolvedAssignments = (Array.isArray(allAssignments) && allAssignments.length > 0)
    ? allAssignments
    : (Array.isArray(sessionUserInfo?.allAssignments) && sessionUserInfo.allAssignments.length > 0)
      ? sessionUserInfo.allAssignments
      : []

  const uniqueCompanies = [...new Set((resolvedAssignments || []).map(a => a.name))]
  const showChangeAccess = canChangeAccess || (resolvedAssignments || []).length > 1
  const backUrl = changeAccessHref || (uniqueCompanies.length > 1 ? '/select-company' : '/select-division')
  const normalizedRole = normalizeText(resolvedUserRole)
  const normalizedJobLevel = normalizeText(resolvedUserJobLevel)
  const assignmentDivisions = useMemo(
    () => {
      const divisions = new Set(
        (resolvedAssignments || [])
          .map((assignment) => normalizeDivision(assignment?.class))
          .filter(Boolean),
      )

      if (resolvedUserDivision) {
        divisions.add(normalizeDivision(resolvedUserDivision))
      }

      return divisions
    },
    [resolvedAssignments, resolvedUserDivision],
  )
  const isAdmin = resolvedIsAdmin || normalizedRole === 'administrator'
  const isITUser = normalizeDivision(resolvedUserDivision) === 'IT' || assignmentDivisions.has('IT')
  const authContext = useMemo(() => ({
    role: normalizedRole,
    jobLevel: normalizedJobLevel,
    division: normalizeDivision(resolvedUserDivision),
    divisions: assignmentDivisions,
    isAdmin,
    isITUser,
  }), [assignmentDivisions, isAdmin, isITUser, normalizedJobLevel, normalizedRole, resolvedUserDivision])

  const primaryItems = useMemo(() => {
    const rawItems = hideMenu ? [] : [
      { label: 'Generate Document', href: '/document/generate', icon: 'note_add', auth: { allow: 'all' } },
      { label: 'Riwayat Document', href: '/document/riwayat', icon: 'history', auth: { allow: 'all' } },
      { label: 'Kelola Template', href: '/document/template', icon: 'folder_open', auth: { allow: 'all' } },
    ]

    return filterMenuItems(rawItems, authContext)
  }, [authContext, hideMenu])

  const secondaryItems = useMemo(() => {
    const rawItems = [
      ...(showChangeAccess && !hideMenu ? [{
        label: 'Change Access',
        href: backUrl,
        icon: 'switch_account',
        auth: { allow: 'all' },
      }] : []),
      {
        label: 'Back Pilargroup',
        href: 'https://pilargroup.id/dashboard',
        icon: 'logout',
        danger: true,
        external: true,
        flipIcon: true,
        auth: { allow: 'all' },
      },
    ]

    return filterMenuItems(rawItems, authContext)
  }, [authContext, backUrl, hideMenu, showChangeAccess])

  const initialExpandedPathname = useMemo(() => getInitialExpandedByPathname(pathname), [pathname])
  const [userExpandedGroups, setUserExpandedGroups] = useState({})
  const activeExpandedGroups = useMemo(
    () => getInitiallyExpandedGroups([...primaryItems, ...secondaryItems], pathname),
    [pathname, primaryItems, secondaryItems]
  )
  const visibleExpandedGroups = useMemo(
    () => ({
      ...initialExpandedPathname,
      ...activeExpandedGroups,
      ...userExpandedGroups,
    }),
    [initialExpandedPathname, activeExpandedGroups, userExpandedGroups],
  )

  const handleSelect = async (item) => {
    if (item.href === '/select-company' || item.href === '/select-division') {
      onChangeAccess?.(item.href)
      if (mobileOpen) {
        onCloseMobile?.()
      }
      return
    }

    if (item.href === '/logout') { 
        if (mobileOpen) { onCloseMobile?.() }
        window.location.href = '/logout'
        return 
    }
    
    if (item.external && item.href) {
      if (mobileOpen) { onCloseMobile?.() }
      window.location.assign(item.href)
      return
    }

    if (item.action) {
      onAction?.(item.action, item)
      if (mobileOpen) { onCloseMobile?.() }
      return
    }

    if (!item.href) {
      return
    }

    navigate(item.href)

    if (mobileOpen) {
      onCloseMobile?.()
    }
  }

  const handleToggleGroup = (item) => {
    const groupKey = getGroupKey(item)

    if (collapsed) {
      setUserExpandedGroups((currentGroups) => ({
        ...currentGroups,
        [groupKey]: true,
      }))
      onToggleCollapse?.()
      return
    }

    setUserExpandedGroups((currentGroups) => ({
      ...currentGroups,
      [groupKey]: !(visibleExpandedGroups[groupKey] ?? false),
    }))
  }

  const sidebarClassName = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const initials = getInitials(resolvedUserName)
  
  const displayedRole = resolvedUserJobPosition || resolvedUserJobLevel || resolvedUserRole || (resolvedIsAdmin ? 'Administrator' : 'Staff')



  return (
    <>
      <button
        type="button"
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={onCloseMobile}
        aria-label="Tutup menu"
      />
      <aside id="sidebar" className={sidebarClassName}>
        <button
          type="button"
          className="sidebar-toggle"
          aria-label="Toggle Sidebar"
          onClick={onToggleCollapse}
        >
          <span className="material-icons-round toggle-icon" style={{ fontSize: '16px' }}>
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        <button
          type="button"
          className="sidebar-mobile-dismiss"
          aria-label="Close Sidebar"
          onClick={onCloseMobile}
        >
          <span className="material-icons-round" style={{ fontSize: '20px' }}>close</span>
        </button>

        <div className="sidebar-logo">
          <div className="profile-content">
            <div className="profile-avatar">
              <span className="profile-avatar__badge">{initials}</span>
              <div className="online-status" />
            </div>

            <div className="profile-info">
              <h3 className="profile-name" title={resolvedUserName}>{resolvedUserName}</h3>
              <p className="profile-role">{displayedRole}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {primaryItems.map((item) => (
            <SidebarNavItem
              key={getItemKey(item)}
              item={item}
              selectedPath={pathname}
              collapsed={collapsed}
              onSelect={handleSelect}
              expandedGroups={visibleExpandedGroups}
              onToggleGroup={handleToggleGroup}
            />
          ))}
        </nav>

        <div className="sidebar-bottom">
          {secondaryItems.map((item) => (
            <SidebarNavItem
              key={getItemKey(item)}
              item={item}
              selectedPath={pathname}
              collapsed={collapsed}
              onSelect={handleSelect}
              expandedGroups={visibleExpandedGroups}
              onToggleGroup={handleToggleGroup}
            />
          ))}
        </div>

        <div className="sidebar-copyright" aria-label="Copyright">
          <p>&copy; 2026 PT Pilar Niaga Makmur</p>
          <p>Developed by IT Team </p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
