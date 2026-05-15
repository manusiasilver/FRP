;(function () {

// BackgroundMain

const bgStyles = {
  root: {
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,243,249,1) 100%)',
  },
  texture: {
    position: 'absolute', inset: 0, opacity: 0.55,
    backgroundImage: 'linear-gradient(135deg, rgba(31,78,140,0.08) 0, rgba(31,78,140,0.08) 2px, transparent 2px, transparent 34px), radial-gradient(rgba(31,78,140,0.09) 1.2px, transparent 1.2px)',
    backgroundSize: '34px 34px, 24px 24px',
    backgroundPosition: '0 0, 12px 10px',
  },
  topCurve: {
    position: 'absolute', top: '-18%', left: '-8%', width: '88%', height: '48%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at center, rgba(210,218,228,0.94) 0%, rgba(210,218,228,0.94) 42%, rgba(210,218,228,0) 73%)',
  },
  topRing: {
    position: 'absolute', top: '-28%', right: '-12%', width: '58%', height: '58%',
    borderRadius: '50%', border: '30px solid rgba(31,78,140,0.12)',
  },
  topGlow: {
    position: 'absolute', top: '4%', right: '8%', width: '420px', height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(47,111,178,0.22) 0%, rgba(47,111,178,0) 70%)',
    filter: 'blur(6px)',
  },
  middleBand: {
    position: 'absolute', top: '26%', left: '-10%', width: '70%', height: '22%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(244,169,64,0.12) 24%, rgba(31,78,140,0.12) 68%, rgba(255,255,255,0) 100%)',
    transform: 'rotate(-10deg)',
  },
  dotField: {
    position: 'absolute', top: '14%', right: '5%', width: '26%', height: '34%', opacity: 0.9,
    backgroundImage: 'radial-gradient(rgba(31,78,140,0.22) 1.6px, transparent 1.6px)',
    backgroundSize: '18px 18px',
  },
  bottomCurve: {
    position: 'absolute', right: '-14%', bottom: '-26%', width: '78%', height: '54%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at center, rgba(214,224,236,0.88) 0%, rgba(214,224,236,0.88) 44%, rgba(214,224,236,0) 74%)',
  },
  bottomRing: {
    position: 'absolute', left: '-14%', bottom: '-28%', width: '44%', height: '44%',
    borderRadius: '50%', border: '22px solid rgba(244,169,64,0.12)',
  },
  rightGlow: {
    position: 'absolute', top: '40%', right: '-10%', width: '500px', height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244,169,64,0.2) 0%, rgba(244,169,64,0) 72%)',
    filter: 'blur(8px)',
  },
  dotLarge: { position: 'absolute', right: '64px', top: '132px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(31,78,140,0.18)' },
  dotSmall: { position: 'absolute', right: '38px', top: '176px', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(244,169,64,0.3)' },
}

function BackgroundMain({ position = 'fixed', zIndex = -1 }) {
  return (
    <div aria-hidden="true" style={{ ...bgStyles.root, position, zIndex }}>
      <div style={bgStyles.texture} />
      <div style={bgStyles.topCurve} />
      <div style={bgStyles.topRing} />
      <div style={bgStyles.topGlow} />
      <div style={bgStyles.middleBand} />
      <div style={bgStyles.dotField} />
      <div style={bgStyles.bottomCurve} />
      <div style={bgStyles.bottomRing} />
      <div style={bgStyles.rightGlow} />
      <div style={bgStyles.dotLarge} />
      <div style={bgStyles.dotSmall} />
    </div>
  )
}

// Sidebar

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function NavIcon({ name }) {
  return (
    <span
      className="material-icons-round"
      style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

function getItemKey(item) {
  return item.id ?? item.href ?? item.label
}

function getGroupKey(item) {
  return `group:${getItemKey(item)}`
}

function isItemActive(item, currentPath) {
  if (item.href === '/') return currentPath === '/'
  if (item.href && item.href !== '/' && currentPath === item.href) return true
  if (item.href === '/admin/employees') return currentPath.startsWith('/admin')

  return item.children?.some((child) => isItemActive(child, currentPath)) ?? false
}

function getInitiallyExpandedGroups(items, currentPath) {
  return items.reduce((expandedGroups, item) => {
    if (item.children?.length && isItemActive(item, currentPath)) {
      expandedGroups[getGroupKey(item)] = true
    }

    return expandedGroups
  }, {})
}

function SidebarNavItem({
  item,
  selectedPath,
  collapsed,
  expandedGroups,
  onToggleGroup,
  depth = 0,
}) {
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, selectedPath)
  const expanded = hasChildren ? expandedGroups[getGroupKey(item)] ?? false : false
  const isButton = hasChildren || !item.href
  const className = [
    'nav-item',
    active ? 'active' : '',
    hasChildren ? 'nav-item--accordion' : '',
    expanded ? 'nav-item--expanded' : '',
    isButton ? 'nav-item--button' : '',
    depth > 0 ? 'nav-item--child' : '',
    item.variant === 'danger' ? 'logout-item' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {item.icon ? <NavIcon name={item.icon} /> : <span className="nav-item__bullet" aria-hidden="true" />}
      <span className="nav-text">{item.label}</span>
      {hasChildren ? (
        <span className="material-icons-round nav-item__chevron" style={{ fontSize: '18px' }} aria-hidden="true">
          chevron_right
        </span>
      ) : null}
    </>
  )

  const handleClick = (event) => {
    if (!hasChildren) return
    event.preventDefault()
    onToggleGroup?.(item)
  }

  return (
    <>
      {isButton ? (
        <button
          type="button"
          className={className}
          data-tooltip={collapsed ? item.label : undefined}
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
        >
          {content}
        </a>
      )}

      {hasChildren && !collapsed ? (
        <div className={`nav-submenu${expanded ? ' expanded' : ''}`} aria-hidden={!expanded}>
          {item.children.map((child) => (
            <SidebarNavItem
              key={getItemKey(child)}
              item={child}
              selectedPath={selectedPath}
              collapsed={collapsed}
              expandedGroups={expandedGroups}
              onToggleGroup={onToggleGroup}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

function Sidebar({
  collapsed = false,
  userName = 'User',
  userRole = 'Staff',
  userIsAdmin = false,
  allAssignments = [],
  onToggleCollapse,
}) {
  const [selectedPath, setSelectedPath] = React.useState(window.location.pathname)

  const uniqueCompanies = [...new Set((allAssignments || []).map((a) => a.name))]
  const showBack = (allAssignments || []).length > 1
  const backUrl = uniqueCompanies.length > 1 ? '/select-company' : '/select-division'

  const primaryItems = [
    { label: 'New Request', href: '/', icon: 'add_circle' },
    { label: 'Approval', href: '/approval', icon: 'pending_actions' },
    { label: 'Approved', href: '/approved', icon: 'check_circle' },
    ...(userIsAdmin
      ? [
          {
            id: 'master-data',
            label: 'Master Data',
            icon: 'admin_panel_settings',
            children: [
              { label: 'Employees', href: '/admin/employees', icon: 'badge' },
              { label: 'Vendors', href: '/admin/vendors', icon: 'storefront' },
              { label: 'Departments', href: '/admin/departments', icon: 'apartment' },
              { label: 'Budgets', href: '/admin/budgets', icon: 'account_balance_wallet' },
              { label: 'Roles', href: '/admin/roles', icon: 'manage_accounts' },
            ],
          },
        ]
      : []),
  ]

  const secondaryItems = [
    ...(showBack ? [{ label: 'Ganti Akses', href: backUrl, icon: 'swap_horiz' }] : []),
    { label: 'Logout', href: '/logout', icon: 'logout', variant: 'danger' },
  ]

  const [expandedGroups, setExpandedGroups] = React.useState(() =>
    getInitiallyExpandedGroups([...primaryItems, ...secondaryItems], selectedPath)
  )
  const initials = getInitials(userName)

  React.useEffect(() => {
    const handleLocationChange = () => setSelectedPath(window.location.pathname)
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  React.useEffect(() => {
    setSelectedPath(window.location.pathname)
  }, [])

  React.useEffect(() => {
    const activeGroups = getInitiallyExpandedGroups([...primaryItems, ...secondaryItems], selectedPath)
    if (Object.keys(activeGroups).length === 0) return

    setExpandedGroups((currentGroups) => ({
      ...currentGroups,
      ...activeGroups,
    }))
  }, [selectedPath, userIsAdmin, showBack, backUrl])

  const handleToggleGroup = (item) => {
    const groupKey = getGroupKey(item)

    if (collapsed) {
      setExpandedGroups((currentGroups) => ({
        ...currentGroups,
        [groupKey]: true,
      }))
      onToggleCollapse?.()
      return
    }

    setExpandedGroups((currentGroups) => ({
      ...currentGroups,
      [groupKey]: !(currentGroups[groupKey] ?? false),
    }))
  }

  return (
    <aside id="sidebar" className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Toggle Sidebar"
        onClick={onToggleCollapse}
      >
        <span className="material-icons-round" style={{ fontSize: '18px' }}>
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      <div className="sidebar-logo">
        <div className="profile-content">
          <div className="profile-avatar">
            <span className="profile-avatar__badge">{initials}</span>
            <div className="online-status" />
          </div>
          <div className="profile-info" style={{ overflow: 'hidden' }}>
            <h3 className="profile-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</h3>
            <p className="profile-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userRole}</p>
          </div>
        </div>
      </div>

      <div className="sidebar-profile" />

      <nav className="sidebar-nav" aria-label="Main navigation">
        {primaryItems.map((item) => (
          <SidebarNavItem
            key={getItemKey(item)}
            item={item}
            selectedPath={selectedPath}
            collapsed={collapsed}
            expandedGroups={expandedGroups}
            onToggleGroup={handleToggleGroup}
          />
        ))}
      </nav>

      <div className="sidebar-bottom">
        {secondaryItems.map((item) => (
          <SidebarNavItem
            key={getItemKey(item)}
            item={item}
            selectedPath={selectedPath}
            collapsed={collapsed}
            expandedGroups={expandedGroups}
            onToggleGroup={handleToggleGroup}
          />
        ))}
      </div>
    </aside>
  )
}

// Header

const HEADER_LOGO = '/templateComponents/assets/logo-piagam.png'
const HEADER_ACCENT_LOGO = '/templateComponents/assets/logo-piagam2.png'

function Header({
  title = 'Pilar Group',
  subtitle = 'FRP System',
  breadcrumb,
  showMenuButton = false,
  onMenuToggle,
}) {
  const breadcrumbItems = Array.isArray(breadcrumb) && breadcrumb.length > 0
    ? breadcrumb
    : [
        { label: 'Workspace', href: '#' },
        { label: title, href: '#', active: true },
      ]

  return (
    <header className="header-main">
      <img
        src={HEADER_ACCENT_LOGO}
        alt=""
        aria-hidden="true"
        className="header-accent-logo"
      />

      <div className="header-content">
        <div className="header-left">
          {showMenuButton ? (
            <button
              type="button"
              className="header-menu-button"
              aria-label="Open sidebar"
              onClick={onMenuToggle}
            >
              <span className="material-icons-round" style={{ fontSize: '20px' }}>menu</span>
            </button>
          ) : null}

          <div className="header-brand">
            <img src={HEADER_LOGO} alt="Logo Piagam" className="header-brand-logo" />
          </div>
        </div>

        <div className="header-right">
          <div className="header-title-block">
            <span className="header-brand-title">{title}</span>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
          </div>
        </div>
      </div>

      <div className="header-breadcrumb">
        <div className="header-breadcrumb-content">
          <nav className="breadcrumb-nav" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <div className="breadcrumb-item" key={`${item.label}-${index}`}>
                <a
                  href={item.href ?? '#'}
                  className={`breadcrumb-link${item.active ? ' active' : ''}`}
                  onClick={(event) => {
                    if (!item.href || item.href === '#') {
                      event.preventDefault()
                    }
                  }}
                >
                  {item.label}
                </a>

                {index < breadcrumbItems.length - 1 ? (
                  <span className="breadcrumb-separator">/</span>
                ) : null}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}

window.FRPTemplateComponents = {
  BackgroundMain,
  Sidebar,
  Header,
}

})()
