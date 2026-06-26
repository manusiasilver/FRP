import React, { useState, useMemo, useEffect } from 'react'
import CreateButton from '../button/CreateButton.jsx'

const COLUMN_WIDTHS = ['4%', '10%', '11%', '15%', '7%', '12%', '10%', '11%', '8%', '12%']
const COLUMNS = ['No', 'Budget ID', 'Department', 'Project Name', 'Type', 'Amount', 'Used', 'Remaining', 'Status', 'Action']
const DEFAULT_COMPANY = 'PT PILAR NIAGA MAKMUR'

const formatCurrency = value => {
  const normalized = Number(String(value || 0).replace(/[^0-9.-]/g, ''))
  return `IDR ${Number.isNaN(normalized) ? 0 : normalized.toLocaleString('id-ID')}`
}

const matchesSearch = (item, search) => {
  if (!search) return true
  const q = search.toLowerCase()
  return (
    (item.id || '').toLowerCase().includes(q) ||  
    (item.departmentName || item.department || '').toLowerCase().includes(q) ||
    (item.projectName || item.description || '').toLowerCase().includes(q)
  )
}

function buildStyles() {
  return {
    tableContain: { display: 'flex', flexDirection: 'column' },
    scrollBody: { },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' },
    th: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      padding: '10px 14px',
      textAlign: 'left',
      borderBottom: '2px solid #e2e8f0',
      boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)',
      background: '#f8fafc',
      fontWeight: 700,
      color: '#475569',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    td: {
      padding: '11px 14px',
      textAlign: 'left',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '0.9rem',
      verticalAlign: 'top',
      color: '#334155',
    },
    mobileItemCard: {
      padding: '1rem',
      borderBottom: '1px solid #eef2f7',
      background: 'white',
    },
    mobileMetaGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.8rem',
      marginTop: '0.95rem',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    },
    badgeSoft: { background: '#e2e8f0', color: '#334155' },
    badgeCode: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
  }
}

export default function DataTableBudgets({
  listData = [],
  onEdit,
  onDelete,
  companyFilter = '',
  search = '',
  companyNames = [],
  isMobile = false,
}) {
  const styles = buildStyles()
  const defaultCompany = companyNames[0] || DEFAULT_COMPANY

  const filtered = listData.filter(item => {
    if (companyFilter) {
      if ((item.company || defaultCompany) !== companyFilter) return false
    }
    return matchesSearch(item, search)
  })

  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [companyFilter, search, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, safeCurrentPage])

  const rangeStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filtered.length, safeCurrentPage * rowsPerPage)

  const renderPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, safeCurrentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => setCurrentPage(i)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: i === safeCurrentPage ? 'none' : '1px solid #dbe5f0',
            background: i === safeCurrentPage ? '#1e5e4d' : 'white',
            color: i === safeCurrentPage ? 'white' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (i !== safeCurrentPage) {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }
          }}
          onMouseLeave={(e) => {
            if (i !== safeCurrentPage) {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.borderColor = '#dbe5f0'
            }
          }}
        >
          {i}
        </button>
      )
    }
    return pages
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data</div>
        ) : (
          paginated.map((item, idx) => (

          <div key={item.originalIndex ?? idx} style={styles.mobileItemCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.id}</div>
                <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.projectName || item.description}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {onEdit && (
                  <CreateButton variant="accordion" tone="primary" onClick={() => onEdit(item)}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                  </CreateButton>
                )}
                {onDelete && (
                  <CreateButton
                    variant="accordion"
                    tone="danger"
                    onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}
                  >
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                  </CreateButton>
                )}
              </div>
            </div>

            <div style={styles.mobileMetaGrid}>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Dept</div>
                <span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.departmentName || item.department}</span>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Type</div>
                <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.budgetType || item.type}</span>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Amount</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.budgetAmount ?? item.totalAmount ?? 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Remaining</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#10b981' }}>{formatCurrency(item.budgetRemaining ?? 0)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ width: '100%' }}>
        <div style={styles.tableContain}>
        <table style={styles.table}>
          <colgroup>
            {COLUMN_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col} style={styles.th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div style={styles.scrollBody}>
          <table style={styles.table}>
            <colgroup>
              {COLUMN_WIDTHS.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const rowBg = idx % 2 === 0 ? 'white' : '#fafbfc'
                  return (
                    <tr
                      key={item.originalIndex ?? idx}
                      style={{ background: rowBg }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#eff6ff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = rowBg
                      }}
                    >
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>
                        <strong style={{ color: '#1e293b' }}>{item.id}</strong>
                      </td>
                      <td style={{ ...styles.td, fontSize: '0.82rem', fontWeight: 700 }}>
                        {item.departmentName || item.department || '-'}
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                          {item.departmentClass || item.class || '-'}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>
                        {item.projectName || item.description || '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.budgetType || item.type || '-'}</span>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
                        {formatCurrency(item.budgetAmount ?? item.totalAmount ?? 0)}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace', color: '#ef4444' }}>
                        {formatCurrency(item.budgetUsed ?? 0)}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#10b981' }}>
                        {formatCurrency(item.budgetRemaining ?? 0)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: item.isActive !== false ? '#dcfce7' : '#fee2e2',
                          color: item.isActive !== false ? '#166534' : '#991b1b',
                        }}>
                          {item.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                          {onEdit && (
                            <CreateButton variant="accordion" tone="primary" onClick={() => onEdit(item)}>
                              <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                            </CreateButton>
                          )}
                          {onDelete && (
                            <CreateButton
                              variant="accordion"
                              tone="danger"
                              onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}
                            >
                              <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                            </CreateButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        {filtered.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid #e2e8f0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'white',
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
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #dbe5f0',
                    background: 'white',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} data
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
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (safeCurrentPage !== 1) {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.borderColor = '#cbd5e1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (safeCurrentPage !== 1) {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.borderColor = '#dbe5f0'
                  }
                }}
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
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (safeCurrentPage !== totalPages) {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.borderColor = '#cbd5e1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (safeCurrentPage !== totalPages) {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.borderColor = '#dbe5f0'
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
