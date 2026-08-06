import { useEffect, useRef, useState } from 'react'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import { useUser } from '../../contexts/UserContext'
import DialogStatusFrp from '../../components/Dialog/DialogStatusFrp'

const MOBILE_BREAKPOINT = 768

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  bg: '#fef9c3', color: '#854d0e', icon: 'schedule' },
  APPROVED: { label: 'Approved', bg: '#bbf7d0', color: '#166534', icon: 'check_circle' },
  REJECTED: { label: 'Rejected', bg: '#fecaca', color: '#991b1b', icon: 'cancel' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#e2e8f0', color: '#475569', icon: 'help' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      <span className="material-icons-round" style={{ fontSize: '13px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function SortIcon({ active, direction }) {
  if (!active) return (
    <span className="material-icons-round" style={{ fontSize: '13px', opacity: 0.3, marginLeft: '3px', verticalAlign: 'middle' }}>unfold_more</span>
  )
  return (
    <span className="material-icons-round" style={{ fontSize: '13px', color: '#2563eb', marginLeft: '3px', verticalAlign: 'middle' }}>
      {direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  )
}

export default function StatusFRP() {
  const { setUser } = useUser()

  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortConfig, setSortConfig]     = useState({ key: 'date', direction: 'desc' })
  const [currentPage, setCurrentPage]   = useState(1)
  const [rowsPerPage, setRowsPerPage]   = useState(10)
  const [refreshKey, setRefreshKey]     = useState(0)
  const [selectedFrpId, setSelectedFrpId] = useState(null)
  const [copiedId, setCopiedId]           = useState(null)
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window === 'undefined' ? 1280 : window.innerWidth)
  )

  usePageLoadingDialog(loading && !data, {
    title: 'Memuat Status FRP',
    message: 'Sistem sedang menyiapkan daftar status FRP.',
  })

  // debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchInput); setCurrentPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { setCurrentPage(1) }, [filterStatus, rowsPerPage])

  // fetch dari backend — semua filter/sort/paginate di server
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('view', 'all')
    params.set('page', currentPage)
    params.set('limit', rowsPerPage)
    params.set('sortBy', sortConfig.key)
    params.set('sortDir', sortConfig.direction)
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (filterStatus)    params.set('status', filterStatus)
    fetch(`/api/data/frp-approval?${params}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) { window.location.href = '/'; throw new Error('Unauthorized') }
        return res.json()
      })
      .then(nextData => {
        setData(nextData)
        setUser(nextData?.meta?.user)
      })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message || 'Gagal memuat data') })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [currentPage, rowsPerPage, sortConfig.key, sortConfig.direction, debouncedSearch, filterStatus, refreshKey])

  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT

  const total         = data?.pagination?.total      ?? 0
  const totalPages    = data?.pagination?.totalPages ?? 1
  const safePage      = data?.pagination?.page       ?? 1
  const rangeStart    = total === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const rangeEnd      = Math.min(total, safePage * rowsPerPage)
  const counts        = data?.summary || { pending: 0, approved: 0 }

  const toggleSort = key => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }))
    setCurrentPage(1)
  }

  const handleRowsPerPage = val => { setRowsPerPage(val); setCurrentPage(1) }

  const copyFrpNo = async (id, frpNo) => {
    if (!frpNo) return
    try {
      await navigator.clipboard.writeText(frpNo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1400)
    } catch (_) {}
  }

  const th = {
    padding: '11px 14px', textAlign: 'left',
    background: 'rgba(24,43,88,0.04)',
    fontWeight: 600, color: '#7f7f7f', fontSize: '0.76rem',
    fontFamily: '"IBM Plex Mono", monospace',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    whiteSpace: 'nowrap', userSelect: 'none',
    borderBottom: '1px solid rgba(26,42,87,0.08)',
    position: 'sticky', top: 0, zIndex: 1,
  }
  const td = {
    padding: '12px 14px', borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle', fontSize: '0.875rem', color: '#1e293b',
  }

  const COLS = [
    { label: 'No FRP',   key: 'frpNo',  w: '14%' },
    { label: 'Tanggal',  key: 'date',   w: '11%' },
    { label: 'Vendor',   key: 'vendor', w: '18%' },
    { label: 'Divisi',   key: 'division', w: '12%' },
    { label: 'Total',    key: 'amount',   w: '13%' },
    { label: 'Status',   key: 'status', w: '11%' },
    { label: 'Attach',   key: null,     w: '9%'  },
    { label: 'Detail',   key: null,     w: '9%'  },
  ]

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Summary Counts ── */}
      {data && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total FRP', value: counts.pending + counts.approved, icon: 'receipt_long', bg: '#f1f5f9', color: '#475569' },
            { label: 'Pending',   value: counts.pending,  icon: 'schedule',     bg: '#fef9c3', color: '#854d0e' },
            { label: 'Approved',  value: counts.approved, icon: 'check_circle', bg: '#bbf7d0', color: '#166534' },
          ].map(c => (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: c.bg, borderRadius: '12px', padding: '10px 16px',
              border: `1px solid ${c.color}22`, flex: '1 1 120px',
            }}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: c.color }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: c.color, opacity: 0.7, marginTop: '2px' }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div style={{
        background: 'white', borderRadius: '14px',
        padding: isMobile ? '12px' : '16px 20px',
        border: '1.5px solid #e8edf4',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '3 1 220px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Search</label>
          <div style={{ position: 'relative' }}>
            <span className="material-icons-round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94a3b8', pointerEvents: 'none' }}>search</span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="No FRP / Vendor / Keterangan..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 36px', borderRadius: '10px', border: '1.5px solid #dde3ed', fontSize: '13px', background: 'white', fontFamily: 'inherit', outline: 'none', color: '#1e293b', minHeight: '42px' }}
            />
          </div>
        </div>

        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #dde3ed', fontSize: '13px', background: 'white', fontFamily: 'inherit', outline: 'none', color: filterStatus ? '#1e293b' : '#94a3b8', minHeight: '42px', cursor: 'pointer' }}
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {(searchInput || filterStatus) && (
          <button
            onClick={() => { setSearchInput(''); setFilterStatus('') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: '42px', alignSelf: 'flex-end' }}
          >
            <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
            Reset
          </button>
        )}

        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          title="Segarkan data"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: '42px', alignSelf: 'flex-end', opacity: loading ? 0.5 : 1 }}
        >
          <span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>
        </button>
      </div>

      {/* ── Content ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ef4444', gap: '10px', padding: '4rem' }}>
          <span className="material-icons-round">error</span> {error}
        </div>
      )}

      {!error && (data || !loading) && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1.5px solid #e8edf4', overflow: 'hidden' }}>
          {total === 0 && !loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
              <span className="material-icons-round" style={{ fontSize: '52px', marginBottom: '1rem', opacity: 0.4 }}>receipt_long</span>
              <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Tidak ada FRP yang cocok dengan filter saat ini</p>
            </div>
          ) : isMobile ? (
            /* ── Mobile Card View ── */
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(data?.data || []).map(req => (
                  <div key={req.id} style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <button type="button" onClick={() => copyFrpNo(req.id, req.frpNo)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.frpNo || `#${req.id}`}</span>
                        <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                          {copiedId === req.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      <StatusBadge status={req.status} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                      {[
                        { label: 'Tanggal', value: formatDate(req.date) },
                        { label: 'Vendor',  value: req.vendor || '-' },
                        { label: 'Divisi',  value: req.division || '-' },
                        { label: 'Total',   value: formatCurrency(req.amount || 0) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {req.attachLink && (
                        <a href={`/api/frp/${req.id}/attachment`} target="_blank" rel="noreferrer"
                          style={{ flex: 1, textAlign: 'center', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}>
                          <span className="material-icons-round" style={{ fontSize: '16px' }}>attach_file</span>
                          File
                        </a>
                      )}
                      <button type="button" onClick={() => setSelectedFrpId(req.id)}
                        style={{ flex: 2, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}>
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}–{rangeEnd} dari {total}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
                </div>
              </div>
            </>
          ) : (
            /* ── Desktop Table View ── */
            <>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                  <colgroup>
                    {COLS.map((c, i) => <col key={i} style={{ width: c.w }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      {COLS.map(({ label, key }) => (
                        <th key={label} style={{ ...th, cursor: key ? 'pointer' : 'default' }} onClick={() => key && toggleSort(key)}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {label}
                            {key && <SortIcon active={sortConfig.key === key} direction={sortConfig.direction} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.data || []).map((req, idx) => {
                      const rowBg = idx % 2 === 0 ? 'white' : '#fafbfc'
                      return (
                        <tr key={req.id} style={{ background: rowBg, transition: 'background 0.12s' }}
                          onMouseEnter={e => { Array.from(e.currentTarget.children).forEach(c => c.style.background = '#eff6ff') }}
                          onMouseLeave={e => { Array.from(e.currentTarget.children).forEach(c => c.style.background = rowBg) }}
                        >
                          <td style={td}>
                            <button type="button" onClick={() => copyFrpNo(req.id, req.frpNo)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.frpNo || `#${req.id}`}</span>
                              <span className="material-icons-round" style={{ fontSize: '13px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                                {copiedId === req.id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </td>
                          <td style={{ ...td, color: '#475569', fontSize: '0.82rem' }}>{formatDate(req.date)}</td>
                          <td style={{ ...td, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.vendor}>{req.vendor || '-'}</td>
                          <td style={{ ...td, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={req.division}>{req.division || '-'}</td>
                          <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: '0.82rem' }}>{formatCurrency(req.amount || 0)}</td>
                          <td style={td}><StatusBadge status={req.status} /></td>
                          <td style={td}>
                            {req.attachLink ? (
                              <a href={`/api/frp/${req.id}/attachment`} target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '8px', fontWeight: 600, fontSize: '12px', textDecoration: 'none' }}>
                                <span className="material-icons-round" style={{ fontSize: '15px' }}>attach_file</span>
                                File
                              </a>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            <button type="button" onClick={() => setSelectedFrpId(req.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit' }}>
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>receipt_long</span>
                              Detail
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination Desktop ── */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Menampilkan <strong>{rangeStart}–{rangeEnd}</strong> dari <strong>{total}</strong> FRP
                  {loading && <span style={{ marginLeft: '8px', opacity: 0.5 }}>...</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Baris/hal</span>
                  <select value={rowsPerPage} onChange={e => handleRowsPerPage(Number(e.target.value))}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1}
                    style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>«</button>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>← Prev</button>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>
                    {safePage} / {totalPages}
                  </span>
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Next →</button>
                  <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}
                    style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>»</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <DialogStatusFrp
        isOpen={!!selectedFrpId}
        frpId={selectedFrpId}
        onClose={() => { setSelectedFrpId(null); setRefreshKey(k => k + 1) }}
      />
    </main>
  )
}
