import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import logoPiagam from '../assets/logo-piagam.png'
import logoPiagamTransparent from '../assets/logo-piagam2.png'

const ROUTE_TITLES = {
  '/': 'New Request',
  '/approval': 'Approval',
  '/approved': 'Approved',
  '/dashboard': 'Dashboard',
  '/laporan': 'Laporan',
  '/history': 'History',
  '/select-company': 'Pilih Perusahaan',
  '/select-division': 'Pilih Divisi',
}

function getTitleFromPath(pathname) {
  if (pathname.startsWith('/admin')) return 'Master Data'
  if (pathname.startsWith('/frp/')) return 'Detail FRP'
  return ROUTE_TITLES[pathname] ?? 'Form Request Payment'
}

export default function Header({ title, onMenuClick }) {
  const { pathname } = useLocation()
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const displayTitle = isMobile ? 'FRP' : (title ?? getTitleFromPath(pathname))

  return (
    <header className="header-main">
      <img src={logoPiagamTransparent} alt="" aria-hidden="true" className="header-accent-logo" />
      <div className="header-content">
        <div className="header-left">
          <button type="button" className="header-menu-button" aria-label="Open menu" onClick={onMenuClick}>
            <span className="material-icons-round" style={{ fontSize: '22px' }}>menu</span>
          </button>
          <div className="header-brand">
            <img src={logoPiagam} alt="Logo Piagam" className="header-brand-logo" />
          </div>
        </div>
        <div className="header-right">
          <span className="header-brand-title">{displayTitle}</span>
        </div>
      </div>
    </header>
  )
}
