import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import DialogFrpDetail from '../../components/Dialog/DialogDetailFrp'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import { useUser } from '../../contexts/UserContext'
import { ACCESS_CHANGED_EVENT } from '../../utils/auth'
import DataTableApprovalFrp from '../../components/table/DataTableApprovalFrp'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import DialogFailAction from '../../components/Dialog/DialogFailAction'

const MOBILE_BREAKPOINT = 768

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
    : '-'
}

function DateField({ value, onChange, placeholder = 'Pilih Tanggal', style }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!inputRef.current) return
    try {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker()
        return
      }
    } catch (_) { }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onClick={openPicker}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />
      <div
        className="filter-input-element"
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          color: value ? '#1e293b' : '#94a3b8',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDate(value) : placeholder}
        </span>
      </div>
    </div>
  )
}

function FilterField({ label, icon, children }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            left: '12px',
            background: 'white',
            padding: '0 6px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#64748b',
            zIndex: 1000000,
            pointerEvents: 'none',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span
            className="material-icons-round"
            style={{
              position: 'absolute',
              left: '12px',
              color: '#64748b',
              fontSize: '18px',
              pointerEvents: 'none',
              zIndex: 1000000,
            }}
          >
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}


function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  style,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const normalizedOptions = options.map(option =>
    typeof option === 'string'
      ? { value: option, label: option, keywords: option }
      : {
        value: option.value,
        label: option.label,
        keywords: option.keywords || option.label || option.value,
      },
  )

  const selectedOption = normalizedOptions.find(option => option.value === value)
  const filteredOptions = normalizedOptions.filter(option =>
    String(option.keywords || '').toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const handleOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1, width: '100%' }}>
      <button
        type="button"
        className="select-dropdown-btn"
        onClick={() => setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          minHeight: style?.minHeight || '42px',
          boxShadow: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            flex: 1,
            color: value ? '#1e293b' : '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '12px',
          }}
        >
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1.5px solid #dbe5f0',
            borderRadius: '12px',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Cari..."
              style={{ ...style, paddingLeft: '10px', fontSize: '0.875rem', padding: '8px 10px', minHeight: 'unset' }}
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid #f8fafc',
                  background: option.value === value ? '#eff6ff' : 'white',
                  color: option.value === value ? '#1f4e8c' : '#1e293b',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: option.value === value ? 700 : 500,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApprovalFRP() {
  const { pathname } = useLocation()
  const isApprovedView = pathname === '/approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user, setUser } = useUser()
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    requester: '',
    status: '',
    division: '',
    budgetId: '',
    attachment: 'all',
  })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResultDialog, setActionResultDialog] = useState(null)
  const selectedCompany = user?.selectedCompany || ''
  const selectedDivision = user?.selectedDivision || ''

  usePageLoadingDialog(loading && !data, {
    title: 'Memuat Approval FRP',
    message: 'Sistem sedang menyiapkan daftar approval FRP.',
  })

  const requestSort = (key) => {
    if (!key) return
    setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'asc' ? 'desc' : 'asc' }))
    setCurrentPage(1)
  }

  const setFilter = (key, value) => {
    setCurrentPage(1)
    setFilters(c => ({ ...c, [key]: value }))
  }

  const handleRowsPerPage = (value) => {
    setRowsPerPage(value)
    setCurrentPage(1)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams()
    params.set('view', isApprovedView ? 'approved' : 'pending')
    params.set('page', currentPage)
    params.set('limit', rowsPerPage)
    params.set('sortBy', sortConfig.key)
    params.set('sortDir', sortConfig.direction)
    if (filters.search)    params.set('search',    filters.search)
    if (filters.date)      params.set('date',      filters.date)
    if (filters.requester) params.set('requester', filters.requester)
    if (filters.status)    params.set('status',    filters.status)
    if (filters.division)  params.set('division',  filters.division)
    fetch(`/api/data/frp-approval?${params}`, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) { window.location.href = '/'; throw new Error('Unauthorized') }
        return r.json()
      })
      .then(nextData => {
        setData(nextData)
        setUser(nextData?.meta?.user)
      })
      .catch(e => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [isApprovedView, currentPage, rowsPerPage, sortConfig.key, sortConfig.direction,
    filters.search, filters.date, filters.requester, filters.status, filters.division, refreshKey,
    selectedCompany, selectedDivision])

  useEffect(() => {
    const handler = e => { if (e.data === 'refresh') setRefreshKey(k => k + 1) }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    const handleAccessChanged = () => {
      setCurrentPage(1)
      setRefreshKey(key => key + 1)
    }

    window.addEventListener(ACCESS_CHANGED_EVENT, handleAccessChanged)
    return () => window.removeEventListener(ACCESS_CHANGED_EVENT, handleAccessChanged)
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentUser = useMemo(
    () => ({ ...(user || {}), ...(data?.meta?.user || {}) }),
    [user, data],
  )
  const requesters = data?.filters?.requesters || []
  const divisions = data?.filters?.divisions || []

  const confirmActionMeta = {
    approve: {
      eyebrow: 'Konfirmasi Approval',
      title: 'Approve FRP?',
      message: 'FRP akan disetujui.',
      confirmLabel: 'Ya, Approve',
      icon: 'check_circle',
      tone: 'approve',
    },
    reject: {
      eyebrow: 'Konfirmasi Reject',
      title: 'Reject FRP?',
      message: 'FRP akan ditolak.',
      confirmLabel: 'Ya, Reject',
      icon: 'cancel',
      tone: 'reject',
    },
    revert: {
      eyebrow: 'Konfirmasi Revert',
      title: 'Revert Status?',
      message: 'Status FRP akan dikembalikan ke draft/pending.',
      confirmLabel: 'Ya, Revert',
      icon: 'restart_alt',
      tone: 'warning',
    }
  }

  const requestAction = (request, action) => {
    setConfirmAction({ request, action })
  }

  const doAction = async (request, action) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/frp/${request.id}/${action}`, { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setConfirmAction(null)
        setSelectedRequest(null)
        if (action === 'approve') {
          setActionResultDialog({
            action,
            kind: 'success',
            title: 'Approve berhasil',
            message: 'FRP berhasil disetujui.',
            subMessage: request.frpNo ? `Nomor FRP: ${request.frpNo}` : undefined,
            rpNo: request.frpNo,
          })
        } else if (action === 'reject') {
          setActionResultDialog({
            action,
            kind: 'fail',
            title: 'Reject berhasil',
            message: 'FRP berhasil ditolak.',
            subMessage: request.frpNo ? `Nomor FRP: ${request.frpNo}` : undefined,
            rpNo: request.frpNo,
          })
        } else if (action === 'revert') {
          setActionResultDialog({
            action,
            kind: 'success',
            title: 'Revert berhasil',
            message: 'Status FRP berhasil dikembalikan.',
            subMessage: request.frpNo ? `Nomor FRP: ${request.frpNo}` : undefined,
            rpNo: request.frpNo,
          })
        } else {
          setRefreshKey(k => k + 1)
        }
      } else {
        window.alert(result.error || 'Gagal memproses data')
      }
    } catch (e) {
      window.alert(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const canApprove = Boolean(data?.canApprove)
  const isMobile = viewportWidth < MOBILE_BREAKPOINT

  const filterInput = {
    width: '100%',
    padding: '9px 12px 9px 36px',
    borderRadius: '12px',
    border: '1.5px solid #dbe5f0',
    fontSize: '13px',
    background: 'white',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1e293b',
    minHeight: '42px',
  }

  const requesterOptions = useMemo(
    () => requesters.map(requester => ({ value: requester, label: requester })),
    [requesters],
  )

  const divisionOptions = useMemo(
    () => divisions.map(division => ({ value: division, label: division })),
    [divisions],
  )

  const statusOptions = useMemo(
    () => [
      { value: 'APPROVED', label: 'APPROVED' },
      { value: 'REJECTED', label: 'REJECTED' },
    ],
    [],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, isApprovedView, rowsPerPage])

  const total = data?.pagination?.total ?? 0
  const totalPages = data?.pagination?.totalPages ?? 1
  const safeCurrentPage = data?.pagination?.page ?? currentPage
  const currentRows = data?.data || []
  const rangeStart = total === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(total, safeCurrentPage * rowsPerPage)

  useEffect(() => {
    if (data?.pagination?.page && data.pagination.page !== currentPage) {
      setCurrentPage(data.pagination.page)
    }
  }, [data?.pagination?.page, currentPage])

  return (
    <>
      <style>{`
        .filter-input-element {
          transition: all 0.2s ease-in-out;
        }
        .filter-input-element:focus, .filter-input-element:hover {
          border-color: #1e5e4d !important;
          box-shadow: 0 0 0 3px rgba(30, 94, 77, 0.15) !important;
        }
        .select-dropdown-btn {
          transition: all 0.2s ease-in-out;
        }
        .select-dropdown-btn:focus, .select-dropdown-btn:hover {
          border-color: #1e5e4d !important;
          box-shadow: 0 0 0 3px rgba(30, 94, 77, 0.15) !important;
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

      <main
        className="dashboard-main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: isMobile ? 'auto' : 'hidden',
          overflowX: 'hidden',
          minHeight: 0,
          padding: isMobile ? '12px' : undefined,
        }}
      >
        {/* Unified Table & Filter Card */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '16px',
            border: '1.5px solid #e8edf4',
            boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)',
            overflow: isMobile ? 'visible' : 'hidden',
          }}
        >
          {/* Top Filter Area (Integrated inside the card) */}
          <div
            style={{
              background: 'white',
              padding: isMobile ? '16px 12px' : '20px 24px',
              borderBottom: '1.5px solid #e8edf4',
              flexShrink: 0,
            }}
          >
            {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#e6f2f0',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#1e5e4d',
                }}>
                  <span className="material-icons-round" style={{ fontSize: '20px' }}>filter_alt</span>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                    Approval FRP
                  </h2>
                  <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    {filtered.length} data sesuai filter aktif
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={loadData}
                  title="Segarkan data"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1.5px solid #dbe5f0',
                    background: 'white',
                    color: '#475569',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.borderColor = '#cbd5e1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.borderColor = '#dbe5f0'
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                </button>
              </div>
            </div> */}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? '1fr'
                    : `repeat(${isApprovedView ? 5 : 4}, minmax(140px, 1fr))`,
                  gap: '12px',
                  flex: 1,
                  minWidth: isMobile ? '100%' : '600px',
                }}
              >
                {/* Search */}
                <FilterField label="Search" icon="search">
                  <input
                    className="filter-input-element"
                    style={filterInput}
                    placeholder="No FRP / Vendor..."
                    value={filters.search}
                    onChange={(e) => setFilter('search', e.target.value)}
                  />
                </FilterField>

                {/* Tanggal */}
                <FilterField label="Date" icon="calendar_month">
                  <DateField
                    value={filters.date}
                    onChange={(e) => setFilter('date', e.target.value)}
                    style={filterInput}
                  />
                </FilterField>

                {/* Pemohon */}
                <FilterField label="Request By" icon="person">
                  <SearchableSelect
                    value={filters.requester}
                    onChange={(v) => setFilter('requester', v)}
                    options={requesterOptions}
                    placeholder="Semua Pemohon"
                    style={filterInput}
                  />
                </FilterField>

                {/* Status (only if approved view) */}
                {isApprovedView && (
                  <FilterField label="Status" icon="rule">
                    <SearchableSelect
                      value={filters.status}
                      onChange={(v) => setFilter('status', v)}
                      options={statusOptions}
                      placeholder="Semua Status"
                      style={filterInput}
                    />
                  </FilterField>
                )}

                {/* Divisi */}
                <FilterField label="Division" icon="business">
                  <SearchableSelect
                    value={filters.division}
                    onChange={(v) => setFilter('division', v)}
                    options={divisionOptions}
                    placeholder="Semua Divisi"
                    style={filterInput}
                  />
                </FilterField>
              </div>

            </div>
          </div>
          {/* Table Container */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              overflow: 'hidden',
            }}
          >
            <DataTableApprovalFrp
              requests={currentRows}
              total={total}
              isApprovedView={isApprovedView}
              canApprove={canApprove}
              requestAction={requestAction}
              setSelectedRequest={setSelectedRequest}
              requestSort={requestSort}
              sortConfig={sortConfig}
              safeCurrentPage={safeCurrentPage}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={handleRowsPerPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              isMobile={isMobile}
            />
          </div>
        </div>
      </main>

      <DialogFrpDetail
        isOpen={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        canApprove={canApprove}
        isApprovedView={isApprovedView}
        userRole={currentUser.role}
        onApprove={(req) => setConfirmAction({ request: req, action: 'approve' })}
        onReject={(req) => setConfirmAction({ request: req, action: 'reject' })}
        onRevert={(req) => setConfirmAction({ request: req, action: 'revert' })}
      />

      <DialogConfirm
        isOpen={!!confirmAction}
        eyebrow={confirmAction ? confirmActionMeta[confirmAction.action]?.eyebrow : ''}
        title={confirmAction ? confirmActionMeta[confirmAction.action]?.title : ''}
        message={confirmAction ? confirmActionMeta[confirmAction.action]?.message : ''}
        confirmLabel={confirmAction ? confirmActionMeta[confirmAction.action]?.confirmLabel : ''}
        icon={confirmAction ? confirmActionMeta[confirmAction.action]?.icon : ''}
        tone={confirmAction ? confirmActionMeta[confirmAction.action]?.tone : 'primary'}
        isLoading={actionLoading}
        onClose={() => { if (!actionLoading) setConfirmAction(null) }}
        onConfirm={() => confirmAction && doAction(confirmAction.request, confirmAction.action)}
      >
        {confirmAction && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#1e293b' }}>{confirmAction.request.frpNo || 'Draft FRP'}</strong>
            <span style={{ color: '#64748b' }}> dari </span>
            <strong style={{ color: '#1e293b' }}>{confirmAction.request.requesterName || '-'}</strong>
          </div>
        )}
      </DialogConfirm>

      <DialogSuccesAction
        isOpen={actionResultDialog?.kind === 'success'}
        title={actionResultDialog?.title}
        message={actionResultDialog?.message}
        subMessage={actionResultDialog?.subMessage}
        rpNo={actionResultDialog?.rpNo}
        referenceLabel="Nomor FRP"
        icon={actionResultDialog?.action === 'revert' ? 'restart_alt' : 'check_circle'}
        onConfirm={() => {
          setActionResultDialog(null)
          setRefreshKey(k => k + 1)
        }}
        buttonText="Tutup"
      />

      <DialogFailAction
        isOpen={actionResultDialog?.kind === 'fail'}
        title={actionResultDialog?.title}
        message={actionResultDialog?.message}
        subMessage={actionResultDialog?.subMessage}
        rpNo={actionResultDialog?.rpNo}
        referenceLabel="Nomor FRP"
        onConfirm={() => {
          setActionResultDialog(null)
          setRefreshKey(k => k + 1)
        }}
        buttonText="Tutup"
      />
    </>
  )
}
