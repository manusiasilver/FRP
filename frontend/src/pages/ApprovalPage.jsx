import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import DialogFrpDetail from '../components/Dialog/DialogFrpDetail'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

function parseAmount(amount) {
  return parseInt(String(amount || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${value.toLocaleString('id-ID')}`
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

function DateField({ value, onChange, placeholder = 'Pilih Tanggal', style }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!inputRef.current) return
    try {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker()
        return
      }
    } catch (_) {}
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div
      style={{ position: 'relative' }}
      onClick={openPicker}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />
      <div
        style={{
          ...style,
          paddingRight: '48px',
          display: 'flex',
          alignItems: 'center',
          color: value ? '#1e293b' : '#94a3b8',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDate(value) : placeholder}
        </span>
        <button
          type="button"
          onClick={openPicker}
          aria-label="Buka kalender"
          style={{
            position: 'absolute',
            top: '50%',
            right: '8px',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            border: 'none',
            background: '#e2e8f0',
            color: '#475569',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            pointerEvents: 'none',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>calendar_month</span>
        </button>
      </div>
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  style,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const normalizedOptions = options.map(option =>
    typeof option === 'string'
      ? { value: option, label: option, keywords: option }
      : {
          value: option.value,
          label: option.label,
          keywords: option.keywords || option.label || option.value,
        },
  )

  const selectedOption = normalizedOptions.find(option => option.value === value)
  const filteredOptions = normalizedOptions.filter(option =>
    String(option.keywords || '').toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const handleOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1 }}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          minHeight: style?.minHeight || '42px',
          boxShadow: style?.boxShadow || 'inset 0 1px 0 rgba(255,255,255,0.65)',
        }}
      >
        <span
          style={{
            display: 'block',
            flex: 1,
            color: value ? '#1e293b' : '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '12px',
          }}
        >
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1.5px solid #dbe5f0',
            borderRadius: '12px',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Cari..."
              style={{ ...style, fontSize: '0.875rem', padding: '8px 10px', minHeight: 'unset' }}
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid #f8fafc',
                  background: option.value === value ? '#eff6ff' : 'white',
                  color: option.value === value ? '#1f4e8c' : '#1e293b',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: option.value === value ? 700 : 500,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApprovalPage() {
  const { pathname } = useLocation()
  const isApprovedView = pathname === '/approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [copiedFrpId, setCopiedFrpId] = useState(null)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    requester: '',
    status: '',
    division: '',
  })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  const requestSort = (key) => {
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const renderSortIcon = (key) => {
    if (!key) return null
    if (sortConfig.key !== key) {
      return <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', opacity: 0.3 }}>unfold_more</span>
    }
    return sortConfig.direction === 'asc' 
      ? <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}>arrow_upward</span>
      : <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}>arrow_downward</span>
  }

  const loadData = () => {
    fetch(`/api/data/approval?view=${isApprovedView ? 'approved' : 'pending'}`)
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/login'
          throw new Error('Unauthorized')
        }

        return response.json()
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [isApprovedView])

  useEffect(() => {
    const handler = (event) => {
      if (event.data === 'refresh') {
        loadData()
      }
    }

    window.addEventListener('message', handler)

    return () => window.removeEventListener('message', handler)
  }, [isApprovedView])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const calcTotal = (request) => {
    if (!request.items) {
      return 0
    }

    return request.items.reduce((sum, item) => sum + parseAmount(item.amount), 0)
  }

  const divisions = useMemo(
    () => (data?.requests ? [...new Set(data.requests.map((request) => request.divisi))].sort() : []),
    [data],
  )

  const filtered = useMemo(() => {
    if (!data?.requests) {
      return []
    }

    const filteredList = data.requests.filter((request) => {
      const matchSearch =
        !filters.search ||
        (request.frpNo || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (request.vendor || '').toLowerCase().includes(filters.search.toLowerCase())
      const matchDate = !filters.date || request.tanggalFrp === filters.date
      const matchRequester =
        !filters.requester ||
        (request.dimintaOleh || '').toLowerCase().includes(filters.requester.toLowerCase())
      const matchStatus = !filters.status || request.status === filters.status
      const matchDivision = !filters.division || request.divisi === filters.division

      return matchSearch && matchDate && matchRequester && matchStatus && matchDivision
    })

    return filteredList.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'date') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (parseInt(a.id) || 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (parseInt(b.id) || 0);
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      } else if (sortConfig.key === 'requester') {
        valA = (a.dimintaOleh || '').toLowerCase();
        valB = (b.dimintaOleh || '').toLowerCase();
      } else if (sortConfig.key === 'division') {
        valA = (a.divisi || '').toLowerCase();
        valB = (b.divisi || '').toLowerCase();
      } else if (sortConfig.key === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      } else if (sortConfig.key === 'total') {
        valA = calcTotal(a);
        valB = calcTotal(b);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, filters, sortConfig])

  const doAction = async (id, action) => {
    const response = await fetch(`/api/frp/${id}/${action}`, { method: 'POST' })
    const result = await response.json()

    if (result.success) {
      loadData()
    }
  }

  const copyFrpNo = async (requestId, frpNo) => {
    if (!frpNo) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(frpNo)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = frpNo
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'fixed'
        tempInput.style.opacity = '0'
        tempInput.style.pointerEvents = 'none'
        document.body.appendChild(tempInput)
        tempInput.focus()
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopiedFrpId(requestId)
      window.setTimeout(() => {
        setCopiedFrpId(current => (current === requestId ? null : current))
      }, 1400)
    } catch (_) {}
  }

  const user = data?.user || {}
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT
  const statusColors = {
    PENDING: { background: '#fef08a', color: '#854d0e' },
    APPROVED: { background: '#bbf7d0', color: '#166534' },
    REJECTED: { background: '#fecaca', color: '#991b1b' },
  }
  const filterInput = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #dde3ed',
    fontSize: '13px',
    background: 'white',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    minHeight: '42px',
  }
  const detailValueBox = {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid #d7e0ea',
    background: '#f8fafc',
    color: '#334155',
    lineHeight: 1.5,
    minHeight: '42px',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
  }
  const requesters = useMemo(
    () => (data?.requests ? [...new Set(data.requests.map((request) => request.dimintaOleh).filter(Boolean))].sort() : []),
    [data],
  )
  const requesterOptions = useMemo(
    () => requesters.map(requester => ({ value: requester, label: requester })),
    [requesters],
  )
  const divisionOptions = useMemo(
    () => divisions.map(division => ({ value: division, label: division })),
    [divisions],
  )
  const statusOptions = useMemo(
    () => [
      { value: 'APPROVED', label: 'APPROVED' },
      { value: 'REJECTED', label: 'REJECTED' },
    ],
    [],
  )
  const filterGridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : getGridColumns(5, false, isTablet),
      gap: isMobile ? '10px' : '15px',
      alignItems: 'flex-end',
    }),
    [isMobile, isTablet],
  )
  const handleSidebarToggle = () => {
    if (window.innerWidth <= 1024) {
      setMobileMenuOpen((current) => !current)
      return
    }
    setSidebarCollapsed((current) => !current)
  }
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, isApprovedView, rowsPerPage])

  const useCompactDesktopTable = !isMobile
  const desktopHeaders = [
    { label: 'Ringkasan', key: 'date' },
    { label: 'Pemohon & Vendor', key: 'requester' },
    { label: 'Divisi', key: 'division' },
    { label: 'Total', key: 'total' },
    { label: 'Status', key: 'status' },
    { label: 'Attach Link', key: null },
    ...(data?.canApprove ? [{ label: 'Aksi', key: null }] : []),
    { label: 'Detail', key: null },
  ]
  const desktopColumnWidths = [
    '18%',
    '20%',
    '10%',
    '12%',
    '12%',
    '12%',
    ...(data?.canApprove ? ['8%'] : []),
    '8%',
  ]
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, safeCurrentPage])
  const rangeStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filtered.length, safeCurrentPage * rowsPerPage)

  return (
    <>
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          userName={user.fullName || 'User'}
          userRole={user.selectedJobLevel || user.role || 'Staff'}
          userIsAdmin={user.role === 'administrator'}
          allAssignments={user.allAssignments || []}
          onToggleCollapse={handleSidebarToggle}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="dashboard-stage">
          <Header title="Form Request Payment" onMenuClick={() => setMobileMenuOpen(true)} />

          <main
            className="dashboard-main"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
                Memuat data...
              </div>
            )}
            <div
              style={{
                background: '#f1f5f9',
                borderRadius: '16px',
                padding: isMobile ? '12px' : '20px',
                marginBottom: isMobile ? '12px' : '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={filterGridStyle}
              >
                {[
                  {
                    label: 'Search',
                    content: (
                      <input
                        style={filterInput}
                        placeholder="Cari No FRP / Vendor..."
                        value={filters.search}
                        onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                      />
                    ),
                  },
                  {
                    label: 'Tanggal',
                    content: (
                      <DateField
                        value={filters.date}
                        onChange={(e) => setFilters((c) => ({ ...c, date: e.target.value }))}
                        style={filterInput}
                      />
                    ),
                  },
                  {
                    label: 'Pemohon',
                    content: (
                      <SearchableSelect
                        value={filters.requester}
                        onChange={(v) => setFilters((c) => ({ ...c, requester: v }))}
                        options={requesterOptions}
                        placeholder="Semua Pemohon"
                        style={filterInput}
                      />
                    ),
                  },
                  {
                    label: isApprovedView ? 'Status' : null,
                    content: isApprovedView ? (
                      <SearchableSelect
                        value={filters.status}
                        onChange={(v) => setFilters((c) => ({ ...c, status: v }))}
                        options={statusOptions}
                        placeholder="Semua Status"
                        style={filterInput}
                      />
                    ) : null,
                  },
                  {
                    label: 'Divisi',
                    content: (
                      <SearchableSelect
                        value={filters.division}
                        onChange={(v) => setFilters((c) => ({ ...c, division: v }))}
                        options={divisionOptions}
                        placeholder="Semua Divisi"
                        style={filterInput}
                      />
                    ),
                  },
                ].map(({ label, content }, i) =>
                  label || content ? (
                    <div key={i} style={{ gridColumn: isMobile && i === 0 ? '1 / -1' : undefined }}>
                      {label && (
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>
                          {label}
                        </label>
                      )}
                      {content}
                    </div>
                  ) : null,
                )}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
                  <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>task</span>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
                </div>
              ) : isMobile ? (
                <>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {paginated.map((request) => {
                    const total = calcTotal(request)
                    const statusStyle = statusColors[request.status] || {}
                    return (
                      <div
                        key={request.id}
                        style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <button
                            type="button"
                            onClick={() => copyFrpNo(request.id, request.frpNo)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{request.frpNo}</span>
                            <span className="material-icons-round" style={{ fontSize: '15px', color: copiedFrpId === request.id ? '#15803d' : '#94a3b8' }}>
                              {copiedFrpId === request.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, ...statusStyle }}>{request.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '12px' }}>
                          {[
                            { label: 'Tanggal', value: formatDate(request.tanggalFrp) },
                            { label: 'Pemohon', value: request.dimintaOleh || '-' },
                            { label: 'Vendor', value: request.vendor || '-' },
                            { label: 'Divisi', value: request.divisi || '-' },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                            </div>
                          ))}
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Total</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>{formatCurrency(total)}</div>
                          </div>
                          {isApprovedView && request.approvedBy && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Approved By</div>
                              <div style={{ fontSize: '13px', color: '#1e293b' }}>{request.approvedBy}</div>
                            </div>
                          )}
                          {request.attachLink && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Attach Link</div>
                              <div style={{ fontSize: '13px' }}><a href={request.attachLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Buka Link</a></div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {data?.canApprove && !isApprovedView && (
                            <>
                              <button type="button" onClick={() => doAction(request.id, 'approve')} style={{ flex: 1, background: '#dcfce7', color: '#15803d', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>Approve</button>
                              <button type="button" onClick={() => doAction(request.id, 'reject')} style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>Reject</button>
                            </>
                          )}
                          {data?.canApprove && isApprovedView && user.role === 'administrator' && (
                            <button type="button" onClick={() => doAction(request.id, 'revert')} style={{ flex: 1, background: '#fef9c3', color: '#92400e', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>Revert</button>
                          )}
                          <button type="button" onClick={() => window.location.href = `/?revisi=${request.id}&duplicate=1`} style={{ flex: 1, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}>Duplicate</button>
                          <button type="button" onClick={() => setSelectedRequest(request)} style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}>Detail</button>
                        </div>
                      </div>
                    )
                  })}
                  </div>
                  <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}-{rangeEnd} dari {filtered.length}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Rows</span>
                      <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                        {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                      <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
                      <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      {desktopColumnWidths.map((width, index) => <col key={`desktop-head-col-${index}`} style={{ width }} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        {desktopHeaders.map((header) => (
                          <th
                            key={header.label}
                            onClick={() => requestSort(header.key)}
                            style={{
                              padding: '10px 14px',
                              textAlign: 'left',
                              color: '#64748b',
                              fontWeight: 700,
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              whiteSpace: 'nowrap',
                              background: '#f8fafc',
                              borderBottom: '2px solid #e2e8f0',
                              boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)',
                              cursor: header.key ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              {header.label}
                              {renderSortIcon(header.key)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                  </table>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                    <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                      <colgroup>
                        {desktopColumnWidths.map((width, index) => <col key={`desktop-body-col-${index}`} style={{ width }} />)}
                      </colgroup>
                      <tbody>
                        {paginated.map((request, idx) => {
                          const total = calcTotal(request)
                          const statusStyle = statusColors[request.status] || {}
                          const absoluteIndex = (safeCurrentPage - 1) * rowsPerPage + idx
                          const rowBg = absoluteIndex % 2 === 0 ? 'white' : '#fafbfc'
                          const td = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
                          const isExpanded = expandedRowId === request.id
                          return (
                            <>
                              <tr
                                key={request.id}
                                style={{ background: rowBg }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = rowBg }}
                              >
                                <td style={td}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedRowId(current => (current === request.id ? null : request.id))}
                                      style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        border: '1px solid #cbd5e1',
                                        background: isExpanded ? '#dbeafe' : '#f8fafc',
                                        color: isExpanded ? '#1d4ed8' : '#64748b',
                                        display: 'grid',
                                        placeItems: 'center',
                                        cursor: 'pointer',
                                        padding: 0,
                                        flexShrink: 0,
                                      }}
                                      aria-label={isExpanded ? 'Sembunyikan info tambahan' : 'Lihat info tambahan'}
                                    >
                                      <span className="material-icons-round" style={{ fontSize: '18px' }}>
                                        {isExpanded ? 'expand_less' : 'expand_more'}
                                      </span>
                                    </button>
                                    <div style={{ minWidth: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => copyFrpNo(request.id, request.frpNo)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                                      >
                                        <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.82rem', marginBottom: '4px', wordBreak: 'break-word' }}>{request.frpNo}</span>
                                        <span className="material-icons-round" style={{ fontSize: '15px', color: copiedFrpId === request.id ? '#15803d' : '#94a3b8' }}>
                                          {copiedFrpId === request.id ? 'check' : 'content_copy'}
                                        </span>
                                      </button>
                                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>{formatDate(request.tanggalFrp)}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.45 }}>
                                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{request.dimintaOleh || '-'}</div>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>{request.vendor || '-'}</div>
                                </td>
                                <td style={{ ...td, whiteSpace: 'normal' }}><span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600, display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }}>{request.divisi}</span></td>
                                <td style={{ ...td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, whiteSpace: 'normal', color: '#0f172a', wordBreak: 'break-word' }}>{formatCurrency(total)}</td>
                                <td style={td}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', ...statusStyle }}>{request.status}</span>
                                    {isApprovedView && request.approvedBy ? (
                                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                        <span style={{ fontWeight: 700, color: '#475569' }}>By:</span> {request.approvedBy}
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                                <td style={{ ...td, fontSize: '12px', color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {request.attachLink ? <a href={request.attachLink} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', color:'#2563eb', fontWeight:600}}>Link</a> : '-'}
                                </td>
                                {data?.canApprove ? (
                                  <td style={{ ...td, whiteSpace: 'normal' }}>
                                    {!isApprovedView ? (
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <button type="button" onClick={() => doAction(request.id, 'approve')} style={{ background: '#dcfce7', color: '#15803d', border: 'none', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}>Approve</button>
                                        <button type="button" onClick={() => doAction(request.id, 'reject')} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}>Reject</button>
                                      </div>
                                    ) : user.role === 'administrator' ? (
                                      <button type="button" onClick={() => doAction(request.id, 'revert')} style={{ width: '100%', background: '#fef9c3', color: '#92400e', border: 'none', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}>Revert</button>
                                    ) : '-'}
                                  </td>
                                ) : null}
                                <td style={{ ...td, whiteSpace: 'normal' }}>
                                  <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                                    <button type="button" onClick={() => window.location.href = `/?revisi=${request.id}&duplicate=1`} style={{ width: '100%', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit' }}>Duplicate</button>
                                    <button type="button" onClick={() => setSelectedRequest(request)} style={{ width: '100%', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit' }}>Detail</button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded ? (
                                <tr key={`${request.id}-expanded`} style={{ background: absoluteIndex % 2 === 0 ? '#f8fbff' : '#f3f7fb' }}>
                                  <td colSpan={desktopHeaders.length} style={{ padding: '0 14px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ border: '1px solid #dbe5f0', borderRadius: '12px', background: 'white', padding: '14px 16px', marginTop: '-2px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: '14px 18px' }}>
                                        <div>
                                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>Memo</div>
                                          <div style={detailValueBox}>{request.items?.[0]?.memo || '-'}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>Keterangan</div>
                                          <div style={detailValueBox}>{request.keteranganFrp || '-'}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>Vendor</div>
                                          <div style={detailValueBox}>{request.vendor || '-'}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>Pemohon</div>
                                          <div style={detailValueBox}>{request.dimintaOleh || '-'}</div>
                                        </div>
                                        {isApprovedView ? (
                                          <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>Approved By</div>
                                            <div style={detailValueBox}>{request.approvedBy || '-'}</div>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexWrap: 'nowrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{rangeStart}-{rangeEnd} dari {filtered.length} data</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page</span>
                      <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px', background: 'white' }}>
                        {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Page {safeCurrentPage} / {totalPages}</div>
                    <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Prev</button>
                    <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Next</button>
                  </div>
                </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <DialogFrpDetail
        isOpen={Boolean(selectedRequest)}
        request={selectedRequest}
        title={selectedRequest?.frpNo || 'Detail FRP'}
        eyebrow={isApprovedView ? 'Approved Request' : 'Pending Request'}
        onClose={() => setSelectedRequest(null)}
      />
    </>
  )
}
