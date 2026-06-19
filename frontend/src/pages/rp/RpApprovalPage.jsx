import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import { useUser } from '../../contexts/UserContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import DialogFailAction from '../../components/Dialog/DialogFailAction'
import DialogCheckData from '../../components/Dialog/DialogCheckData'
import BackgroundDialog from '../../components/template/BackgroundDialog'
import DataTableRp from '../../components/table/DataTableApprovalRp.jsx'
import ButtonActionApprovalRp from '../../components/button/ButtonActionApprovalRp.jsx'
import ButtonAccessManagerRp from '../../components/button/ButtonAccessManagerRp.jsx'
import ButtonAccessStaffRp from '../../components/button/ButtonAccessStaffRp.jsx'
import FilterApprovalRp from './FilterApprovalRp.jsx'
import TabsFilterApprovalRp from './TabsFilterApprovalRp.jsx'
import { getRpApprovalMode } from '../../utils/rpApproval'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const STATUS_META = {
  waiting_manager: { label: 'waiting_manager', background: '#fef3c7', color: '#92400e' },
  division_review: { label: 'division_review', background: '#dbeafe', color: '#1d4ed8' },
  final_review: { label: 'final_review', background: '#ede9fe', color: '#6d28d9' },
  approved: { label: 'approved', background: '#bbf7d0', color: '#166534' },
  REJECTED: { label: 'REJECTED', background: '#fecaca', color: '#991b1b' },
  CREATED_FRP: { label: 'CREATED_FRP', background: '#cffafe', color: '#0e7490' },
}

const ACTION_META = {
  'manager-approve': {
    eyebrow: 'Konfirmasi Approval',
    title: 'Approve Request Purchase?',
    message: 'Request Purchase akan lanjut ke divisi pemroses.',
    confirmLabel: 'Ya, Approve',
    icon: 'check_circle',
    tone: 'approve',
  },
  'manager-reject': {
    eyebrow: 'Konfirmasi Reject',
    title: 'Reject Request Purchase?',
    message: 'Request Purchase akan ditolak dari tahap manager.',
    confirmLabel: 'Ya, Reject',
    icon: 'cancel',
    tone: 'reject',
  },
  'process-reject': {
    eyebrow: 'Konfirmasi Reject',
    title: 'Reject Dari Proses Divisi?',
    message: 'Request Purchase akan ditolak dari tahap divisi pemroses.',
    confirmLabel: 'Ya, Reject',
    icon: 'cancel',
    tone: 'reject',
  },
  'process-manager-approve': {
    eyebrow: 'Konfirmasi Final Approval',
    title: 'Final Approve Request Purchase?',
    message: 'Request Purchase akan masuk ke status approved.',
    confirmLabel: 'Ya, Final Approve',
    icon: 'verified',
    tone: 'approve',
  },
  'process-manager-reject': {
    eyebrow: 'Konfirmasi Reject',
    title: 'Reject Final Approval?',
    message: 'Request Purchase akan ditolak dari tahap final approval.',
    confirmLabel: 'Ya, Reject',
    icon: 'cancel',
    tone: 'reject',
  },
  revert: {
    eyebrow: 'Konfirmasi Revert',
    title: 'Revert Request Purchase?',
    message: 'Status RP akan dikembalikan satu langkah ke belakang.',
    confirmLabel: 'Ya, Revert',
    icon: 'restart_alt',
    tone: 'warning',
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

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

const getActionResultIcon = action => {
  if (action === 'revert') return 'restart_alt'
  if (action === 'process-manager-approve' || action === 'manager-approve') return 'check_circle'
  if (action === 'process-manager-reject' || action === 'manager-reject' || action === 'process-reject') return 'cancel'
  return action?.includes('approve') ? 'check_circle' : 'cancel'
}

const getCountBucket = status => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'waiting_manager') return 'pending'
  if (normalized === 'division_review') return 'process'
  if (normalized === 'final_review') return 'process-approval'
  if (['approved', 'rejected', 'created_frp'].includes(normalized)) return 'approved'
  return null
}

const getNextRpStatus = (currentRp, action, actualAction) => {
  const currentStatus = String(currentRp?.status || '').toLowerCase()
  const normalizedStatus = String(currentStatus || '').toLowerCase()
  const normalizedAction = String(actualAction || action || '').toLowerCase()
  const departmentClass = String(currentRp?.departmentClass || currentRp?.divisi || '').trim().toUpperCase()
  const shortFlowDepartments = new Set(['IT', 'HCGA', 'IT & HCGA'])

  if (normalizedAction === 'manager-approve') {
    if (normalizedStatus !== 'waiting_manager') return null
    return shortFlowDepartments.has(departmentClass) ? 'approved' : 'division_review'
  }
  if (normalizedAction === 'manager-reject') {
    return normalizedStatus === 'waiting_manager' ? 'REJECTED' : null
  }
  if (normalizedAction === 'process-update' || normalizedAction === 'process-direct') {
    return normalizedStatus === 'division_review' ? 'final_review' : null
  }
  if (normalizedAction === 'process-revert') {
    return normalizedStatus === 'division_review' ? 'waiting_manager' : null
  }
  if (normalizedAction === 'process-reject') {
    return normalizedStatus === 'division_review' ? 'REJECTED' : null
  }
  if (normalizedAction === 'process-manager-approve') {
    return normalizedStatus === 'final_review' ? 'approved' : null
  }
  if (normalizedAction === 'process-manager-reject') {
    return normalizedStatus === 'final_review' ? 'REJECTED' : null
  }
  if (normalizedAction === 'process-manager-revert') {
    return normalizedStatus === 'final_review' ? 'division_review' : null
  }
  if (normalizedAction === 'revert-approved') {
    if (normalizedStatus !== 'approved') return null
    return currentRp?.canRevertTo || null
  }
  return null
}

const adjustCounts = (counts = {}, fromStatus, toStatus) => {
  const fromBucket = getCountBucket(fromStatus)
  const toBucket = getCountBucket(toStatus)
  if (!fromBucket || !toBucket || fromBucket === toBucket) {
    return counts
  }

  return {
    ...counts,
    [fromBucket]: Math.max(0, Number(counts[fromBucket] || 0) - 1),
    [toBucket]: Number(counts[toBucket] || 0) + 1,
  }
}

const printRpPreview = rpId => {
  if (!rpId || typeof window === 'undefined') return
  window.open(`/api/rp/${rpId}/preview`, '_blank')
}

const getUserJobLevelRank = user => {
  const assignmentRank = Number(user?.allAssignments?.[0]?.job_level_rank || 0)
  return Number(user?.jobLevelRank || user?.job_level_rank || assignmentRank || 0)
}

const PROCESS_ACCESS_DIVISIONS = new Set(['IT', 'HCGA'])

const normalizeDivision = value => String(value || '').trim().toUpperCase()
const collectUserDivisions = user => {
  const divisions = []
  const seen = new Set()
  const addDivision = value => {
    const normalized = normalizeDivision(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    divisions.push(normalized)
  }

  addDivision(user?.departmentClass)
  addDivision(user?.selectedDivision)
  addDivision(user?.departmentName)

  ;(user?.allAssignments || []).forEach((assignment) => {
    addDivision(assignment?.dept_class || assignment?.departmentClass || assignment?.class)
    addDivision(assignment?.dept_name || assignment?.departmentName || assignment?.department_name)
    ;(assignment?.classes || []).forEach(addDivision)
  })

  ;(user?.departments || []).forEach((department) => {
    addDivision(department?.class)
    addDivision(department?.name)
  })

  return divisions
}

export default function RpApprovalPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isApprovedView = pathname === '/rp-approved'
  const { setUser } = useUser()
  const [data, setData] = useState(null)
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionResultDialog, setActionResultDialog] = useState(null)
  const [checkDataRequest, setCheckDataRequest] = useState(null)
  const [tab, setTab] = useState(isApprovedView ? 'approved' : 'pending')
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    creator: '',
    status: '',
    division: '',
    processor: '',
  })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false)
  const tabDropdownRef = useRef(null)
  const currentUser = data?.user || null
  const approvalMode = getRpApprovalMode(currentUser)
  const currentUserJobLevelRank = getUserJobLevelRank(currentUser)
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  usePageLoadingDialog(loading && !data, {
    title: 'Memuat Approval RP',
    message: 'Sistem sedang menyiapkan daftar approval Request Purchase.',
  })

  const loadData = (view = tab, options = {}) => {
    const { silent = false } = options

    if (!silent) {
      setLoading(true)
    }

    fetch(`/api/data/rp-approval?view=${view}`)
      .then(response => {
        if (!response.ok) {
          window.location.href = '/'
          throw new Error('Unauthorized')
        }
        return response.json()
      })
      .then(d => {
        setData(d)
        setCounts(d?.counts || {})
        setUser(d?.user)
        setSelected(currentSelected => {
          if (!currentSelected) return currentSelected

          const nextSelected = (d?.requests || []).find(
            request => String(request.id) === String(currentSelected.id),
          )

          return nextSelected || null
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!silent) {
          setLoading(false)
        }
      })
  }

  useEffect(() => {
    const nextTab = isApprovedView ? 'approved' : 'pending'
    setTab(nextTab)
  }, [isApprovedView])

  useEffect(() => {
    const ctrl = new AbortController()
    const params = new URLSearchParams()
    params.set('view', tab)
    params.set('page', currentPage)
    params.set('limit', rowsPerPage)
    params.set('sortBy', sortConfig.key)
    params.set('sortDir', sortConfig.direction)
    if (filters.search)    params.set('search',    filters.search)
    if (filters.date)      params.set('date',      filters.date)
    if (filters.creator)   params.set('creator',   filters.creator)
    if (filters.status)    params.set('status',    filters.status)
    if (filters.division)  params.set('division',  filters.division)
    if (filters.processor) params.set('processor', filters.processor)

    setLoading(true)
    fetch(`/api/data/rp-approval?${params}`, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) { window.location.href = '/'; throw new Error('Unauthorized') }
        return r.json()
      })
      .then(d => {
        setData(d)
        setCounts(d?.counts || {})
        setUser(d?.user)
      })
      .catch(err => { if (err.name !== 'AbortError') {} })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [tab, filters, currentPage, rowsPerPage, sortConfig, refreshKey])

  useEffect(() => {
    if (pathname === '/rp-approval') return
    if (pathname.startsWith('/rp-approval/')) {
      navigate('/rp-approval', { replace: true })
    }
  }, [navigate, pathname])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, rowsPerPage, tab])

  useEffect(() => {
    if (!confirmAction) return undefined

    const handleKeyDown = event => {
      if (event.key === 'Escape' && !actionLoading) {
        setConfirmAction(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmAction, actionLoading])

  useEffect(() => {
    if (!tabDropdownOpen) return undefined
    const handleOutside = e => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(e.target)) setTabDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [tabDropdownOpen])

  const requestSort = key => {
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const requestAction = (rp, action, body = {}) => {
    setConfirmAction({ rp, action, body })
  }

  const openCheckData = rp => {
    setCheckDataRequest(rp)
  }

  const doAction = async (id, action, body = {}) => {
    setActionLoading(true)
    const currentRp = confirmAction?.rp
    let actualAction = action
    if (action === 'revert' && currentRp) {
        if (currentRp.status === 'division_review') {
            actualAction = 'process-revert'
        } else if (currentRp.status === 'final_review') {
            actualAction = 'process-manager-revert'
        } else if (currentRp.status === 'approved') {
            actualAction = 'revert-approved'
        }
    }
    try {
      const response = await fetch(`/api/rp/${id}/${actualAction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (result.success) {
        const nextStatus = getNextRpStatus(currentRp, action, actualAction)
        if (nextStatus) {
          setCounts(prevCounts => adjustCounts(prevCounts || {}, currentRp?.status, nextStatus))
        }
        setConfirmAction(null)
        setSelected(null)
        loadData(tab, { silent: true })
        setActionResultDialog({
          kind: 'success',
          action,
          icon: getActionResultIcon(action),
          title:
            action === 'revert'
              ? 'Revert berhasil'
              : action.includes('approve')
                ? 'Approve berhasil'
                : 'Reject berhasil',
          message:
            action === 'revert'
              ? 'Status Request Purchase berhasil dikembalikan.'
              : action.includes('approve')
                ? 'Request Purchase berhasil disetujui.'
                : 'Request Purchase berhasil ditolak.',
          subMessage: `Nomor RP: ${currentRp?.rpNo || '-'}`,
          rpNo: currentRp?.rpNo,
        })
      } else {
        setConfirmAction(null)
        setActionResultDialog({
          kind: 'fail',
          action,
          icon: getActionResultIcon(action),
          title: 'Gagal memproses data',
          message: result.error || 'Perubahan data tidak dapat disimpan.',
          subMessage: `Nomor RP: ${currentRp?.rpNo || '-'}`,
          rpNo: currentRp?.rpNo,
        })
      }
    } catch (error) {
      setConfirmAction(null)
      setActionResultDialog({
        kind: 'fail',
        action,
        icon: getActionResultIcon(action),
        title: 'Gagal memproses data',
        message: error.message || 'Terjadi kesalahan saat memproses data.',
        subMessage: `Nomor RP: ${currentRp?.rpNo || '-'}`,
        rpNo: currentRp?.rpNo,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const D = data || {}
  const user = currentUser || {}
  const userJobLevelRank = getUserJobLevelRank(user)
  const userJobLevelName = String(user?.selectedJobLevel || user?.jobLevelName || '').toLowerCase()
  const isAdmin = user?.role === 'administrator'
  const userDivision = user.selectedDivision || ''
  const userDivisions = collectUserDivisions(user)
  const canTakeApprovalAction = userJobLevelRank >= 2 && !/\bstaff\b/.test(userJobLevelName)
  const isProcessDivision = useCallback(
    division => {
      const normalizedTargetDivision = normalizeDivision(division)
      if (!normalizedTargetDivision) return false

      return userDivisions.some(
        currentDivision =>
          PROCESS_ACCESS_DIVISIONS.has(currentDivision) &&
          currentDivision === normalizedTargetDivision,
      )
    },
    [userDivisions],
  )

  const pagination = D.pagination || { total: 0, page: 1, limit: rowsPerPage, totalPages: 1 }
  const totalPages = pagination.totalPages
  const safeCurrentPage = pagination.page
  const totalCount = pagination.total
  const rangeStart = totalCount === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(totalCount, safeCurrentPage * rowsPerPage)

  const filterOptions = D.filterOptions || {}
  const creatorOptions   = (filterOptions.creators   || []).map(v => ({ value: v, label: v }))
  const divisionOptions  = (filterOptions.divisions  || []).map(v => ({ value: v, label: v }))
  const processorOptions = (filterOptions.processors || []).map(v => ({ value: v, label: v }))
  const statusOptions    = Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))

  const detailValueBox = {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid #d7e0ea',
    background: '#f8fafc',
    color: '#334155',
    lineHeight: 1.5,
    minHeight: '42px',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
  }
  const renderStatus = status => {
    const meta = STATUS_META[status] || { label: status || '-', background: '#e2e8f0', color: '#475569' }
    return (
      <span
        style={{
          alignSelf: 'flex-start',
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.03em',
          background: meta.background,
          color: meta.color,
          whiteSpace: 'nowrap',
        }}
      >
        {meta.label}
      </span>
    )
  }

  const renderRowActions = (rp, options = {}) => {
    return (
      <ButtonActionApprovalRp
        rp={rp}
        user={user}
        userDivision={userDivision}
        isProcessDivision={isProcessDivision}
        actionLoading={actionLoading}
        requestAction={requestAction}
        setSelected={setSelected}
        onCheckData={openCheckData}
        mode={approvalMode}
        options={options}
      />
    )
  }

  const renderDetail = () => {
    if (!selected) return null
    const items = selected.items || []
    const total = selected.total ?? 0

    // Determine what actions should be rendered in the footer
    const canProcess =
      selected.status === 'division_review' &&
      (isAdmin || isProcessDivision(selected.diprosesOleh))
    const canCreateFrp =
      selected.status === 'approved' &&
      (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

    return (
      <div className="dashboard-popup-overlay" role="presentation" onClick={() => setSelected(null)}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          /* Modern premium styles for inputs and panels */
          .dialog-section-premium {
            transition: all 0.2s ease-in-out !important;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          }
          .dialog-section-premium:hover {
            border-color: #cbd5e1 !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04) !important;
          }

          /* Footer buttons styling */
          .btn-dialog {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            min-width: 120px !important;
            border-radius: 10px !important;
            padding: 8px 18px !important;
            font-weight: 600 !important;
            font-size: 0.8rem !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            border: none !important;
            outline: none !important;
            font-family: inherit !important;
            box-sizing: border-box !important;
          }
          .btn-dialog:hover {
            transform: translateY(-2px) !important;
          }
          .btn-dialog:active {
            transform: translateY(0) !important;
          }
          
          .btn-dialog-approve {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3) !important;
          }
          .btn-dialog-approve:hover {
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45) !important;
          }

          .btn-dialog-reject {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3) !important;
          }
          .btn-dialog-reject:hover {
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45) !important;
          }

          .btn-dialog-neutral {
            background: #ffffff !important;
            color: #334155 !important;
            border: 1.5px solid #cbd5e1 !important;
          }
          .btn-dialog-neutral:hover {
            background: #f8fafc !important;
            border-color: #94a3b8 !important;
            box-shadow: 0 4px 12px rgba(148, 163, 184, 0.15) !important;
          }

          .btn-dialog-primary {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3) !important;
          }
          .btn-dialog-primary:hover {
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45) !important;
          }

          .btn-dialog-warning {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3) !important;
          }
          .btn-dialog-warning:hover {
            box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45) !important;
          }

          .btn-dialog-close {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2) !important;
          }
          .btn-dialog-close:hover {
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3) !important;
          }
        `}</style>
        <div
          className="dashboard-popup dashboard-popup--frp-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rp-detail-title"
          onClick={event => event.stopPropagation()}
          style={{ height: 'auto', maxHeight: '85vh', width: 'min(1180px, calc(100vw - 48px))', margin: 'auto', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        >
          <BackgroundDialog />
          <div className="dashboard-popup__header" style={{ padding: '14px 24px' }}>
            <div>
              <p className="dashboard-popup__eyebrow">{tab === 'approved' ? 'Completed Request' : 'Request Purchase'}</p>
              <h2 className="dashboard-popup__title" id="rp-detail-title">{selected.rpNo || 'Draft RP'}</h2>
            </div>
            <div className="frp-detail-header-actions">
              <button type="button" className="dashboard-popup__close" aria-label="Tutup dialog" onClick={() => setSelected(null)}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          </div>
          <div className="dashboard-popup__body dashboard-popup__body--frp-detail" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 24px 8px 24px' }}>
            <div className="frp-detail-content hide-scrollbar" style={{
              padding: '4px 8px',
              overflowY: 'auto',
              maxHeight: 'calc(85vh - 160px)',
              scrollBehavior: 'smooth',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
            }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: '0.75rem' }}>
                  {[
                    ['Company', selected.companyName],
                    ['Divisi & Proses', <><div style={{ marginBottom: '2px', fontWeight: 600 }}>{selected.divisi || '-'}</div><div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>Process by {selected.diprosesOleh || '-'}</div></>],
                    ['Class', selected.classClass || selected.class],
                    ['Dibuat Oleh', selected.dibuatOleh],
                    ['Kategori', selected.kategoriPembelian],
                    ['Tanggal Dibutuhkan', formatDate(selected.requiredDate || selected.tanggalDibutuhkan)],
                    ['Vendor Suggestion', selected.vendorSuggestion],
                    ['PIC Penerima', selected.receiverPic || selected.picPenerima],
                  ].map(([label, value]) => (
                    <div key={label} className="dialog-section-premium" style={{ marginBottom: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', marginBottom: '4px' }}>{label}</div>
                      <div style={{ ...detailValueBox, border: 'none', background: 'transparent', padding: 0, minHeight: 'auto', boxShadow: 'none' }}>{value || '-'}</div>
                    </div>
                  ))}
                </div>

                <div className="dialog-section-premium">
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', marginBottom: '4px' }}>Deskripsi</div>
                  <div style={{ ...detailValueBox, border: 'none', background: 'transparent', padding: 0, minHeight: 'auto', boxShadow: 'none' }}>{selected.description || selected.deskripsi || '-'}</div>
                </div>

                {selected.processChanges?.changes?.length > 0 && (
                  <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {selected.processChanges.changes.map((change, index) => (
                        <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                          <strong>{change.field}:</strong>{' '}
                          <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                          <span style={{ color: '#64748b' }}> -&gt; </span>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                      Modified by: {selected.processUpdatedBy || '-'} {selected.processUpdatedAt ? `(${formatDate(selected.processUpdatedAt)})` : ''}
                    </div>
                  </div>
                )}

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: 'white' }} className="dialog-section-premium">
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em', marginBottom: '8px' }}>Detail Item</div>
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '760px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['No', 'Item Group', 'Memo', 'Link', 'Qty', 'Est. Value', 'Subtotal'].map(header => (
                            <th key={header} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const subtotal = parseNumber(item.qty) * parseNumber(item.estimatedValue)
                          return (
                            <tr key={`${item.budgetId}-${index}`}>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{index + 1}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#334155' }}>{item.budgetId || '-'}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{item.memo || '-'}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                {item.linkPembelian ? (
                                  <button
                                    type="button"
                                    onClick={() => window.open(normalizeExternalUrl(item.linkPembelian), '_blank', 'noopener,noreferrer')}
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
                                ) : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#334155' }}>{item.qty || '-'}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#475569' }}>{formatCurrency(item.estimatedValue)}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(subtotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0', marginTop: '8px', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '3px' }}>Total Estimated</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'monospace' }}>{formatCurrency(total)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Real fixed dialog footer containing all action buttons */}
          <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1, padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['approved', 'CREATED_FRP'].includes(selected.status) && (
              <>
                <button type="button" onClick={() => window.open(`/api/rp/${selected.id}/preview`, '_blank')} className="btn-dialog btn-dialog-neutral">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span>
                  Preview
                </button>
                <button type="button" onClick={() => printRpPreview(selected.id)} className="btn-dialog btn-dialog-neutral">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>print</span>
                  Print PDF
                </button>
              </>
            )}

            {approvalMode === 'manager' ? (
            <ButtonAccessManagerRp
              rp={selected}
                user={user}
              userJobLevelRank={userJobLevelRank}
              canTakeApprovalAction={canTakeApprovalAction}
              actionLoading={actionLoading}
              requestAction={requestAction}
              setSelected={setSelected}
              showActions={true}
              canProcessThisRp={isAdmin || isProcessDivision(selected.diprosesOleh)}
              />
            ) : (
              <ButtonAccessStaffRp
                rp={selected}
                userDivision={userDivision}
                actionLoading={actionLoading}
                requestAction={requestAction}
                onCheckData={openCheckData}
                setSelected={setSelected}
                showActions={true}
                showDetail={true}
                showRevert={true}
                isStaff={userJobLevelRank === 1}
                canProcessThisRp={isAdmin || isProcessDivision(selected.diprosesOleh)}
              />
            )}

            {canProcess && (
              <>
                <button type="button" onClick={() => openCheckData(selected)} className="btn-dialog btn-dialog-warning">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>fact_check</span>
                  Check Data
                </button>
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'process-reject')} className="btn-dialog btn-dialog-reject">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>cancel</span>
                  Reject
                </button>
              </>
            )}

            {!canTakeApprovalAction && userJobLevelRank > 1 && (selected.status === 'waiting_manager' || selected.status === 'final_review') && (
              <button type="button" onClick={() => openCheckData(selected)} className="btn-dialog btn-dialog-warning">
                <span className="material-icons-round" style={{ fontSize: '18px' }}>fact_check</span>
                Check Data
              </button>
            )}

            {canCreateFrp && (
              <button type="button" onClick={() => navigate(`/frp?fromRp=${selected.id}`)} className="btn-dialog btn-dialog-primary">
                <span className="material-icons-round" style={{ fontSize: '18px' }}>receipt_long</span>
                Ke FRP
              </button>
            )}

            {selected.canRevert && (
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'revert')} className="btn-dialog btn-dialog-warning">
                    <span className="material-icons-round" style={{ fontSize: '18px' }}>undo</span>
                    Revert
                </button>
            )}

            <button type="button" onClick={() => setSelected(null)} className="btn-dialog btn-dialog-close">
              <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)', border: '1.5px solid #e8edf4', overflow: 'hidden' }}>
          <FilterApprovalRp
            filters={filters}
            setFilters={setFilters}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            creatorOptions={creatorOptions}
            statusOptions={statusOptions}
            divisionOptions={divisionOptions}
            processorOptions={processorOptions}
            isMobile={isMobile}
            filteredCount={totalCount}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />

          {/* TABS INSIDE CARD, BELOW FILTER, ABOVE TABLE */}
          <TabsFilterApprovalRp
            isMobile={isMobile}
            tab={tab}
            setTab={setTab}
            counts={Object.keys(counts || {}).length > 0 ? counts : (D.counts || {})}
            tabDropdownOpen={tabDropdownOpen}
            setTabDropdownOpen={setTabDropdownOpen}
            tabDropdownRef={tabDropdownRef}
          />

          <DataTableRp
            tab={tab}
            approvalMode={approvalMode}
            loading={loading}
            isMobile={isMobile}
            paginated={D.requests || []}
            total={totalCount}
            safeCurrentPage={safeCurrentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setCurrentPage={setCurrentPage}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            sortConfig={sortConfig}
            requestSort={requestSort}
            renderRowActions={renderRowActions}
            setSelected={setSelected}
            calcTotal={rp => rp.total ?? 0}
          />
        </div>
      </main>
      {renderDetail()}
      <DialogCheckData
        isOpen={!!checkDataRequest}
        request={checkDataRequest}
        onClose={() => setCheckDataRequest(null)}
        onSaved={() => {
          loadData(tab, { silent: true })
        }}
      />
      <DialogConfirm
        isOpen={!!confirmAction}
        eyebrow={confirmAction ? (ACTION_META[confirmAction.action]?.eyebrow || 'Konfirmasi') : ''}
        title={confirmAction ? (ACTION_META[confirmAction.action]?.title || 'Lanjutkan Aksi?') : ''}
        message={confirmAction ? (ACTION_META[confirmAction.action]?.message || 'Aksi ini akan diproses untuk Request Purchase terpilih.') : ''}
        confirmLabel={confirmAction ? (ACTION_META[confirmAction.action]?.confirmLabel || 'Ya, Lanjutkan') : ''}
        icon={confirmAction ? (ACTION_META[confirmAction.action]?.icon || 'help') : ''}
        tone={confirmAction ? (ACTION_META[confirmAction.action]?.tone || 'primary') : 'primary'}
        isLoading={actionLoading}
        onClose={() => { if (!actionLoading) setConfirmAction(null) }}
        onConfirm={() => confirmAction && doAction(confirmAction.rp.id, confirmAction.action, confirmAction.body)}
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
            <strong style={{ color: '#1e293b' }}>{confirmAction.rp.rpNo || 'Draft RP'}</strong>
            <span style={{ color: '#64748b' }}> dari </span>
            <strong style={{ color: '#1e293b' }}>{confirmAction.rp.dibuatOleh || '-'}</strong>
          </div>
        )}
      </DialogConfirm>

      <DialogSuccesAction
        isOpen={actionResultDialog?.kind === 'success'}
        title={actionResultDialog?.title}
        message={actionResultDialog?.message}
        subMessage={actionResultDialog?.subMessage}
        rpNo={actionResultDialog?.rpNo}
        referenceLabel="Nomor RP"
        icon={actionResultDialog?.icon || getActionResultIcon(actionResultDialog?.action)}
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
        referenceLabel="Nomor RP"
        icon={actionResultDialog?.icon || getActionResultIcon(actionResultDialog?.action)}
        onConfirm={() => {
          setActionResultDialog(null)
        }}
        buttonText="Tutup"
      />
    </>
  )
}
