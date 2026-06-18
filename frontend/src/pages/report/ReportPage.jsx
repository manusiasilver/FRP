import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import { useUser } from '../../contexts/UserContext'
import DataTableReport from './DataTableReport'
import FilterReport from './FilterReport'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const RP_STATUS_META = {
  waiting_manager: { label: 'Menunggu Manager', background: '#fef3c7', color: '#92400e' },
  division_review: { label: 'Menunggu Proses', background: '#dbeafe', color: '#1d4ed8' },
  final_approved: { label: 'Approval Proses', background: '#ede9fe', color: '#6d28d9' },
  approved: { label: 'Approved', background: '#bbf7d0', color: '#166534' },
  REJECTED: { label: 'Rejected', background: '#fecaca', color: '#991b1b' },
  CREATED_FRP: { label: 'Created FRP', background: '#cffafe', color: '#0e7490' },
}

export default function LaporanPage({ type = 'frp' }) {
  const navigate = useNavigate()
  const reportType = type
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)
  const { setUser } = useUser()
  const [viewportWidth, setViewportWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: type === 'rp' ? 'approved' : 'APPROVED', company: '', divisi: '', from: '', to: '' })

  usePageLoadingDialog(loading && !data, {
    title: reportType === 'rp' ? 'Memuat Report RP' : 'Memuat Report FRP',
    message: 'Sistem sedang menyiapkan data laporan Anda.',
  })

  useEffect(() => {
    setFilters({ search: '', status: type === 'rp' ? 'approved' : 'APPROVED', company: '', divisi: '', from: '', to: '' })
    setCurrentPage(1)
  }, [type])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = reportType === 'rp' ? '/api/data/laporan-rp' : '/api/data/laporan'
    fetch(url)
      .then(r => {
        if (r.status === 403) { navigate('/'); return null }
        if (!r.ok) { navigate('/'); return null }
        return r.json()
      })
      .then(d => {
        if (d) {
          if (d.requests) {
            d.requests = d.requests.map(r => ({
              ...r,
              divisi: r.divisi || r.departmentClass || r.departmentName || '',
              dibuatOleh: r.dibuatOleh || r.requestedBy || r.createdByUserName || '',
              diprosesOleh: r.diprosesOleh || r.processedByDepartment || '',
              kategoriPembelian: r.kategoriPembelian || r.purchaseCategory || '',
              tanggalDibutuhkan: r.tanggalDibutuhkan || r.requiredDate || '',
            }));
          }
          setData(d);
          setUser(d.user);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [reportType])

  useEffect(() => { setCurrentPage(1) }, [filters, rowsPerPage, reportType])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const filtered = useMemo(() => {
    if (!data?.requests) return []
    return data.requests.filter(r => {
      if (filters.status && r.status !== filters.status) return false
      if (filters.company && r.companyName !== filters.company) return false
      if (filters.divisi && r.divisi !== filters.divisi) return false
      const dateField = reportType === 'rp' ? (r.createdAt || r.tanggalDibutuhkan || '').slice(0, 10) : r.tanggalFrp
      if (filters.from && dateField < filters.from) return false
      if (filters.to && dateField > filters.to) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (reportType === 'rp') {
          return (r.rpNo || '').toLowerCase().includes(q) ||
            (r.vendorSuggestion || '').toLowerCase().includes(q) ||
            (r.dibuatOleh || '').toLowerCase().includes(q) ||
            (r.companyName || '').toLowerCase().includes(q)
        }
        return (r.frpNo || '').toLowerCase().includes(q) ||
          (r.vendor || '').toLowerCase().includes(q) ||
          (r.dimintaOleh || '').toLowerCase().includes(q) ||
          (r.companyName || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [data, filters, reportType])

  const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage), [filtered, rowsPerPage, safePage])
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filtered.length, safePage * rowsPerPage)

  const companyOptions = useMemo(() => {
    if (data?.companies) return data.companies.map(c => ({ value: c, label: c }))
    if (data?.requests) {
      const comps = [...new Set(data.requests.map(r => r.companyName).filter(Boolean))].sort()
      return comps.map(c => ({ value: c, label: c }))
    }
    return []
  }, [data])
  const divisiOptions = useMemo(() => (data?.divisions || []).map(d => ({ value: d, label: d })), [data])
  const statusOptions = reportType === 'rp'
    ? Object.entries(RP_STATUS_META).map(([value, m]) => ({ value, label: m.label }))
    : [{ value: 'APPROVED', label: 'APPROVED' }, { value: 'PENDING', label: 'PENDING' }, { value: 'REJECTED', label: 'REJECTED' }]

  const statusColors = {
    PENDING: { background: '#fef08a', color: '#854d0e' },
    APPROVED: { background: '#bbf7d0', color: '#166534' },
    REJECTED: { background: '#fecaca', color: '#991b1b' },
  }

  const desktopHeaders = reportType === 'rp'
    ? ['No RP', 'Tanggal', 'Pemohon', 'Divisi', 'Diproses Oleh', 'Kategori', 'Total', 'Status']
    : ['No FRP', 'Tanggal', 'Pemohon & Vendor', 'Divisi', 'Perusahaan', 'Total', 'Status', 'Disetujui Oleh', 'Attach Link', 'Approved']
  const desktopWidths = reportType === 'rp'
    ? ['13%', '9%', '14%', '10%', '15%', '16%', '13%', '10%']
    : ['11%', '8%', '15%', '8%', '11%', '11%', '8%', '11%', '9%', '8%']

  const getRow = r => reportType === 'rp'
    ? [r.rpNo ?? '', (r.createdAt || r.tanggalDibutuhkan || '').slice(0, 10), r.dibuatOleh ?? '', r.divisi ?? '', r.diprosesOleh ?? '', r.kategoriPembelian ?? '', r.totalAmount ?? 0, r.status ?? '']
    : [r.frpNo ?? '', r.tanggalFrp ?? '', r.dimintaOleh ?? '', r.divisi ?? '', r.companyName ?? '', r.vendor ?? '', r.totalAmount ?? 0, r.status ?? '', r.approvedBy ?? '', r.approvedAt ? r.approvedAt.substring(0, 10) : '']

  const exportCSV = () => {
    const headers = reportType === 'rp'
      ? ['No RP', 'Tanggal', 'Dibuat Oleh', 'Divisi', 'Diproses Oleh', 'Kategori', 'Total (IDR)', 'Status']
      : ['No FRP', 'Tanggal', 'Diminta Oleh', 'Divisi', 'Perusahaan', 'Vendor', 'Total (IDR)', 'Status', 'Disetujui Oleh', 'Tgl Disetujui']
    const prefix = reportType === 'rp' ? 'laporan-rp' : 'laporan-frp'
    const csv = [headers, ...filtered.map(getRow)]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = () => {
    const headers = reportType === 'rp'
      ? ['No RP', 'Tanggal', 'Dibuat Oleh', 'Divisi', 'Diproses Oleh', 'Kategori', 'Total (IDR)', 'Status']
      : ['No FRP', 'Tanggal', 'Diminta Oleh', 'Divisi', 'Perusahaan', 'Vendor', 'Total (IDR)', 'Status', 'Disetujui Oleh', 'Tgl Disetujui']
    const prefix = reportType === 'rp' ? 'laporan-rp' : 'laporan-frp'
    let html = '<table><thead><tr>' + headers.map(h => `<th style="background:#163a6b;color:white;font-weight:bold;padding:6px 10px;">${h}</th>`).join('') + '</tr></thead><tbody>'
    filtered.map(getRow).forEach((row, idx) => {
      html += `<tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">`
      html += row.map(v => `<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;">${v ?? ''}</td>`).join('')
      html += '</tr>'
    })
    html += '</tbody></table>'
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.xls`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    setExporting('pdf')
    const prefix = reportType === 'rp' ? 'laporan-rp' : 'laporan-frp'
    const pdfUrl = reportType === 'rp' ? '/api/laporan-rp/pdf' : '/api/laporan/pdf'
    try {
      const res = await fetch(pdfUrl, {
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
      const a = document.createElement('a'); a.href = url; a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Gagal export PDF') }
    finally { setExporting(null) }
  }

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Unified Filter and Table Card ── */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: isMobile ? '12px' : '20px' }}>
        <FilterReport
          filters={filters}
          setFilters={setFilters}
          reportType={reportType}
          statusOptions={statusOptions}
          companyOptions={companyOptions}
          divisiOptions={divisiOptions}
          isMobile={isMobile}
          isTablet={isTablet}
          exportCSV={exportCSV}
          exportExcel={exportExcel}
          exportPDF={exportPDF}
          exporting={exporting}
          totalAmount={totalAmount}
          filteredCount={filtered.length}
        />
        
        <div style={{ height: '1px', background: '#e2e8f0', width: '100%' }} />

        <DataTableReport
          filtered={filtered}
          paginated={paginated}
          isMobile={isMobile}
          reportType={reportType}
          statusColors={statusColors}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          safePage={safePage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          desktopWidths={desktopWidths}
          desktopHeaders={desktopHeaders}
          totalAmount={totalAmount}
          loading={loading}
        />
      </div>
    </main>
  )
}
