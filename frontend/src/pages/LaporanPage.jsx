import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${Math.round(value || 0).toLocaleString('id-ID')}`
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr 1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

function DateField({ value, onChange, placeholder = 'Pilih Tanggal', style }) {
  const inputRef = useRef(null)
  const openPicker = () => {
    if (!inputRef.current) return
    try { if (typeof inputRef.current.showPicker === 'function') { inputRef.current.showPicker(); return } } catch (_) {}
    inputRef.current.focus(); inputRef.current.click()
  }
  return (
    <div style={{ position: 'relative' }} onClick={openPicker}>
      <input ref={inputRef} type="date" value={value} onChange={onChange} aria-label={placeholder}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', zIndex: 2 }} />
      <div style={{ ...style, paddingRight: '48px', display: 'flex', alignItems: 'center', color: value ? '#1e293b' : '#94a3b8', cursor: 'pointer', position: 'relative' }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDate(value) : placeholder}
        </span>
        <button type="button" onClick={openPicker} aria-label="Buka kalender"
          style={{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '10px', border: 'none', background: '#e2e8f0', color: '#475569', display: 'grid', placeItems: 'center', padding: 0, pointerEvents: 'none' }}>
          <span className="material-icons-round" style={{ fontSize: '18px' }}>calendar_month</span>
        </button>
      </div>
    </div>
  )
}

function SearchableSelect({ value, onChange, options, placeholder = 'Pilih...', style }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  const selected = normalized.find(o => o.value === value)
  const filteredOpts = normalized.filter(o => String(o.label || '').toLowerCase().includes(search.toLowerCase()))
  useEffect(() => { if (!open) setSearch('') }, [open])
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1 }}>
      <button type="button" onClick={() => setOpen(c => !c)}
        style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', minHeight: style?.minHeight || '42px', boxShadow: style?.boxShadow || 'inset 0 1px 0 rgba(255,255,255,0.65)' }}>
        <span style={{ display: 'block', flex: 1, color: value ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
          {selected?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', border: '1.5px solid #dbe5f0', borderRadius: '12px', boxShadow: '0 14px 30px rgba(15,23,42,0.14)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '8px' }}>
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..."
              style={{ ...style, fontSize: '0.875rem', padding: '8px 10px', minHeight: 'unset' }} />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              style={{ width: '100%', border: 'none', background: 'white', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', color: '#94a3b8', cursor: 'pointer' }}>
              {placeholder}
            </button>
            {filteredOpts.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                style={{ width: '100%', border: 'none', borderTop: '1px solid #f8fafc', background: o.value === value ? '#eff6ff' : 'white', color: o.value === value ? '#1f4e8c' : '#1e293b', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: o.value === value ? 700 : 500 }}>
                {o.label}
              </button>
            ))}
            {filteredOpts.length === 0 && <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>Tidak ditemukan</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LaporanPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: 'APPROVED', company: '', divisi: '', from: '', to: '' })

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetch('/api/data/laporan')
      .then(r => {
        if (r.status === 403) { navigate('/'); return null }
        if (!r.ok) { navigate('/login'); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { setCurrentPage(1) }, [filters, rowsPerPage])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT
  const user = data?.user || {}

  const handleSidebarToggle = () => {
    if (window.innerWidth <= 1024) { setMobileMenuOpen(c => !c); return }
    setSidebarCollapsed(c => !c)
  }

  const filtered = useMemo(() => {
    if (!data?.requests) return []
    return data.requests.filter(r => {
      if (filters.status && r.status !== filters.status) return false
      if (filters.company && r.companyName !== filters.company) return false
      if (filters.divisi && r.divisi !== filters.divisi) return false
      if (filters.from && r.tanggalFrp < filters.from) return false
      if (filters.to && r.tanggalFrp > filters.to) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        return (r.frpNo || '').toLowerCase().includes(q) ||
          (r.vendor || '').toLowerCase().includes(q) ||
          (r.dimintaOleh || '').toLowerCase().includes(q) ||
          (r.companyName || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [data, filters])

  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage), [filtered, rowsPerPage, safePage])
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filtered.length, safePage * rowsPerPage)

  const companyOptions = useMemo(() => (data?.companies || []).map(c => ({ value: c, label: c })), [data])
  const divisiOptions  = useMemo(() => (data?.divisions  || []).map(d => ({ value: d, label: d })), [data])
  const statusOptions  = [{ value: 'APPROVED', label: 'APPROVED' }, { value: 'PENDING', label: 'PENDING' }, { value: 'REJECTED', label: 'REJECTED' }]

  const filterInput = {
    width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #dde3ed',
    fontSize: '13px', background: 'white', boxSizing: 'border-box', fontFamily: 'inherit',
    outline: 'none', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minHeight: '42px',
  }

  const statusColors = {
    PENDING:  { background: '#fef08a', color: '#854d0e' },
    APPROVED: { background: '#bbf7d0', color: '#166534' },
    REJECTED: { background: '#fecaca', color: '#991b1b' },
  }

  const desktopHeaders = ['No FRP', 'Tanggal', 'Pemohon & Vendor', 'Divisi', 'Perusahaan', 'Total', 'Status', 'Disetujui Oleh']
  const desktopWidths  = ['13%', '9%', '18%', '9%', '14%', '13%', '9%', '15%']

  const getRow = r => [
    r.frpNo ?? '', r.tanggalFrp ?? '', r.dimintaOleh ?? '', r.divisi ?? '',
    r.companyName ?? '', r.vendor ?? '', r.totalAmount ?? 0, r.status ?? '',
    r.approvedBy ?? '', r.approvedAt ? r.approvedAt.substring(0, 10) : '',
  ]

  const exportCSV = () => {
    const headers = ['No FRP', 'Tanggal', 'Diminta Oleh', 'Divisi', 'Perusahaan', 'Vendor', 'Total (IDR)', 'Status', 'Disetujui Oleh', 'Tgl Disetujui']
    const csv = [headers, ...filtered.map(getRow)]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `laporan-frp-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = () => {
    const headers = ['No FRP', 'Tanggal', 'Diminta Oleh', 'Divisi', 'Perusahaan', 'Vendor', 'Total (IDR)', 'Status', 'Disetujui Oleh', 'Tgl Disetujui']
    let html = '<table><thead><tr>' + headers.map(h => `<th style="background:#163a6b;color:white;font-weight:bold;padding:6px 10px;">${h}</th>`).join('') + '</tr></thead><tbody>'
    filtered.map(getRow).forEach((row, idx) => {
      html += `<tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">`
      html += row.map(v => `<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${v ?? ''}</td>`).join('')
      html += '</tr>'
    })
    html += '</tbody></table>'
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `laporan-frp-${new Date().toISOString().slice(0, 10)}.xls`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    setExporting('pdf')
    try {
      const res = await fetch('/api/laporan/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: filtered,
          meta: { status: filters.status || 'Semua', company: filters.company || 'Semua', divisi: filters.divisi || 'Semua', from: filters.from, to: filters.to, totalAmount, count: filtered.length },
        }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `laporan-frp-${new Date().toISOString().slice(0, 10)}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Gagal export PDF') }
    finally { setExporting(null) }
  }

  const btnExport = (color, onClick, icon, label, disabled) => (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '9px', border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }}>
      <span className="material-icons-round" style={{ fontSize: '15px' }}>{icon}</span>{label}
    </button>
  )

  return (
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
        <Header title="Laporan" onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
              Memuat data...
            </div>
          )}

          {/* ── Filter Bar ── */}
          <div style={{ background: '#f1f5f9', borderRadius: '16px', padding: isMobile ? '12px' : '20px', marginBottom: isMobile ? '12px' : '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(6, isMobile, isTablet), gap: isMobile ? '10px' : '14px', alignItems: 'flex-end' }}>
              {[
                {
                  label: 'Search',
                  span: isMobile,
                  content: <input style={filterInput} placeholder="Cari No FRP / Vendor / Nama..." value={filters.search} onChange={e => setFilters(c => ({ ...c, search: e.target.value }))} />
                },
                {
                  label: 'Status',
                  content: <SearchableSelect value={filters.status} onChange={v => setFilters(c => ({ ...c, status: v }))} options={statusOptions} placeholder="Semua Status" style={filterInput} />
                },
                {
                  label: 'Perusahaan',
                  content: <SearchableSelect value={filters.company} onChange={v => setFilters(c => ({ ...c, company: v }))} options={companyOptions} placeholder="Semua PT" style={filterInput} />
                },
                {
                  label: 'Divisi',
                  content: <SearchableSelect value={filters.divisi} onChange={v => setFilters(c => ({ ...c, divisi: v }))} options={divisiOptions} placeholder="Semua Divisi" style={filterInput} />
                },
                {
                  label: 'Dari Tanggal',
                  content: <DateField value={filters.from} onChange={e => setFilters(c => ({ ...c, from: e.target.value }))} placeholder="Dari Tanggal" style={filterInput} />
                },
                {
                  label: 'Sampai Tanggal',
                  content: <DateField value={filters.to} onChange={e => setFilters(c => ({ ...c, to: e.target.value }))} placeholder="Sampai Tanggal" style={filterInput} />
                },
              ].map(({ label, content, span }, i) => (
                <div key={i} style={{ gridColumn: span ? '1 / -1' : undefined }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>{label}</label>
                  {content}
                </div>
              ))}
            </div>
          </div>

          {/* ── Toolbar: summary + export ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: isMobile ? '10px' : '12px', padding: '0 2px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#163a6b', lineHeight: 1.1 }}>{filtered.length}</div>
              </div>
              <div style={{ width: '1px', height: '36px', background: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Nilai</span>
                <div style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: 800, color: '#166534', lineHeight: 1.1, fontFamily: 'monospace' }}>{formatCurrency(totalAmount)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {btnExport('#16a34a', exportCSV, 'description', 'CSV')}
              {btnExport('#1d4ed8', exportExcel, 'table_chart', 'Excel')}
              {btnExport('#dc2626', exportPDF, exporting === 'pdf' ? 'hourglass_empty' : 'picture_as_pdf', exporting === 'pdf' ? 'Proses...' : 'PDF', exporting === 'pdf')}
              <button type="button" onClick={() => setFilters({ search: '', status: 'APPROVED', company: '', divisi: '', from: '', to: '' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
                <span className="material-icons-round" style={{ fontSize: '15px' }}>restart_alt</span>Reset
              </button>
            </div>
          </div>

          {/* ── Table Card ── */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
                <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>search_off</span>
                <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Tidak ada data sesuai filter</h3>
              </div>
            ) : isMobile ? (
              <>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {paginated.map(r => {
                    const ss = statusColors[r.status] || {}
                    return (
                      <div key={r.frpNo} style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{r.frpNo}</span>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, ...ss }}>{r.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                          {[
                            { label: 'Tanggal', value: formatDate(r.tanggalFrp) },
                            { label: 'Pemohon', value: r.dimintaOleh || '-' },
                            { label: 'Vendor', value: r.vendor || '-' },
                            { label: 'Divisi', value: r.divisi || '-' },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                            </div>
                          ))}
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Perusahaan</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{r.companyName || '-'}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Total</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>{formatCurrency(r.totalAmount)}</div>
                          </div>
                          {r.approvedBy && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Disetujui Oleh</div>
                              <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>{r.approvedBy}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Mobile Pagination */}
                <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}–{rangeEnd} dari {filtered.length}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                      {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
                    <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Sticky thead */}
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                    <colgroup>{desktopWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                    <thead>
                      <tr>
                        {desktopHeaders.map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  </table>
                  {/* Scrollable tbody */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                      <colgroup>{desktopWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                      <tbody>
                        {paginated.map((r, idx) => {
                          const ss = statusColors[r.status] || {}
                          const absIdx = (safePage - 1) * rowsPerPage + idx
                          const rowBg = absIdx % 2 === 0 ? 'white' : '#fafbfc'
                          const td = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
                          return (
                            <tr key={r.frpNo + idx} style={{ background: rowBg }}
                              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                              <td style={td}>
                                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.82rem', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.frpNo}</div>
                              </td>
                              <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(r.tanggalFrp)}</td>
                              <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '3px' }}>{r.dimintaOleh || '-'}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{r.vendor || '-'}</div>
                              </td>
                              <td style={td}><span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>{r.divisi || '-'}</span></td>
                              <td style={{ ...td, fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.companyName || '-'}</td>
                              <td style={{ ...td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', wordBreak: 'break-word' }}>{formatCurrency(r.totalAmount)}</td>
                              <td style={td}><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', ...ss }}>{r.status}</span></td>
                              <td style={{ ...td, fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.approvedBy || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Desktop Pagination */}
                <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexWrap: 'nowrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{rangeStart}–{rangeEnd} dari {filtered.length} data · Total: <strong style={{ color: '#166534' }}>{formatCurrency(totalAmount)}</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page</span>
                      <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px', background: 'white' }}>
                        {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Page {safePage} / {totalPages}</div>
                    <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Prev</button>
                    <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
