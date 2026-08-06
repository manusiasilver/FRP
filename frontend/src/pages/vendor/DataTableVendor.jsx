import React, { useState, useMemo, useEffect } from 'react'
import CreateButton from '../../components/button/CreateButton.jsx'

const COLUMN_WIDTHS = ['5%', '33%', '30%', '22%', '10%']
const COLUMNS = ['No', 'Nama Vendor', 'Bank', 'No Rekening', 'Aksi']

const matchesSearch = (item, search) => {
  if (!search) return true
  const q = search.toLowerCase()
  return (
    (item.name || '').toLowerCase().includes(q) ||
    (item.bank || '').toLowerCase().includes(q) ||
    String(item.no_rekening || '').toLowerCase().includes(q)
  )
}

export default function DataTableVendor({
  listData = [],
  onEdit,
  onDelete,
  search = '',
  isMobile = false,
}) {
  const sortedListData = useMemo(() => {
    return [...listData].reverse()
  }, [listData])

  const filtered = sortedListData.filter(item => {
    return matchesSearch(item, search)
  })

  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, rowsPerPage])

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
            <div key={item.originalIndex ?? idx} style={{ padding: '1rem', borderBottom: '1px solid #eef2f7', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.name}</div>
                  <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.bank}</div>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.95rem' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Rekening</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{item.no_rekening}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
      <style>{`
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
        <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
          <colgroup>
            {COLUMN_WIDTHS.map((width, index) => <col key={`desktop-head-col-${index}`} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    background: '#f8fafc',
                    borderBottom: '1.5px solid #e2e8f0',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="dashboard-main-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
            <colgroup>
              {COLUMN_WIDTHS.map((width, index) => <col key={`desktop-body-col-${index}`} style={{ width }} />)}
            </colgroup>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>store_mall_directory</span>
                      <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data Vendor</h3>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const absoluteIndex = (safeCurrentPage - 1) * rowsPerPage + idx
                  const rowBg = absoluteIndex % 2 === 0 ? 'white' : '#fafbfc'
                  const tdStyle = {
                    padding: '14px 16px',
                    borderBottom: '1px solid #e8edf4',
                    verticalAlign: 'middle',
                    background: rowBg,
                    color: '#334155'
                  }

                  return (
                    <tr
                      key={item.originalIndex ?? idx}
                      style={{ background: rowBg, transition: 'background 0.2s' }}
                      onMouseEnter={(e) => {
                        const children = e.currentTarget.children
                        for (let i = 0; i < children.length; i++) {
                          children[i].style.background = '#eff6ff'
                        }
                      }}
                      onMouseLeave={(e) => {
                        const children = e.currentTarget.children
                        for (let i = 0; i < children.length; i++) {
                          children[i].style.background = rowBg
                        }
                      }}
                    >
                      <td style={tdStyle}>{absoluteIndex + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                      <td style={tdStyle}>{item.bank}</td>
                      <td style={{ ...tdStyle, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#0f172a' }}>{item.no_rekening}</td>
                      <td style={{ ...tdStyle, borderRight: 'none' }}>
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
        <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Rows</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #dbe5f0', background: 'white', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', outline: 'none' }}
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
                border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#f1f5f9' : 'white', color: safeCurrentPage === 1 ? '#94a3b8' : '#475569', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
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
                border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#f1f5f9' : 'white', color: safeCurrentPage === totalPages ? '#94a3b8' : '#475569', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (safeCurrentPage !== totalPages) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' } }}
              onMouseLeave={(e) => { if (safeCurrentPage !== totalPages) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dbe5f0' } }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
