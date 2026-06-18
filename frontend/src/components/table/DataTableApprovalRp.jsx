import React, { useState } from 'react'
import { DataTableIdentity } from '../table/DataTable.jsx'


const STATUS_META = {
  waiting_manager: {
    label: 'Waiting Manager',
    background: '#fef3c7',
    color: '#92400e',
    icon: 'hourglass_top',
  },
  division_review: {
    label: 'Division Review',
    background: '#dbeafe',
    color: '#1d4ed8',
    icon: 'fact_check',
  },
  final_review: {
    label: 'Final Review',
    background: '#ede9fe',
    color: '#6d28d9',
    icon: 'verified',
  },
  approved: {
    label: 'Approved',
    background: '#bbf7d0',
    color: '#166534',
    icon: 'check_circle',
  },
  rejected: {
    label: 'Rejected',
    background: '#fecaca',
    color: '#991b1b',
    icon: 'cancel',
  },
  created_frp: {
    label: 'Created FRP',
    background: '#cffafe',
    color: '#0e7490',
    icon: 'note_add',
  },
}

function parseNumber(value) {
  return Number(String(value || '0').replace(/[^0-9.-]/g, '')) || 0
}

function formatCurrency(value) {
  return `IDR ${Math.round(parseNumber(value)).toLocaleString('id-ID')}`
}

function normalizeExternalUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  return `https://${raw}`
}

function renderExternalLink(value) {
  if (!value) return '-'

  return (
    <button
      type="button"
      onClick={() => window.open(normalizeExternalUrl(value), '_blank', 'noopener,noreferrer')}
      style={{
        border: '1px solid #bfdbfe',
        background: '#eff6ff',
        color: '#2563eb',
        fontWeight: 700,
        borderRadius: '999px',
        padding: '4px 10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '12px',
        lineHeight: 1.2,
      }}
    >
      Buka Link
    </button>
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function renderStatus(status) {
  const normalizedStatus = String(status || '').trim().toLowerCase()
  const meta =
    STATUS_META[normalizedStatus] ||
    STATUS_META[String(status || '').trim()] ||
    { label: status || '-', background: '#e2e8f0', color: '#475569', icon: 'help_outline' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        alignSelf: 'flex-start',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: meta.background,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="material-icons-round" style={{ fontSize: '14px', lineHeight: 1 }}>
        {meta.icon}
      </span>
      {meta.label}
    </span>
  )
}

function getPurchaseCategory(rp) {
  return rp?.purchaseCategory || rp?.kategoriPembelian || '-'
}

function getRpDescription(rp) {
  return rp?.description || rp?.deskripsi || '-'
}

const ACCENT_PALETTES = [
  { color: '#1d4ed8', soft: '#dbeafe', border: '#93c5fd' },
  { color: '#0f766e', soft: '#ccfbf1', border: '#5eead4' },
  { color: '#b45309', soft: '#fef3c7', border: '#fcd34d' },
  { color: '#7c3aed', soft: '#ede9fe', border: '#c4b5fd' },
  { color: '#be185d', soft: '#fce7f3', border: '#f9a8d4' },
  { color: '#15803d', soft: '#dcfce7', border: '#86efac' },
]

function getAccentPalette(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized || normalized === '-') {
    return { color: '#64748b', soft: '#f1f5f9', border: '#cbd5e1' }
  }

  if (normalized === 'penambahan barang') {
    return { color: '#1d4ed8', soft: '#dbeafe', border: '#93c5fd' }
  }

  if (normalized === 'pergantian barang') {
    return { color: '#b45309', soft: '#fef3c7', border: '#fcd34d' }
  }

  if (normalized === 'pengadaan barang baru') {
    return { color: '#15803d', soft: '#dcfce7', border: '#86efac' }
  }

  if (/(^|[^a-z])it([^a-z]|$)/.test(normalized)) {
    return { color: '#0f766e', soft: '#ccfbf1', border: '#5eead4' }
  }

  if (normalized.includes('hcga') || normalized.includes('ga') || normalized.includes('hr')) {
    return { color: '#be185d', soft: '#fce7f3', border: '#f9a8d4' }
  }

  if (normalized.includes('finance') || normalized.includes('accounting')) {
    return { color: '#b45309', soft: '#fef3c7', border: '#fcd34d' }
  }

  if (normalized.includes('operational') || normalized.includes('operation')) {
    return { color: '#1d4ed8', soft: '#dbeafe', border: '#93c5fd' }
  }

  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ACCENT_PALETTES[Math.abs(hash) % ACCENT_PALETTES.length]
}

function renderColoredLabel(value) {
  const palette = getAccentPalette(value)
  return (
    <span
      style={{
        color: palette.color,
        fontWeight: 700,
      }}
    >
      {value || '-'}
    </span>
  )
}

function renderColoredSegments(value) {
  const normalized = String(value || '-')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!normalized.length) {
    return renderColoredLabel('-')
  }

  return normalized.map((part, index) => (
    <React.Fragment key={`${part}-${index}`}>
      {index > 0 ? <span style={{ color: '#94a3b8', fontWeight: 600 }}> / </span> : null}
      {renderColoredLabel(part)}
    </React.Fragment>
  ))
}

function renderColoredCategories(value) {
  const raw = String(value || '-').trim()
  if (!raw || raw === '-') {
    return renderColoredLabel('-')
  }

  const parts = raw.split(/([/,])/).map((part) => part.trim()).filter(Boolean)

  return parts.map((part, index) => {
    if (part === '/' || part === ',') {
      return (
        <span key={`separator-${index}`} style={{ color: '#94a3b8', fontWeight: 600 }}>
          {part === ',' ? ', ' : ' / '}
        </span>
      )
    }

    return <React.Fragment key={`${part}-${index}`}>{renderColoredLabel(part)}</React.Fragment>
  })
}

function renderInfoChip(value, palette = {}) {
  return (
    <span
      title={value}
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        padding: '4px 8px',
        borderRadius: '10px',
        border: `1px solid ${palette.border || '#dbe5f0'}`,
        background: palette.background || '#f8fafc',
        color: palette.color || '#334155',
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: 1.35,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
      }}
    >
      {value || '-'}
    </span>
  )
}

const clampTextStyle = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

const singleLineEllipsisStyle = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const desktopHeaders = [
  { label: 'FRP Number', key: 'date' },
  { label: 'Requestor & Vendor', key: 'creator' },
  { label: 'Division', key: 'division' },
  { label: 'Receiver PIC', key: 'receiverPic' },
  { label: 'Description', key: null },
  { label: 'Total Amount', key: 'total' },
  { label: 'Status', key: 'status' },
  { label: 'Action', key: null },
]
const desktopColumnWidths = ['10%', '17%', '10%', '14%', '14%', '10%', '9%', '16%']

export default function DataTableRp({
  tab,
  approvalMode = 'manager',
  loading,
  isMobile,
  paginated,
  total = 0,
  safeCurrentPage,
  totalPages,
  rowsPerPage,
  setRowsPerPage,
  setCurrentPage,
  rangeStart,
  rangeEnd,
  sortConfig,
  requestSort,
  renderRowActions,
  setSelected,
  calcTotal,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const showStaffActionsInDone = approvalMode === 'staff'
  const showRowActions = tab !== 'approved' || showStaffActionsInDone

  const renderPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => setCurrentPage(i)}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: i === safeCurrentPage ? 'none' : '1px solid #dbe5f0',
            background: i === safeCurrentPage ? '#1e5e4d' : 'white',
            color: i === safeCurrentPage ? 'white' : '#475569',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'grid', placeItems: 'center', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { if (i !== safeCurrentPage) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' } }}
          onMouseLeave={(e) => { if (i !== safeCurrentPage) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dbe5f0' } }}
        >{i}</button>
      )
    }
    return pages
  }

  const copyRpNo = async (id, rpNo) => {
    if (!rpNo) return
    try {
      await navigator.clipboard.writeText(rpNo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1400)
    } catch (_) {}
  }

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedId(prev => (prev === id ? null : id))
  }

  const renderSortIcon = (key) => {
    if (!key) return null
    if (sortConfig.key !== key) {
      return (
        <span
          className="material-icons-round"
          style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', opacity: 0.3 }}
        >
          unfold_more
        </span>
      )
    }
    return sortConfig.direction === 'asc' ? (
      <span
        className="material-icons-round"
        style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}
      >
        arrow_upward
      </span>
    ) : (
      <span
        className="material-icons-round"
        style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}
      >
        arrow_downward
      </span>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: '#64748b',
          padding: '4rem 2rem',
        }}
      >
        Memuat data...
      </div>
    )
  }

  const isEmpty = total === 0

  if (isEmpty && isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: '#94a3b8',
          padding: '4rem 2rem',
        }}
      >
        <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>
          inventory_2
        </span>
        <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
      </div>
    )
  }

  /* ── Mobile card list ── */
  if (isMobile) {
    return (
      <>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {paginated.map((rp) => {
            const isOpen = expandedId === rp.id
            const purchaseCategory = getPurchaseCategory(rp)
            const description = getRpDescription(rp)
            return (
              <div
                key={rp.id}
                style={{
                  background: 'white',
                  border: `1.5px solid ${isOpen ? '#bfdbfe' : '#e8edf4'}`,
                  borderRadius: '14px',
                  boxShadow: isOpen ? '0 4px 16px rgba(37,99,235,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Card header — klik untuk buka detail */}
                <div
                  style={{ padding: '14px', cursor: 'pointer' }}
                  onClick={() => setSelected(rp)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Chevron toggle */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(rp.id, e)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          border: '1.5px solid #dbe5f0',
                          background: isOpen ? '#eff6ff' : 'white',
                          color: isOpen ? '#2563eb' : '#94a3b8',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                        }}
                        aria-label={isOpen ? 'Tutup aksi' : 'Buka aksi'}
                      >
                        <span
                          className="material-icons-round"
                          style={{
                            fontSize: '16px',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          expand_more
                        </span>
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyRpNo(rp.id, rp.rpNo); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem', marginBottom: '2px' }}>
                            {rp.rpNo || 'Draft'}
                          </span>
                          <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === rp.id ? '#15803d' : '#94a3b8' }}>
                            {copiedId === rp.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {formatDate(rp.createdAt || rp.tanggalDibutuhkan)}
                        </div>
                      </div>
                    </div>
                    {renderStatus(rp.status)}
                  </div>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}
                    >
                    {[
                      { label: 'Pemohon', value: rp.dibuatOleh || '-', truncate: true },
                      { label: 'Vendor', value: rp.vendorSuggestion || '-' },
                    ].map(({ label, value, truncate }) => (
                      <div key={label} style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                            letterSpacing: '0.04em',
                            marginBottom: '2px',
                          }}
                        >
                          {label}
                        </div>
                        <div
                          title={truncate && value !== '-' ? value : undefined}
                          style={{
                            fontSize: '13px',
                            color: '#1e293b',
                            fontWeight: 500,
                            ...(truncate ? singleLineEllipsisStyle : {}),
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                    <div>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          letterSpacing: '0.04em',
                          marginBottom: '2px',
                        }}
                      >
                        Divisi & Proses
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                        <span style={{ color: '#1e293b', fontWeight: 500 }}>{rp.divisi || '-'}</span>
                        <span style={{ color: '#64748b' }}> (Process by </span>
                        {renderColoredSegments(rp.diprosesOleh || '-')}
                        <span style={{ color: '#64748b' }}>)</span>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          letterSpacing: '0.04em',
                          marginBottom: '4px',
                        }}
                      >
                        Purchase Category
                      </div>
                      {renderInfoChip(purchaseCategory, {
                        background: '#eff6ff',
                        border: '#bfdbfe',
                        color: '#1d4ed8',
                      })}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          letterSpacing: '0.04em',
                          marginBottom: '4px',
                        }}
                      >
                        Description
                      </div>
                      <div
                        title={description}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: '12px',
                          lineHeight: 1.45,
                          ...clampTextStyle,
                          WebkitLineClamp: 3,
                        }}
                      >
                        {description}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          letterSpacing: '0.04em',
                          marginBottom: '2px',
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          fontFamily: 'IBM Plex Mono, monospace',
                          color: '#0f172a',
                        }}
                      >
                        {formatCurrency(calcTotal(rp))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion aksi */}
                {isOpen && (
                  <div
                    style={{
                      borderTop: '1.5px solid #dbeafe',
                      background: 'linear-gradient(135deg, #f0f7ff 0%, #eff6ff 100%)',
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>receipt_long</span>
                        Detail Item
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {renderRowActions(rp, { 
                          showDetail: true, 
                          showPreview: tab === 'approved', 
                          showKeFrp: tab === 'approved', 
                          showActions: showRowActions 
                        })}
                      </div>
                    </div>

                    {rp.processChanges?.changes?.length > 0 && (
                      <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          {rp.processChanges.changes.map((change, index) => (
                            <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                              <strong>{change.field}:</strong>{' '}
                              <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                              <span style={{ color: '#64748b' }}> -&gt; </span>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                          Diubah oleh: {rp.processUpdatedBy || '-'} {rp.processUpdatedAt ? `(${formatDate(rp.processUpdatedAt)})` : ''}
                        </div>
                      </div>
                    )}

                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(215, 224, 234, 0.6)', background: 'white' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '760px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid rgba(215, 224, 234, 0.6)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '40px' }}>No</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase' }}>Item / Memo</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '50px' }}>Qty</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '140px' }}>Purchase Link</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '120px' }}>Harga Satuan</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '120px' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rp.items || []).length > 0 ? (
                            (rp.items || []).map((item, idx) => (
                              <tr key={item.id || idx} style={{ borderBottom: idx === rp.items.length - 1 ? 'none' : '1px solid rgba(241, 245, 249, 0.8)' }}>
                                <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.memo || item.description || '-'}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155', fontWeight: 600 }}>{item.qty || 1}</td>
                                <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                  {renderExternalLink(item.linkPembelian)}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 }}>{formatCurrency(Number(item.price || item.estimatedValue) || 0)}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(Number(item.amount || (item.qty * item.estimatedValue)) || 0)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada item</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile pagination */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #e2e8f0',
            padding: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            borderRadius: '0 0 16px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            {rangeStart}-{rangeEnd} dari {total} data
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, background: 'white', outline: 'none' }}
            >
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#f1f5f9' : 'white', color: safeCurrentPage === 1 ? '#94a3b8' : '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '12px' }}
            >
              Prev
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', padding: '0 4px' }}>{safeCurrentPage}/{totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#f1f5f9' : 'white', color: safeCurrentPage === totalPages ? '#94a3b8' : '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '12px' }}
            >
              Next
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ── Desktop table ── */
  return (
    <>
      <style>{`
        @keyframes accordionSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .approval-rp-desktop-table {
          width: 100%;
          max-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: 13px;
        }
        .approval-rp-desktop-header-table {
          width: 100%;
          max-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: 13px;
          background: #f8fafc;
        }
        .approval-rp-desktop-header th {
          padding: 12px 12px;
          text-align: left;
          color: #7f7f7f;
          font-family: "IBM Plex Mono", monospace;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          white-space: normal;
          line-height: 1.35;
          background: #f8fafc;
          border-bottom: 1px solid rgba(26, 42, 87, 0.08);
          user-select: none;
        }
        .approval-rp-cell {
          padding: 11px 12px;
          border-bottom: 1px solid #e8edf4;
          vertical-align: top;
        }
        .approval-rp-summary {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }
        .approval-rp-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid rgba(30, 94, 77, 0.16);
          color: #1e5e4d;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
          flex-shrink: 0;
        }
        .approval-rp-number-button {
          display: inline-flex;
          align-items: flex-start;
          gap: 6px;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
        }
        .approval-rp-number {
          font-weight: 700;
          color: #1d4ed8;
          font-size: 14px;
          line-height: 1.3;
          word-break: break-word;
        }
        .approval-rp-subtle {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          line-height: 1.45;
        }
        .approval-rp-tag {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          padding: 3px 8px;
          border-radius: 999px;
          background: #e2e8f0;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.35;
          margin-bottom: 4px;
          word-break: break-word;
        }
        .approval-rp-description {
          color: #475569;
          font-size: 11.5px;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          word-break: break-word;
        }
        .approval-rp-total {
          font-family: "IBM Plex Mono", monospace;
          font-weight: 700;
          color: #0f172a;
          font-size: 12px;
          line-height: 1.45;
          word-break: break-word;
        }
        .approval-rp-action-wrap {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 6px;
          min-width: 0;
          white-space: nowrap;
        }
        .approval-rp-action-wrap > div {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          flex-wrap: nowrap !important;
          gap: 6px !important;
          min-width: 0;
        }
        .approval-rp-action-wrap > div > * {
          flex-shrink: 0;
        }
        .approval-rp-action-cell {
          padding-left: 18px;
        }
        .approval-rp-action-header {
          padding-left: 18px !important;
        }
        .approval-rp-identity {
          min-width: 0;
          gap: 10px;
          align-items: flex-start;
        }
        .approval-rp-identity .users-table__avatar {
          width: 32px;
          height: 32px;
          font-size: 11px;
        }
        .approval-rp-identity .users-table__name-row {
          gap: 6px;
          align-items: flex-start;
        }
        .approval-rp-identity .users-table__name {
          font-size: 14px;
          line-height: 1.3;
          color: #1e293b;
        }
        .approval-rp-identity .users-table__meta {
          margin-top: 4px;
          font-size: 11px;
          line-height: 1.45;
          letter-spacing: 0.02em;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }
        .accordion-row-actions {
          animation: accordionSlideDown 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .dashboard-main-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .dashboard-main-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .dashboard-main-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dashboard-main-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, overflowX: 'auto', background: '#f8fafc', borderBottom: '1px solid rgba(26, 42, 87, 0.08)' }}>
          <table className="approval-rp-desktop-header-table">
            <colgroup>
              {desktopColumnWidths.map((width, index) => (
                <col key={`desktop-col-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <thead className="approval-rp-desktop-header">
              <tr>
                {desktopHeaders.map((header) => (
                  <th
                    key={header.label || `hdr-${header.key}`}
                    onClick={() => header.key && requestSort(header.key)}
                    className={header.label === 'Action' ? 'approval-rp-action-header' : undefined}
                    style={{ cursor: header.key ? 'pointer' : 'default' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      {header.label}
                      {renderSortIcon(header.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="dashboard-main-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', background: 'white' }}>
          <table className="approval-rp-desktop-table">
            <colgroup>
              {desktopColumnWidths.map((width, index) => (
                <col key={`desktop-col-body-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <tbody>
            {paginated.length > 0 ? paginated.map((rp, index) => {
              const isOpen = expandedId === rp.id
              const purchaseCategory = getPurchaseCategory(rp)
              const description = getRpDescription(rp)
              const absoluteIndex = (safeCurrentPage - 1) * rowsPerPage + index
              const rowBg = absoluteIndex % 2 === 0 ? 'white' : '#fcfdff'

              const td = {
                background: rowBg,
              }

              return (
                <React.Fragment key={rp.id}>
                  <tr
                    style={{ background: rowBg, transition: 'background 0.2s', cursor: 'pointer' }}
                    onClick={() => setExpandedId(prev => (prev === rp.id ? null : rp.id))}
                    onMouseEnter={(e) => {
                      const children = e.currentTarget.children
                      for (let i = 0; i < children.length; i++) {
                        children[i].style.background = '#f7fbff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      const children = e.currentTarget.children
                      for (let i = 0; i < children.length; i++) {
                        children[i].style.background = rowBg
                      }
                    }}
                  >
                    {/* Ringkasan */}
                    <td className="approval-rp-cell" style={td}>
                      <div className="approval-rp-summary">
                        <button
                          type="button"
                          className="approval-rp-toggle"
                          onClick={(e) => { e.stopPropagation(); setExpandedId(prev => (prev === rp.id ? null : rp.id)); }}
                          style={{ background: isOpen ? 'rgba(30, 94, 77, 0.12)' : 'rgba(30, 94, 77, 0.04)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(30, 94, 77, 0.12)'
                            e.currentTarget.style.borderColor = 'rgba(30, 94, 77, 0.28)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isOpen ? 'rgba(30, 94, 77, 0.12)' : 'rgba(30, 94, 77, 0.04)'
                            e.currentTarget.style.borderColor = 'rgba(30, 94, 77, 0.16)'
                          }}
                        >
                          <span className="material-icons-round" style={{ fontSize: '17px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                          </span>
                        </button>

                        <div style={{ minWidth: 0 }}>
                          <button
                            type="button"
                            className="approval-rp-number-button"
                            onClick={(e) => { e.stopPropagation(); copyRpNo(rp.id, rp.rpNo); }}
                          >
                            <span className="approval-rp-number">{rp.rpNo || 'Draft'}</span>
                            <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === rp.id ? '#15803d' : '#94a3b8' }}>
                              {copiedId === rp.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          <div className="approval-rp-subtle">
                            {formatDate(rp.createdAt || rp.tanggalDibutuhkan)}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Pemohon & Vendor */}
                    <td className="approval-rp-cell" style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <DataTableIdentity
                        className="approval-rp-identity"
                        title={rp.dibuatOleh || '-'}
                        subtitle={rp.vendorSuggestion || '-'}
                        truncateTitle
                      />
                    </td>
                    {/* Divisi & Proses */}
                    <td className="approval-rp-cell" style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="approval-rp-tag">{rp.divisi || '-'}</span>
                      <div className="approval-rp-subtle">
                        <span style={{ color: '#64748b' }}>Process by </span>
                        {renderColoredSegments(rp.diprosesOleh || '-')}
                      </div>
                    </td>
                    {/* PIC Penerima */}
                    <td className="approval-rp-cell" style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', color: '#334155', fontWeight: 500 }}>
                      <DataTableIdentity
                        className="approval-rp-identity"
                        title={rp.receiverPic || rp.picPenerima || '-'}
                        initials={String(rp.receiverPic || rp.picPenerima || '-')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join('')}
                        subtitle={renderColoredCategories(purchaseCategory)}
                      />
                    </td>
                    <td className="approval-rp-cell" style={td}>
                      <div title={description} className="approval-rp-description">
                        {description}
                      </div>
                    </td>
                    {/* Total */}
                    <td className="approval-rp-cell approval-rp-total" style={td}>
                      {formatCurrency(calcTotal(rp))}
                    </td>
                    {/* Status */}
                    <td className="approval-rp-cell" style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {renderStatus(rp.status)}
                      </div>
                    </td>
                    {/* Action Column */}
                    <td className="approval-rp-cell approval-rp-action-cell" style={{ ...td, overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
                      <div className="approval-rp-action-wrap">
                        {renderRowActions(rp, {
                          showDetail: true,
                          showPreview: tab === 'approved',
                          showKeFrp: tab === 'approved',
                          showActions: showRowActions,
                          showRevert: true
                        })}
                      </div>
                    </td>
                  </tr>

                  {/* Accordion row — detail items */}
                  {isOpen && (
                    <tr key={`${rp.id}-accordion`}>
                      <td
                        colSpan={desktopHeaders.length}
                        style={{
                          padding: '16px 20px',
                          background: '#f8fafc',
                          borderBottom: '1px solid #e8edf4'
                        }}
                      >
                        <div
                          style={{
                            border: '1.5px solid rgba(226, 232, 240, 0.6)',
                            borderRadius: '24px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(12px)',
                            padding: '24px',
                            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                            position: 'relative',
                            overflow: 'hidden',
                            animation: 'accordionSlideDown 0.2s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-round" style={{ fontSize: '16px', color: '#3b82f6' }}>receipt_long</span>
                                Detail Item &amp; Anggaran
                              </div>
                            </div>
                            
                            {rp.processChanges?.changes?.length > 0 && (
                              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                                <div style={{ display: 'grid', gap: '6px' }}>
                                  {rp.processChanges.changes.map((change, index) => (
                                    <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                                      <strong>{change.field}:</strong>{' '}
                                      <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                                      <span style={{ color: '#64748b' }}> -&gt; </span>
                                      <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                                  Diubah oleh: {rp.processUpdatedBy || '-'} {rp.processUpdatedAt ? `(${formatDate(rp.processUpdatedAt)})` : ''}
                                </div>
                              </div>
                            )}

                            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(215, 224, 234, 0.6)', background: 'rgba(255, 255, 255, 0.6)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '1120px' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid rgba(215, 224, 234, 0.6)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '50px', letterSpacing: '0.04em' }}>No</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Memo / Keterangan</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '130px', letterSpacing: '0.04em' }}>Budget ID</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '160px', letterSpacing: '0.04em' }}>Purchase Link</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '70px', letterSpacing: '0.04em' }}>Qty</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '220px', letterSpacing: '0.04em' }}>Unit Price</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '220px', letterSpacing: '0.04em' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(rp.items || []).length > 0 ? (
                                    (rp.items || []).map((item, idx) => (
                                      <tr key={item.id || idx} style={{ borderBottom: idx === rp.items.length - 1 ? 'none' : '1px solid rgba(241, 245, 249, 0.8)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: '12px', color: '#1e293b', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.memo || item.description || '-'}</td>
                                        <td style={{ padding: '12px', color: '#475569', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>{item.budgetId || '-'}</td>
                                        <td style={{ padding: '12px', color: '#334155', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.projectName || '-'}</td>
                                        <td style={{ padding: '12px', color: '#334155', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                          {renderExternalLink(item.linkPembelian)}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155', fontWeight: 600 }}>{item.qty || 1}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', fontWeight: 500 }}>{formatCurrency(Number(item.price || item.estimatedValue) || 0)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>{formatCurrency(Number(item.amount || (item.qty * item.estimatedValue)) || 0)}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada item</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            }) : (
              <tr>
                <td
                  colSpan={desktopHeaders.length}
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    background: 'white',
                    borderBottom: '1px solid #e8edf4',
                  }}
                >
                  Belum ada data
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop pagination */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          borderRadius: '0 0 16px 16px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #dbe5f0',
                background: 'white', fontFamily: 'inherit', fontSize: '13px',
                fontWeight: 600, color: '#1e293b', cursor: 'pointer', outline: 'none',
              }}
            >
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Menampilkan {rangeStart}-{rangeEnd} dari {total} data
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            style={{
              border: '1px solid #dbe5f0',
              background: safeCurrentPage === 1 ? '#f1f5f9' : 'white',
              color: safeCurrentPage === 1 ? '#94a3b8' : '#475569',
              borderRadius: '8px', padding: '8px 14px',
              fontWeight: 700, fontSize: '13px',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (safeCurrentPage !== 1) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' } }}
            onMouseLeave={(e) => { if (safeCurrentPage !== 1) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dbe5f0' } }}
          >
            Previous
          </button>
          {renderPageNumbers()}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            style={{
              border: '1px solid #dbe5f0',
              background: safeCurrentPage === totalPages ? '#f1f5f9' : 'white',
              color: safeCurrentPage === totalPages ? '#94a3b8' : '#475569',
              borderRadius: '8px', padding: '8px 14px',
              fontWeight: 700, fontSize: '13px',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (safeCurrentPage !== totalPages) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' } }}
            onMouseLeave={(e) => { if (safeCurrentPage !== totalPages) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dbe5f0' } }}
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
