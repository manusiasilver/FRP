import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePageLoadingDialog } from '../contexts/PageLoadingContext'
import { useUser } from '../contexts/UserContext'
import DialogChangeAccess from '../components/Dialog/DialogChangeAccess.jsx'

const ACCESS_ROUTE_PATHS = new Set(['/select-company', '/select-division'])

const getCompanyNameFromDepartment = (department, fallbackCompany = '') => String(
  department?.companyName ||
  department?.company ||
  fallbackCompany ||
  '',
).trim()

const normalizeDepartmentAccess = (department, fallbackCompany = '', fallbackJobLevel = '', fallbackJobLevelRank = null, index = 0) => {
  const companyName = getCompanyNameFromDepartment(department, fallbackCompany)
  const className = String(
    department?.class ||
    department?.dept_class ||
    department?.departmentClass ||
    department?.name ||
    '',
  ).trim()
  const jobLevel = department?.jobLevel || department?.job_level_name || fallbackJobLevel || ''
  const jobLevelRank = department?.jobLevelRank ?? department?.job_level_rank ?? fallbackJobLevelRank ?? null
  const label = department?.label || (className && companyName ? `${companyName} - ${className}` : (companyName || className || '-'))

  return {
    ...department,
    originalIndex: department?.originalIndex ?? department?.id ?? index,
    class: className,
    name: companyName,
    jobLevel,
    jobLevelRank,
    label,
  }
}

const getDivisionOptionsFromUserInfo = (userInfo, options = {}) => {
  const { includeAllCompanies = false } = options
  const selectedCompany = String(userInfo?.selectedCompany || '').trim()
  const fallbackJobLevel = userInfo?.selectedJobLevel || ''
  const fallbackJobLevelRank = userInfo?.jobLevelRank || null
  const departments = Array.isArray(userInfo?.departments) ? userInfo.departments : []

  const filteredDepartments = selectedCompany && !includeAllCompanies
    ? departments.filter((department) => getCompanyNameFromDepartment(department, selectedCompany) === selectedCompany)
    : departments

  const divisions = filteredDepartments.map((department, index) => normalizeDepartmentAccess(
    department,
    selectedCompany,
    fallbackJobLevel,
    fallbackJobLevelRank,
    index,
  ))

  const optionMap = new Map(divisions.map((division) => [`${division.name}::${division.class}`, division]))

  return [...optionMap.values()]
}

const getCompanyOptionsFromUserInfo = (userInfo) => {
  const departments = Array.isArray(userInfo?.departments) ? userInfo.departments : []
  const optionMap = new Map()

  const addOption = (department) => {
    const name = getCompanyNameFromDepartment(department, userInfo?.selectedCompany)

    if (!name || optionMap.has(name)) return

    optionMap.set(name, {
      id: department?.companyId || department?.id || '',
      code: department?.companyCode || department?.code || '',
      name,
      isPrimary: department?.is_primary ?? department?.isPrimary ?? 0,
    })
  }

  departments.forEach(addOption)

  if (optionMap.size === 0 && userInfo?.selectedCompany) {
    addOption({
      id: userInfo?.selectedCompanyId,
      code: userInfo?.selectedCompanyCode,
      name: userInfo.selectedCompany,
    })
  }

  return [...optionMap.values()].sort((a, b) => {
    if (Number(b.isPrimary || 0) !== Number(a.isPrimary || 0)) {
      return Number(b.isPrimary || 0) - Number(a.isPrimary || 0)
    }

    return a.name.localeCompare(b.name, 'id')
  })
}

const getAccessOptionLabel = (division) => {
  const companyName = String(
    division?.name ||
    division?.companyName ||
    division?.company ||
    '',
  ).trim()
  const className = String(
    division?.class ||
    division?.dept_class ||
    division?.departmentClass ||
    '',
  ).trim()

  if (companyName && className) return `${companyName} (${className})`
  return companyName || className || division?.label || '-'
}

export default function SelectDivisionPage({
  isOpen = true,
  onClose,
  user: userProp = null,
  includeAllCompanies = false,
  userInfoEndpoint,
  forceFetchUserInfo = false,
} = {}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user: sessionUser, setUser } = useUser()
  const activeUser = userProp || sessionUser || null
  const needsUserInfoFetch = forceFetchUserInfo || !activeUser || !Array.isArray(activeUser?.departments)
  const [fallbackUser, setFallbackUser] = useState(null)
  const [loading, setLoading] = useState(needsUserInfoFetch)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedJobLevel, setSelectedJobLevel] = useState('')
  const [submitError, setSubmitError] = useState('')
  const resolvedUserInfoEndpoint = userInfoEndpoint || '/api/auth/me'
  const isDebugAccessEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug-access') === '1'

  usePageLoadingDialog(isRefreshing, {
    title: 'Memperbarui Akses',
    message: 'Sistem sedang memuat ulang halaman dengan akses terbaru Anda.',
    statusLabel: 'Memperbarui akses',
  })

  useEffect(() => {
    if (!isOpen || !needsUserInfoFetch) return undefined

    let cancelled = false

    fetch(resolvedUserInfoEndpoint)
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/'
          throw new Error('Failed to load user info')
        }

        return response.json()
      })
      .then((payload) => {
        if (cancelled) return

        const userInfo = payload?.user || payload || null
        if (isDebugAccessEnabled) {
          console.info('[Access Debug] fetched user info', {
            endpoint: resolvedUserInfoEndpoint,
            payload,
            userInfo,
          })
        }
        setFallbackUser(userInfo)
        setUser(userInfo, { replaceSelection: true })
      })
      .catch((error) => {
        if (cancelled) return

        console.error('[SelectDivisionPage] Failed to load user info', error)
        setSubmitError('Gagal memuat data divisi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isDebugAccessEnabled, isOpen, needsUserInfoFetch, resolvedUserInfoEndpoint, setUser])

  const userInfo = fallbackUser || activeUser
  const companyOptions = useMemo(() => getCompanyOptionsFromUserInfo(userInfo), [userInfo])
  const divisions = useMemo(
    () => getDivisionOptionsFromUserInfo(userInfo, { includeAllCompanies }),
    [includeAllCompanies, userInfo],
  )
  const hasMultipleCompanies = companyOptions.length > 1
  const showCombinedAccessOptions = includeAllCompanies || hasMultipleCompanies
  const filteredDivisions = useMemo(() => {
    if (showCombinedAccessOptions || !selectedCompany) return divisions
    return divisions.filter((division) => division.name === selectedCompany)
  }, [divisions, selectedCompany, showCombinedAccessOptions])

  useEffect(() => {
    if (!isDebugAccessEnabled || !isOpen) return

    console.info('[Access Debug] select state', {
      resolvedUserInfoEndpoint,
      userInfo,
      companyOptions,
      divisions,
      filteredDivisions,
      selectedCompany,
      selectedDivision,
      selectedJobLevel,
      forceFetchUserInfo,
      includeAllCompanies,
    })
  }, [
    companyOptions,
    divisions,
    filteredDivisions,
    forceFetchUserInfo,
    includeAllCompanies,
    isDebugAccessEnabled,
    isOpen,
    resolvedUserInfoEndpoint,
    selectedCompany,
    selectedDivision,
    selectedJobLevel,
    userInfo,
  ])

  useEffect(() => {
    if (!isOpen || !userInfo) return

    const initialCompany =
      userInfo.selectedCompany ||
      companyOptions[0]?.name ||
      ''

    const initialDivision =
      userInfo.selectedDivision ||
      divisions.find((division) => division.name === initialCompany)?.class ||
      divisions[0]?.class ||
      ''

    const initialItem =
      divisions.find((division) => (
        division.name === initialCompany &&
        (division.class === initialDivision || !initialDivision)
      )) ||
      divisions.find((division) => division.class === initialDivision || division.name === initialDivision) ||
      divisions[0]

    if (initialItem) {
      setSelectedCompany(initialItem.name || userInfo.selectedCompany || '')
      setSelectedDivision(initialItem.class || '')
      setSelectedJobLevel(initialItem.jobLevel || '')
    } else if (initialCompany) {
      setSelectedCompany(initialCompany)
    }

    setLoading(false)
  }, [companyOptions, divisions, isOpen, userInfo])

  useEffect(() => {
    if (!isOpen || filteredDivisions.length === 0) return

    const selectedItem = filteredDivisions.find((division) => (
      division.class === selectedDivision &&
      (!showCombinedAccessOptions || division.name === selectedCompany)
    ))
    if (selectedItem) {
      if (selectedItem.jobLevel !== selectedJobLevel) {
        setSelectedJobLevel(selectedItem.jobLevel || '')
      }
      return
    }

    const nextDivision = filteredDivisions[0]
    if (showCombinedAccessOptions) {
      setSelectedCompany(nextDivision.name || '')
    }
    setSelectedDivision(nextDivision.class || '')
    setSelectedJobLevel(nextDivision.jobLevel || '')
  }, [filteredDivisions, isOpen, selectedCompany, selectedDivision, selectedJobLevel, showCombinedAccessOptions])

  const handleSelect = async () => {
    if (!selectedDivision) {
      setSubmitError(showCombinedAccessOptions ? 'Pilih akses terlebih dahulu.' : 'Pilih divisi terlebih dahulu.')
      return
    }

    const selectedItem =
      filteredDivisions.find((division) =>
        division.class === selectedDivision &&
        (!selectedCompany || division.name === selectedCompany)
      ) ||
      filteredDivisions.find((division) => division.class === selectedDivision) ||
      divisions.find((division) =>
        division.class === selectedDivision &&
        (!selectedCompany || division.name === selectedCompany)
      ) ||
      null

    const selectedCompanyOption =
      companyOptions.find((company) => company.name === (selectedItem?.name || selectedCompany)) ||
      companyOptions.find((company) => company.name === selectedCompany) ||
      null
    const company = selectedItem?.name || selectedCompany || userInfo?.selectedCompany || ''

    try {
      const response = await fetch('/api/auth/select-division', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, division: selectedDivision }),
      })

      if (!response.ok) {
        throw new Error('Gagal menyimpan divisi.')
      }

      const result = await response.json().catch(() => ({}))
      if (result?.user) {
        setUser(result.user, { replaceSelection: true })
      } else if (userInfo) {
        setUser({
          ...userInfo,
          selectedCompany: company,
          selectedCompanyId: selectedCompanyOption?.id || userInfo?.selectedCompanyId || '',
          selectedCompanyCode: selectedCompanyOption?.code || userInfo?.selectedCompanyCode || '',
          selectedDivision,
          selectedJobLevel,
        }, { replaceSelection: true })
      }

      setIsRefreshing(true)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (ACCESS_ROUTE_PATHS.has(pathname)) {
            window.location.assign('/')
            return
          }

          window.location.reload()
        })
      })
    } catch (error) {
      console.error('[SelectDivisionPage] Failed to save division', error)
      setSubmitError(error.message || 'Gagal menyimpan divisi.')
    }
  }

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose()
      return
    }

    navigate('/', { replace: true })
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <DialogChangeAccess
      isOpen
      title={showCombinedAccessOptions ? 'Pilih Akses' : 'Pilih Divisi'}
      eyebrow={showCombinedAccessOptions ? 'Select Access' : 'Select Division'}
      labelBatal="Batal"
      labelSimpan="Pilih"
      onClose={handleClose}
      onSave={handleSelect}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          {showCombinedAccessOptions
            ? 'Pilih akses company dan divisi Anda untuk melanjutkan.'
            : 'Pilih divisi dan level jabatan Anda untuk melanjutkan.'}
        </p>

        {loading && (
          <div style={{ padding: '16px 0', color: '#64748b' }}>
            Memuat...
          </div>
        )}

        {!loading && isDebugAccessEnabled && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}
          >
            {`Debug access aktif: companies=${companyOptions.length}, divisions=${divisions.length}, selectedCompany=${selectedCompany || '-'}, endpoint=${resolvedUserInfoEndpoint}`}
          </div>
        )}

        {!loading && submitError && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
            }}
          >
            {submitError}
          </div>
        )}

        {!loading && !submitError && divisions.length === 0 && (
          <div style={{ padding: '16px 0', color: '#64748b' }}>
            Tidak ada divisi yang tersedia.
          </div>
        )}

        {!loading && divisions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginTop: showCombinedAccessOptions ? '4px' : 0 }}>
              {showCombinedAccessOptions ? 'Akses' : 'Divisi'}
            </div>
            {filteredDivisions.length === 0 && (
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                {showCombinedAccessOptions ? 'Tidak ada akses yang tersedia.' : 'Tidak ada divisi untuk company yang dipilih.'}
              </div>
            )}
            {filteredDivisions.map((division, index) => {
              const isSelected = selectedDivision === division.class && selectedCompany === division.name
              const companyLabel = String(
                division.name ||
                division.companyName ||
                division.company ||
                '',
              ).trim()
              const divisionLabel = String(
                division.class ||
                division.dept_class ||
                division.departmentClass ||
                '',
              ).trim()
              const primaryLabel = showCombinedAccessOptions
                ? (companyLabel || getAccessOptionLabel(division))
                : (division.label || division.class || division.name)
              const secondaryLabel = showCombinedAccessOptions
                ? `Division: ${divisionLabel || '-'}`
                : (division.jobLevel || selectedJobLevel || '-')

              return (
                <button
                  key={`${division.class}-${division.name}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedCompany(division.name || '')
                    setSelectedDivision(division.class || '')
                    setSelectedJobLevel(division.jobLevel || '')
                    setSubmitError('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: `1.5px solid ${isSelected ? '#16a34a' : '#e2e8f0'}`,
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    color: isSelected ? '#16a34a' : '#334155',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 10px 24px rgba(22, 163, 74, 0.08)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredIdx(index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                      {primaryLabel}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: isSelected ? '#15803d' : '#94a3b8', marginTop: '2px' }}>
                      {secondaryLabel}
                    </div>
                  </div>
                  <span
                    className="material-icons-round"
                    style={{ color: isSelected || hoveredIdx === index ? '#16a34a' : '#cbd5e1', fontSize: '20px' }}
                  >
                    {isSelected ? 'check_circle' : 'chevron_right'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </DialogChangeAccess>,
    document.body,
  )
}
