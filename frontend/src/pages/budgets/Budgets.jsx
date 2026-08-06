import { useEffect, useState, useMemo } from 'react'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'

function formatCurrency(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value))
    : '-'
}

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '2px solid #e2e8f0',
}

const tdStyle = {
  padding: '14px 16px',
  fontSize: '13px',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
}

export default function Budgets() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch('/api/budgets')
      .then(res => {
        if (!res.ok) throw new Error('Gagal memuat data anggaran')
        return res.json()
      })
      .then(json => {
        const list = Array.isArray(json) ? json : (json.data || json.budgets || json.requests || [])
        setData(list)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const departments = useMemo(() => {
    const deps = data.map(item => item.departmentName || item.department).filter(Boolean)
    return [...new Set(deps)].sort()
  }, [data])

  const filteredData = useMemo(() => {
    if (!departmentFilter) return data
    return data.filter(item => (item.departmentName || item.department) === departmentFilter)
  }, [data, departmentFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [departmentFilter, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage
    return filteredData.slice(start, start + rowsPerPage)
  }, [filteredData, rowsPerPage, safeCurrentPage])

  const rangeStart = filteredData.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filteredData.length, safeCurrentPage * rowsPerPage)

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
            background: i === safeCurrentPage ? '#f97316' : 'white', // Using a distinct color for Budget page
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

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '1.5rem' }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#fff7ed',
                display: 'grid',
                placeItems: 'center',
                color: '#c2410c',
              }}>
                <span className="material-icons-round" style={{ fontSize: '20px' }}>account_balance_wallet</span>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Data Anggaran (Budgets)</h2>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Total {filteredData.length} data ditemukan
                </p>
              </div>
            </div>

            <div style={{ minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>
                Filter Departement
              </label>
              <SearchableSelect
                value={departmentFilter}
                onChange={setDepartmentFilter}
                options={departments}
                placeholder="Semua Departement"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #d7e0ea',
                  fontSize: '0.9rem',
                  background: 'white',
                  color: '#1e293b'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span className="material-icons-round" style={{ fontSize: '32px', opacity: 0.5, animation: 'spin 1s linear infinite' }}>autorenew</span>
              <p style={{ margin: 0 }}>Memuat data anggaran...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span className="material-icons-round" style={{ fontSize: '32px' }}>error_outline</span>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span className="material-icons-round" style={{ fontSize: '48px', opacity: 0.3 }}>inbox</span>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>Belum ada data anggaran</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                <tr>
                  <th style={{...thStyle, width: '4%'}}>No</th>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Project Name</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Used</th>
                  <th style={thStyle}>Remaining</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Timestamps</th>
                  <th style={thStyle}>Index</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, i) => (
                  <tr key={item.id || i} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{...tdStyle, color: '#94a3b8'}}>{i + 1}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.id}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.departmentName || '-'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        ID: {item.departmentId} | Code: {item.departmentCode} | Class: {item.departmentClass}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: '#334155', maxWidth: '200px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {item.projectName || '-'}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        border: '1px solid #e2e8f0'
                      }}>
                        {item.budgetType || '-'}
                      </span>
                    </td>
                    <td style={{...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: '#0f172a'}}>{formatCurrency(item.budgetAmount)}</td>
                    <td style={{...tdStyle, fontFamily: 'monospace', color: '#ef4444'}}>{formatCurrency(item.budgetUsed)}</td>
                    <td style={{...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: '#10b981'}}>{formatCurrency(item.budgetRemaining)}</td>
                    <td style={tdStyle}>
                      {item.isActive !== undefined ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: item.isActive ? '#dcfce7' : '#fee2e2',
                          color: item.isActive ? '#166534' : '#991b1b',
                          border: `1px solid ${item.isActive ? '#bbf7d0' : '#fecaca'}`
                        }}>
                          <span className="material-icons-round" style={{ fontSize: '14px' }}>
                            {item.isActive ? 'check_circle' : 'cancel'}
                          </span>
                          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        <span style={{ fontWeight: 600 }}>Created:</span><br/>{formatDate(item.createdAt)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        <span style={{ fontWeight: 600 }}>Updated:</span><br/>{formatDate(item.updatedAt)}
                      </div>
                    </td>
                    <td style={{...tdStyle, color: '#94a3b8', fontSize: '12px'}}>{item.originalIndex ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        {filteredData.length > 0 && (
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
            {/* Left: Row Selector & Data Range info */}
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
                Menampilkan {rangeStart}-{rangeEnd} dari {filteredData.length} data
              </span>
            </div>

            {/* Right: Pagination buttons */}
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
    </main>
  )
}