import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function getInitials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function getItemKey(item) {
  return item.id ?? item.href ?? item.label
}

function isItemActive(item, pathname) {
  if (item.href === '/') return pathname === '/'
  if (item.href) return pathname === item.href
  return item.children?.some(c => isItemActive(c, pathname)) ?? false
}

function SidebarNavItem({ item, pathname, collapsed, expandedGroups, onToggleGroup, onSelect, isChild = false }) {
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, pathname)
  const expanded = hasChildren ? (expandedGroups[getItemKey(item)] ?? false) : false

  const className = [
    'nav-item',
    isChild ? 'nav-item--child' : '',
    active ? 'active' : '',
    hasChildren ? 'nav-item--accordion' : '',
    expanded ? 'nav-item--expanded' : '',
    hasChildren ? 'nav-item--button' : '',
    item.danger ? 'logout-item' : '',
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {isChild
        ? <span className="nav-item__bullet" />
        : <span className="material-icons-round nav-icon" style={{ fontSize: '22px' }}>{item.icon}</span>
      }
      <span className="nav-text">{item.label}</span>
      {hasChildren && <span className="material-icons-round nav-item__chevron" style={{ fontSize: '18px', marginLeft: 'auto' }}>chevron_right</span>}
    </>
  )

  const handleClick = e => {
    e.preventDefault()
    if (hasChildren) { onToggleGroup(getItemKey(item)); return }
    onSelect(item)
  }

  return (
    <>
      {hasChildren ? (
        <button type="button" className={className} data-tooltip={collapsed ? item.label : undefined} onClick={handleClick}>
          {content}
        </button>
      ) : (
        <a href={item.href} className={className} data-tooltip={collapsed ? item.label : undefined} onClick={handleClick}>
          {content}
        </a>
      )}
      {hasChildren && !collapsed && (
        <div className={`nav-submenu${expanded ? ' expanded' : ''}`}>
          {item.children.map(child => (
            <SidebarNavItem key={getItemKey(child)} item={child} pathname={pathname} collapsed={collapsed} expandedGroups={expandedGroups} onToggleGroup={onToggleGroup} onSelect={onSelect} isChild />
          ))}
        </div>
      )}
    </>
  )
}

export default function Sidebar({ collapsed = false, userName = 'User', userRole = 'Staff', userIsAdmin = false, allAssignments = [], onToggleCollapse }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [expandedGroups, setExpandedGroups] = useState({})

  const uniqueCompanies = [...new Set((allAssignments || []).map(a => a.name))]
  const showBack = (allAssignments || []).length > 1
  const backUrl = uniqueCompanies.length > 1 ? '/select-company' : '/select-division'

  const primaryItems = [
    { label: 'New Request', href: '/', icon: 'add_circle' },
    { label: 'Approval', href: '/approval', icon: 'pending_actions' },
    { label: 'Approved', href: '/approved', icon: 'check_circle' },
    ...(userIsAdmin ? [{
      label: 'Master Data', icon: 'admin_panel_settings', children: [
        { label: 'Karyawan', href: '/admin/employees', icon: 'people' },
        { label: 'Vendor', href: '/admin/vendors', icon: 'store' },
        { label: 'Departemen', href: '/admin/departments', icon: 'account_tree' },
        { label: 'Anggaran', href: '/admin/budgets', icon: 'savings' },
        { label: 'Roles', href: '/admin/roles', icon: 'manage_accounts' },
      ]
    }] : []),
  ]

  const secondaryItems = [
    ...(showBack ? [{ label: 'Ganti Akses', href: backUrl, icon: 'swap_horiz' }] : []),
    { label: 'Logout', href: '/logout', icon: 'logout', danger: true },
  ]

  const onToggleGroup = key => setExpandedGroups(g => ({ ...g, [key]: !g[key] }))

  const onSelect = item => {
    if (item.href === '/logout') { window.location.href = '/logout'; return }
    navigate(item.href)
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button type="button" className="sidebar-toggle" aria-label="Toggle Sidebar" onClick={onToggleCollapse}>
        <span className="material-icons-round toggle-icon" style={{ fontSize: '16px' }}>
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      <div className="sidebar-logo">
        <div className="profile-content">
          <div className="profile-avatar">
            <span className="profile-avatar__badge">{getInitials(userName)}</span>
            <div className="online-status" />
          </div>
          <div className="profile-info">
            <h3 className="profile-name">{userName}</h3>
            <p className="profile-role">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {primaryItems.map(item => (
          <SidebarNavItem key={getItemKey(item)} item={item} pathname={pathname} collapsed={collapsed} expandedGroups={expandedGroups} onToggleGroup={onToggleGroup} onSelect={onSelect} />
        ))}
      </nav>

      <div className="sidebar-bottom">
        {secondaryItems.map(item => (
          <SidebarNavItem key={getItemKey(item)} item={item} pathname={pathname} collapsed={collapsed} expandedGroups={expandedGroups} onToggleGroup={onToggleGroup} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  )
}
