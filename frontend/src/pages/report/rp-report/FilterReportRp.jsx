import React, { useState, useEffect, useRef } from 'react'

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${Math.round(value || 0).toLocaleString('id-ID')}`
}

function DateField({ value, onChange, placeholder = 'Pilih Tanggal', style }) {
  const inputRef = useRef(null)
  const openPicker = () => {
    if (!inputRef.current) return
    try { if (typeof inputRef.current.showPicker === 'function') { inputRef.current.showPicker(); return } } catch (_) { }
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

const REPORT_TYPES = [
  { key: 'frp', label: 'FRP', subtitle: 'Fund Request Procurement', color: '#1f4e8c', icon: 'receipt_long' },
  { key: 'rp', label: 'RP', subtitle: 'Request Pembelian', color: '#7c3aed', icon: 'shopping_bag' },
]

function ReportTypeDropdown({ reportType, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = REPORT_TYPES.find(t => t.key === reportType) || REPORT_TYPES[0]
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '10px', padding: '9px 14px', borderRadius: '10px', border: `1.5px solid ${current.color}30`, background: `${current.color}08`, cursor: 'pointer', fontFamily: 'inherit', minHeight: '42px' }}>
        <span className="material-icons-round" style={{ fontSize: '20px', color: current.color }}>{current.icon}</span>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: current.color, lineHeight: 1.1 }}>Laporan {current.label}</div>
        </div>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', marginLeft: '4px', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', background: 'white', border: '1.5px solid #dbe5f0', borderRadius: '14px', boxShadow: '0 14px 30px rgba(15,23,42,0.12)', zIndex: 100, overflow: 'hidden', padding: '6px' }}>
          {REPORT_TYPES.map(t => {
            const active = t.key === reportType
            return (
              <button key={t.key} type="button"
                onClick={() => { onChange(t.key); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '10px', border: 'none', background: active ? `${t.color}10` : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <span className="material-icons-round" style={{ fontSize: '18px', color: t.color }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: active ? t.color : '#1e293b' }}>Laporan {t.label}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.subtitle}</div>
                </div>
                {active && <span className="material-icons-round" style={{ fontSize: '16px', color: t.color, marginLeft: 'auto' }}>check</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr 1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

export default function FilterReport({
  filters,
  setFilters,
  reportType,
  setReportType,
  statusOptions,
  companyOptions,
  divisiOptions,
  isMobile,
  isTablet,
  exportCSV,
  exportExcel,
  exportPDF,
  exporting,
  totalAmount,
  filteredCount
}) {
  const filterInput = {
    width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #dde3ed',
    fontSize: '13px', background: 'white', boxSizing: 'border-box', fontFamily: 'inherit',
    outline: 'none', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minHeight: '42px',
  }

  const btnExport = (color, onClick, icon, label, disabled) => (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '9px', border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }}>
      <span className="material-icons-round" style={{ fontSize: '15px' }}>{icon}</span>{label}
    </button>
  )

  return (
    <div style={{ padding: isMobile ? '16px 16px 12px 16px' : '20px 20px 16px 20px', background: 'white' }}>
      {/* Header section of filter */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Nilai</span>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534', lineHeight: 1.1, fontFamily: 'monospace' }}>{formatCurrency(totalAmount)}</div>
          </div>
        </div>
        
        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {btnExport('#16a34a', exportCSV, 'description', 'CSV', exporting)}
          {btnExport('#1d4ed8', exportExcel, 'table_chart', 'Excel', exporting)}
          {btnExport('#dc2626', exportPDF, exporting === 'pdf' ? 'hourglass_empty' : 'picture_as_pdf', exporting === 'pdf' ? 'Proses...' : 'PDF', exporting === 'pdf')}
          <button type="button" onClick={() => setFilters({ search: '', status: reportType === 'rp' ? 'approved' : 'APPROVED', company: '', divisi: '', from: '', to: '' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
            <span className="material-icons-round" style={{ fontSize: '15px' }}>restart_alt</span>Reset
          </button>
        </div>
      </div>

      {/* Grid Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(6, isMobile, isTablet), gap: isMobile ? '12px' : '14px', alignItems: 'flex-end' }}>
        <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Search</label>
          <input style={filterInput} placeholder={reportType === 'rp' ? 'Cari No RP / Vendor / Nama...' : 'Cari No FRP / Vendor / Nama...'} value={filters.search} onChange={e => setFilters(c => ({ ...c, search: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Status</label>
          <SearchableSelect value={filters.status} onChange={v => setFilters(c => ({ ...c, status: v }))} options={statusOptions} placeholder="Semua Status" style={filterInput} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Perusahaan</label>
          <SearchableSelect value={filters.company} onChange={v => setFilters(c => ({ ...c, company: v }))} options={companyOptions} placeholder="Semua PT" style={filterInput} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Divisi</label>
          <SearchableSelect value={filters.divisi} onChange={v => setFilters(c => ({ ...c, divisi: v }))} options={divisiOptions} placeholder="Semua Divisi" style={filterInput} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Dari Tanggal</label>
          <DateField value={filters.from} onChange={e => setFilters(c => ({ ...c, from: e.target.value }))} placeholder="Dari Tanggal" style={filterInput} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Sampai Tanggal</label>
          <DateField value={filters.to} onChange={e => setFilters(c => ({ ...c, to: e.target.value }))} placeholder="Sampai Tanggal" style={filterInput} />
        </div>
      </div>
      
      {/* Summary Footer */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
          <div style={{ width: '220px' }}>
            <ReportTypeDropdown reportType={reportType} onChange={key => { setReportType(key); setFilters({ search: '', status: key === 'rp' ? 'approved' : 'APPROVED', company: '', divisi: '', from: '', to: '' }) }} />
          </div>
        </div>
      </div>
    </div>
  )
}
