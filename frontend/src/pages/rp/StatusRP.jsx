import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import { useUser } from '../../contexts/UserContext'
import DialogDetailRP from '../../components/Dialog/DialogDetailRP'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import DialogFailAction from '../../components/Dialog/DialogFailAction'
import ButtonRevert from '../../components/button/ButtonRevert'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`
}

const STATUS_CONFIG = {
  waiting_manager: { label: 'waiting_manager', bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: 'schedule' },
  division_review: { label: 'division_review', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: 'autorenew' },
  final_review:    { label: 'final_review',    bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: 'gavel' },
  approved:        { label: 'approved',        bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: 'check_circle' },
  REJECTED:        { label: 'REJECTED',        bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: 'cancel' },
  CREATED_FRP:     { label: 'CREATED_FRP',     bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', icon: 'receipt_long' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: 'help' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4.5px 12px', borderRadius: '24px', fontSize: '11.5px',
      fontWeight: 600, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      whiteSpace: 'nowrap', letterSpacing: '0.01em',
    }}>
      <span className="material-icons-round" style={{ fontSize: '14px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function FilterField({ label, icon, children }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <span style={{
          position: 'absolute', top: '-8px', left: '12px',
          background: 'white', padding: '0 6px', fontSize: '11px',
          fontWeight: '700', color: '#64748b', zIndex: 3, pointerEvents: 'none', letterSpacing: '0.02em',
        }}>
          {label}
        </span>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span className="material-icons-round" style={{
            position: 'absolute', left: '12px', color: '#64748b',
            fontSize: '18px', pointerEvents: 'none', zIndex: 3,
          }}>
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

function SearchableSelect({ value, onChange, options, placeholder = 'Select...', style }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )
  const selectedOption   = normalizedOptions.find(o => o.value === value)
  const filteredOptions  = normalizedOptions.filter(o =>
    String(o.label || o.value || '').toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => { if (!open) setSearch('') }, [open])
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1, width: '100%' }}>
      <button
        type="button"
        className="select-dropdown-btn"
        onClick={() => setOpen(c => !c)}
        style={{
          ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          textAlign: 'left', minHeight: style?.minHeight || '42px', boxShadow: 'none',
        }}
      >
        <span style={{ display: 'block', flex: 1, color: value ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'white', border: '1.5px solid #dbe5f0', borderRadius: '12px',
          boxShadow: '0 14px 30px rgba(15,23,42,0.14)', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari..."
              style={{ ...style, paddingLeft: '10px', fontSize: '0.875rem', padding: '8px 10px', minHeight: 'unset' }}
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              style={{ width: '100%', border: 'none', background: 'white', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', color: '#94a3b8', cursor: 'pointer' }}>
              {placeholder}
            </button>
            {filteredOptions.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  width: '100%', border: 'none', borderTop: '1px solid #f8fafc',
                  background: opt.value === value ? '#eff6ff' : 'white',
                  color: opt.value === value ? '#1f4e8c' : '#1e293b',
                  textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit',
                  fontSize: '0.875rem', cursor: 'pointer',
                  fontWeight: opt.value === value ? 700 : 500,
                }}>
                {opt.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>Tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StatusRP() {
  const navigate = useNavigate()
  const { user, setUser } = useUser()

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters]     = useState({ search: '', status: '', division: '' })
  const [sortConfig, setSortConfig]   = useState({ key: 'date', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [expandedId, setExpandedId]   = useState(null)
  const [copiedId, setCopiedId]       = useState(null)
  const [detailRequest, setDetailRequest] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window === 'undefined' ? 1280 : window.innerWidth)
  )
  const [actionLoading, setActionLoading]     = useState(false)
  const [confirmRevert, setConfirmRevert]     = useState(null)
  const [actionResultDialog, setActionResultDialog] = useState(null)

  usePageLoadingDialog(loading && !data, {
    title: 'Memuat Status RP',
    message: 'Sistem sedang menyiapkan daftar status Request Purchase.',
  })

  // debounce search → filters.search
  useEffect(() => {
    const t = setTimeout(() => setFilters(c => ({ ...c, search: searchInput })), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [filters.search, filters.status, filters.division, rowsPerPage])

  // fetch with server-side params
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({
      view: 'all',
      page: currentPage,
      limit: rowsPerPage,
      sortBy: sortConfig.key,
      sortDir: sortConfig.direction,
    })
    if (filters.search)   params.set('search',   filters.search)
    if (filters.status)   params.set('status',   filters.status)
    if (filters.division) params.set('division', filters.division)

    fetch(`/api/data/rp-approval?${params}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) { window.location.href = '/'; throw new Error('Unauthorized') }
        return res.json()
      })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message || 'Gagal memuat data') })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [currentPage, rowsPerPage, sortConfig.key, sortConfig.direction,
      filters.search, filters.status, filters.division, refreshKey])

  // pagination from API
  const total           = data?.pagination?.total      ?? 0
  const totalPages      = data?.pagination?.totalPages ?? 1
  const safeCurrentPage = data?.pagination?.page       ?? 1

  // filter options from API (full dataset scope)
  const divisionOptions = (data?.filterOptions?.divisions || []).map(d => ({ value: d, label: d }))
  const statusOptions   = (data?.filterOptions?.statuses  || []).map(s => ({ value: s, label: s }))

  const rangeStart = total === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd   = Math.min(total, safeCurrentPage * rowsPerPage)

  const processRevert = async () => {
    if (!confirmRevert) return
    setActionLoading(true)
    const cur = confirmRevert
    let url = cur.status === 'division_review'
      ? `/api/rp/${cur.id}/process-revert`
      : cur.status === 'final_review'
      ? `/api/rp/${cur.id}/process-manager-revert`
      : `/api/rp/${cur.id}/revert`

    try {
      const res    = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const result = await res.json()
      if (result.success) {
        setConfirmRevert(null)
        setDetailRequest(null)
        setActionResultDialog({
          kind: 'success', action: 'revert', icon: 'restart_alt',
          title: 'Revert berhasil', message: 'Status RP berhasil dikembalikan.',
          subMessage: `Nomor RP: ${cur?.rpNo || cur?.id || '-'}`, rpNo: cur?.rpNo,
        })
      } else {
        setConfirmRevert(null)
        setActionResultDialog({
          kind: 'fail', action: 'revert', icon: 'restart_alt',
          title: 'Gagal memproses data', message: result.error || 'Perubahan data tidak dapat disimpan.',
          subMessage: `Nomor RP: ${cur?.rpNo || cur?.id || '-'}`, rpNo: cur?.rpNo,
        })
      }
    } catch (err) {
      setConfirmRevert(null)
      setActionResultDialog({
        kind: 'fail', action: 'revert', icon: 'restart_alt',
        title: 'Gagal memproses data', message: err.message || 'Terjadi kesalahan.',
        subMessage: `Nomor RP: ${cur?.rpNo || cur?.id || '-'}`, rpNo: cur?.rpNo,
      })
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT

  const toggleSort = key => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    )
    setCurrentPage(1)
  }

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey)
      return <span className="material-icons-round" style={{ fontSize: '13px', opacity: 0.3, marginLeft: '3px', verticalAlign: 'middle' }}>unfold_more</span>
    return <span className="material-icons-round" style={{ fontSize: '13px', color: '#2563eb', marginLeft: '3px', verticalAlign: 'middle' }}>
      {sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  }

  const copyRpNo = async (id, rpNo) => {
    if (!rpNo) return
    try {
      await navigator.clipboard.writeText(rpNo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1400)
    } catch (_) {}
  }

  const hasFilter = searchInput || filters.status || filters.division
  const resetFilters = () => {
    setSearchInput('')
    setFilters({ search: '', status: '', division: '' })
  }

  const filterInput = {
    width: '100%', padding: '9px 12px 9px 36px', borderRadius: '12px',
    border: '1.5px solid #dbe5f0', fontSize: '13px', background: 'white',
    boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
    color: '#1e293b', minHeight: '42px',
  }

  const requests = data?.requests || []

  return (
    <>
      <style>{`
        .filter-input-element { transition: all 0.2s ease-in-out; }
        .filter-input-element:focus, .filter-input-element:hover {
          border-color: #1e4e8c !important;
          box-shadow: 0 0 0 3px rgba(30,78,140,0.15) !important;
        }
        .select-dropdown-btn { transition: all 0.2s ease-in-out; }
        .select-dropdown-btn:focus, .select-dropdown-btn:hover {
          border-color: #1e4e8c !important;
          box-shadow: 0 0 0 3px rgba(30,78,140,0.15) !important;
        }
        .rp-status-row { transition: background 0.12s; }
        .rp-status-row:hover { background: #f0f7ff !important; }
        .rp-status-row:nth-child(even) { background: #f8fafc; }
        .rp-status-row:nth-child(even):hover { background: #e8f0fd !important; }
      `}</style>
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ef4444', gap: '10px', padding: '4rem' }}>
            <span className="material-icons-round">error</span> {error}
          </div>
        )}

        {!error && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: 'white', borderRadius: '16px',
            border: '1.5px solid #e8edf4',
            boxShadow: '0 4px 20px -2px rgba(148,163,184,0.08)',
            overflow: 'hidden',
          }}>
            {/* Header & Filters */}
            <div style={{
              background: 'white', padding: isMobile ? '16px 12px' : '20px 24px',
              borderBottom: '1.5px solid #e8edf4', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'grid', placeItems: 'center', color: '#1e40af' }}>
                    <span className="material-icons-round" style={{ fontSize: '20px' }}>receipt_long</span>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Status RP</h2>
                    <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                      {loading ? 'Memuat...' : `${total} data sesuai filter aktif`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {loading && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-icons-round" style={{ fontSize: '14px' }}>hourglass_empty</span>
                      Memuat...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setRefreshKey(k => k + 1)}
                    title="Segarkan data"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #dbe5f0', background: 'white', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dbe5f0' }}
                  >
                    <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 1fr))',
                  gap: '12px', flex: 1,
                  minWidth: isMobile ? '100%' : '420px',
                }}>
                  <FilterField label="Cari" icon="search">
                    <input
                      className="filter-input-element"
                      style={filterInput}
                      placeholder="No RP / Vendor / Memo..."
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                    />
                  </FilterField>

                  <FilterField label="Status" icon="rule">
                    <SearchableSelect
                      value={filters.status}
                      onChange={v => setFilters(c => ({ ...c, status: v }))}
                      options={statusOptions}
                      placeholder="Semua Status"
                      style={filterInput}
                    />
                  </FilterField>

                  <FilterField label="Divisi" icon="business">
                    <SearchableSelect
                      value={filters.division}
                      onChange={v => setFilters(c => ({ ...c, division: v }))}
                      options={divisionOptions}
                      placeholder="Semua Divisi"
                      style={filterInput}
                    />
                  </FilterField>
                </div>

                {hasFilter && (
                  <button
                    onClick={resetFilters}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                      background: 'white', color: '#64748b', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', minHeight: '42px',
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
              {!loading && requests.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
                  <span className="material-icons-round" style={{ fontSize: '52px', marginBottom: '1rem', opacity: 0.4 }}>receipt_long</span>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
                  <p style={{ margin: 0, fontSize: '13px' }}>Tidak ada RP yang cocok dengan filter saat ini</p>
                </div>
              ) : isMobile ? (
                /* Mobile Card View */
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {requests.map(req => (
                      <div key={req.id} onClick={() => setDetailRequest(req)}
                        style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <button type="button" onClick={e => { e.stopPropagation(); copyRpNo(req.id, req.rpNo) }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.rpNo || `#${req.id}`}</span>
                            <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                              {copiedId === req.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          <StatusBadge status={req.status} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                          {[
                            { label: 'Tanggal', value: formatDate(req.createdAt) },
                            { label: 'Vendor',  value: req.vendorSuggestion || '-' },
                            { label: 'Divisi',  value: req.departmentName || req.departmentClass || '-' },
                            { label: 'Total',   value: formatCurrency(req.total ?? 0) },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={() => setDetailRequest(req)}
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}>
                            <span className="material-icons-round" style={{ fontSize: '15px' }}>open_in_new</span>
                            Detail
                          </button>
                          {req.canRevert && user?.role === 'administrator' && (
                            <button type="button" disabled={actionLoading} onClick={() => setConfirmRevert(req)}
                              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', padding: '8px', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit', opacity: actionLoading ? 0.7 : 1 }}>
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>restart_alt</span>
                              Revert
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pagination mobile */}
                  <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}–{rangeEnd} dari {total}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 8px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>«</button>
                      <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, padding: '0 4px' }}>{safeCurrentPage}/{totalPages}</span>
                      <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
                      <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 8px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>»</button>
                    </div>
                  </div>
                </>
              ) : (
                /* Desktop Table View */
                <>
                  <div className="frp-items-scrollable" style={{ flex: 1, minHeight: 0, overflowX: 'hidden' }}>
                    <table className="frp-table">
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '15%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {[
                            { label: 'No RP',    key: 'rpNo' },
                            { label: 'Tanggal',  key: 'date' },
                            { label: 'Vendor',   key: 'vendor' },
                            { label: 'Divisi',   key: 'division' },
                            { label: 'Total',    key: 'total' },
                            { label: 'Status',   key: 'status' },
                            { label: 'Aksi',     key: null },
                          ].map(({ label, key }) => (
                            <th key={label} className="frp-th"
                              style={{ cursor: key ? 'pointer' : 'default', textAlign: label === 'Aksi' ? 'right' : 'left' }}
                              onClick={() => key && toggleSort(key)}>
                              {label}
                              {key && <SortIcon colKey={key} />}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map(req => (
                          <tr key={req.id} className="rp-status-row" style={{ cursor: 'pointer' }} onClick={() => setDetailRequest(req)}>
                            <td className="frp-td">
                              <button type="button" onClick={e => { e.stopPropagation(); copyRpNo(req.id, req.rpNo) }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                                <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.rpNo || `#${req.id}`}</span>
                                <span className="material-icons-round" style={{ fontSize: '13px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                                  {copiedId === req.id ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </td>
                            <td className="frp-td" style={{ color: '#475569', fontSize: '0.82rem' }}>{formatDate(req.createdAt)}</td>
                            <td className="frp-td" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.vendorSuggestion}>{req.vendorSuggestion || '-'}</td>
                            <td className="frp-td" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={req.departmentName || req.departmentClass}>{req.departmentName || req.departmentClass || '-'}</td>
                            <td className="frp-td" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: '0.82rem' }}>{formatCurrency(req.total ?? 0)}</td>
                            <td className="frp-td"><StatusBadge status={req.status} /></td>
                            <td className="frp-td" onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '30px', padding: '3px', gap: '3px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                <button type="button" onClick={() => setDetailRequest(req)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '24px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff' }}>
                                  <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
                                  Detail
                                </button>
                                {req.canRevert && user?.role === 'administrator' && (
                                  <button type="button" disabled={actionLoading} onClick={() => setConfirmRevert(req)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', padding: '5px 10px', borderRadius: '24px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit', transition: 'all 0.2s', opacity: actionLoading ? 0.7 : 1 }}
                                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = '#fef08a' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fef9c3' }}>
                                    <span className="material-icons-round" style={{ fontSize: '14px' }}>restart_alt</span>
                                    Revert
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination desktop */}
                  <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Menampilkan <strong>{rangeStart}–{rangeEnd}</strong> dari <strong>{total}</strong> RP
                      {loading && <span style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '11px' }}>● memuat...</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Baris/halaman</span>
                      <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <button type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>«</button>
                      <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>← Prev</button>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{safeCurrentPage} / {totalPages}</span>
                      <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Next →</button>
                      <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}
                        style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>»</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <DialogDetailRP
          isOpen={!!detailRequest}
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
          extraFooter={
            user?.role === 'administrator' && ['division_review', 'final_review'].includes(detailRequest?.status) ? (
              <ButtonRevert onClick={() => setConfirmRevert(detailRequest)}>Revert</ButtonRevert>
            ) : null
          }
        />

        <DialogConfirm
          isOpen={!!confirmRevert}
          title="Revert Request Purchase?"
          message={`Status RP akan dikembalikan ke ${confirmRevert?.status === 'division_review' ? 'Manager Approval' : 'Proses Divisi'}.`}
          confirmLabel="Ya, Revert"
          tone="warning"
          icon="restart_alt"
          onClose={() => setConfirmRevert(null)}
          onConfirm={processRevert}
          loading={actionLoading}
        />

        <DialogSuccesAction
          isOpen={actionResultDialog?.kind === 'success'}
          title={actionResultDialog?.title}
          message={actionResultDialog?.message}
          subMessage={actionResultDialog?.subMessage}
          rpNo={actionResultDialog?.rpNo}
          referenceLabel="Nomor RP"
          icon={actionResultDialog?.icon || 'restart_alt'}
          onConfirm={() => { setActionResultDialog(null); setRefreshKey(k => k + 1) }}
          buttonText="Tutup"
        />

        <DialogFailAction
          isOpen={actionResultDialog?.kind === 'fail'}
          title={actionResultDialog?.title}
          message={actionResultDialog?.message}
          subMessage={actionResultDialog?.subMessage}
          rpNo={actionResultDialog?.rpNo}
          referenceLabel="Nomor RP"
          icon={actionResultDialog?.icon || 'restart_alt'}
          onConfirm={() => setActionResultDialog(null)}
          buttonText="Tutup"
        />
      </main>
    </>
  )
}
