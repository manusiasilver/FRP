import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import DialogFrpDetail from '../components/Dialog/DialogFrpDetail'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

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

export default function ApprovalPage() {
  const { pathname } = useLocation()
  const isApprovedView = pathname === '/approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    requester: '',
    status: '',
    division: '',
  })

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

    return data.requests.filter((request) => {
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
  }, [data, filters])

  const doAction = async (id, action) => {
    const response = await fetch(`/api/frp/${id}/${action}`, { method: 'POST' })
    const result = await response.json()

    if (result.success) {
      loadData()
    }
  }

  const user = data?.user || {}
  const statusColors = {
    PENDING: { background: '#fef08a', color: '#854d0e' },
    APPROVED: { background: '#bbf7d0', color: '#166534' },
    REJECTED: { background: '#fecaca', color: '#991b1b' },
  }
  const filterInput = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '13px',
    background: 'white',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  }
  const detailStickyRight = 0
  const actionStickyRight = data?.canApprove ? 118 : 0

  return (
    <>
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          userName={user.fullName || 'User'}
          userRole={user.selectedJobLevel || user.role || 'Staff'}
          userIsAdmin={user.role === 'administrator'}
          allAssignments={user.allAssignments || []}
          onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        />

        <div className="dashboard-stage">
          <Header title="Form Request Payment" />

          <main
            className="dashboard-main"
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
          >
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
                Memuat data...
              </div>
            )}
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr',
                  gap: '15px',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '6px',
                    }}
                  >
                    Search
                  </label>
                  <input
                    style={filterInput}
                    placeholder="Cari No FRP / Vendor..."
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, search: event.target.value }))
                    }
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '6px',
                    }}
                  >
                    Tanggal
                  </label>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 1,
                      }}
                      value={filters.date}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, date: event.target.value }))
                      }
                    />

                    <div
                      style={{
                        ...filterInput,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{ color: filters.date ? '#1e293b' : '#94a3b8' }}>
                        {filters.date ? formatDate(filters.date) : 'Pilih Tanggal'}
                      </span>
                      {filters.date ? (
                        <span
                          onClick={(event) => {
                            event.stopPropagation()
                            setFilters((current) => ({ ...current, date: '' }))
                          }}
                          style={{
                            pointerEvents: 'all',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            fontSize: '14px',
                            lineHeight: 1,
                          }}
                        >
                          x
                        </span>
                      ) : (
                        <span
                          className="material-icons-round"
                          style={{ fontSize: '16px', color: '#94a3b8' }}
                        >
                          calendar_today
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '6px',
                    }}
                  >
                    Pemohon
                  </label>
                  <input
                    style={filterInput}
                    placeholder="Nama Pemohon..."
                    value={filters.requester}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, requester: event.target.value }))
                    }
                  />
                </div>

                {isApprovedView ? (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#64748b',
                        marginBottom: '6px',
                      }}
                    >
                      Status
                    </label>
                    <select
                      style={filterInput}
                      value={filters.status}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, status: event.target.value }))
                      }
                    >
                      <option value="">Semua</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                ) : (
                  <div />
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '6px',
                    }}
                  >
                    Divisi
                  </label>
                  <select
                    style={filterInput}
                    value={filters.division}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, division: event.target.value }))
                    }
                  >
                    <option value="">Semua Divisi</option>
                    {divisions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                flex: 1,
                minHeight: 0,
              }}
            >
              {filtered.length > 0 ? (
                <div
                  style={{
                    height: '100%',
                    maxHeight: 'calc(100vh - 280px)',
                    overflowX: 'auto',
                    overflowY: 'auto',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          'No FRP',
                          'Tanggal',
                          'Pemohon',
                          'Vendor',
                          'Memo',
                          'Keterangan',
                          'Divisi',
                          'Total',
                          ...(isApprovedView ? ['Approved By'] : []),
                          'Status',
                          ...(data?.canApprove ? ['Aksi'] : []),
                          'Detail',
                        ].map((header) => (
                          <th
                            key={header}
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 10,
                              padding: '10px 14px',
                              textAlign: 'left',
                              borderBottom: '2px solid #e2e8f0',
                              color: '#475569',
                              fontWeight: 600,
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              background: 'white',
                              boxShadow: '0 1px 0 #e2e8f0',
                              ...(header === 'Detail'
                                ? { right: detailStickyRight, zIndex: 12, boxShadow: '-1px 0 0 #e2e8f0' }
                                : {}),
                              ...(header === 'Aksi'
                                ? { right: actionStickyRight, zIndex: 11, boxShadow: '-1px 0 0 #e2e8f0' }
                                : {}),
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((request) => {
                        const total = calcTotal(request)
                        const statusStyle = statusColors[request.status] || {}

                        return (
                          <tr
                            key={request.id}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.background = '#f8fafc'
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.background = ''
                            }}
                          >
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              <strong>{request.frpNo}</strong>
                            </td>
                            <td
                              style={{
                                padding: '12px 14px',
                                borderBottom: '1px solid #f1f5f9',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatDate(request.tanggalFrp)}
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              {request.dimintaOleh}
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              {request.vendor}
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              <div
                                style={{
                                  maxWidth: '140px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {request.items?.[0]?.memo || '-'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              <div
                                style={{
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {request.keteranganFrp || '-'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              {request.divisi}
                            </td>
                            <td
                              style={{
                                padding: '12px 14px',
                                borderBottom: '1px solid #f1f5f9',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatCurrency(total)}
                            </td>
                            {isApprovedView ? (
                              <td
                                style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}
                              >
                                {request.approvedBy || '-'}
                              </td>
                            ) : null}
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  ...statusStyle,
                                }}
                              >
                                {request.status}
                              </span>
                            </td>
                            {data?.canApprove ? (
                              <td
                                style={{
                                  position: 'sticky',
                                  right: actionStickyRight,
                                  zIndex: 4,
                                  padding: '12px 14px',
                                  borderBottom: '1px solid #f1f5f9',
                                  whiteSpace: 'nowrap',
                                  background: 'white',
                                  boxShadow: '-1px 0 0 #e2e8f0',
                                }}
                              >
                                {!isApprovedView ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => doAction(request.id, 'approve')}
                                      style={{
                                        background: '#dcfce7',
                                        color: '#16a34a',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        marginRight: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => doAction(request.id, 'reject')}
                                      style={{
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => doAction(request.id, 'revert')}
                                    style={{
                                      background: '#fef9c3',
                                      color: '#854d0e',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: 700,
                                      fontSize: '12px',
                                    }}
                                  >
                                    Revert
                                  </button>
                                )}
                              </td>
                            ) : null}
                            <td
                              style={{
                                position: 'sticky',
                                right: detailStickyRight,
                                zIndex: 5,
                                padding: '12px 14px',
                                borderBottom: '1px solid #f1f5f9',
                                whiteSpace: 'nowrap',
                                background: 'white',
                                boxShadow: '-1px 0 0 #e2e8f0',
                              }}
                            >
                              <button
                                type="button"
                                className="dashboard-popup__button dashboard-popup__button--secondary"
                                style={{ minWidth: 'auto', padding: '8px 12px' }}
                                onClick={() => setSelectedRequest(request)}
                              >
                                Lihat Detail
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
                  <span
                    className="material-icons-round"
                    style={{ fontSize: '48px', display: 'block', marginBottom: '1rem' }}
                  >
                    task
                  </span>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#64748b' }}>Belum Ada Data</h3>
                </div>
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
