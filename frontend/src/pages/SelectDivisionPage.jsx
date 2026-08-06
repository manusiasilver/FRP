import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePageLoadingDialog } from '../contexts/PageLoadingContext'
import { useUser } from '../contexts/UserContext'
import DialogChangeAccess from '../components/Dialog/DialogChangeAccess.jsx'
import { notifyAccessChanged } from '../utils/auth'

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

    fetch(`${resolvedUserInfoEndpoint}${resolvedUserInfoEndpoint.includes('?') ? '&' : '?'}_ts=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/'
          throw new Error('Failed to load user info')
        }

        return response
      })
      .then((response) => response.json())
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

    console.log('[SelectDivisionPage] Initializing division selector:', {
      userSelectedCompany: userInfo.selectedCompany,
      userSelectedDivision: userInfo.selectedDivision,
      companyOptionsCount: companyOptions.length,
      divisionsCount: divisions.length,
    })

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

    console.log('[SelectDivisionPage] Initial values:', {
      initialCompany,
      initialDivision,
      initialItem: initialItem ? { name: initialItem.name, class: initialItem.class, jobLevel: initialItem.jobLevel } : null,
    })

    if (initialItem) {
      console.log('[SelectDivisionPage] Setting from initialItem')
      setSelectedCompany(initialItem.name || userInfo.selectedCompany || '')
      setSelectedDivision(initialItem.class || '')
      setSelectedJobLevel(initialItem.jobLevel || '')
    } else if (initialCompany) {
      console.log('[SelectDivisionPage] Setting company only')
      setSelectedCompany(initialCompany)
    }

    setLoading(false)
  }, [companyOptions, divisions, isOpen, userInfo])

  useEffect(() => {
    if (!isOpen || filteredDivisions.length === 0) return

    console.log('[SelectDivisionPage] Syncing with filteredDivisions:', {
      filteredDivisionsCount: filteredDivisions.length,
      selectedDivision,
      selectedCompany,
      showCombinedAccessOptions,
    })

    const selectedItem = filteredDivisions.find((division) => (
      division.class === selectedDivision &&
      (!showCombinedAccessOptions || division.name === selectedCompany)
    ))
    if (selectedItem) {
      if (selectedItem.jobLevel !== selectedJobLevel) {
        console.log('[SelectDivisionPage] Updating jobLevel for selected item')
        setSelectedJobLevel(selectedItem.jobLevel || '')
      }
      console.log('[SelectDivisionPage] Current division selection is still valid')
      return
    }

    console.log('[SelectDivisionPage] Current division selection not found in filtered divisions, resetting')
    const nextDivision = filteredDivisions[0]
    if (showCombinedAccessOptions) {
      console.log('[SelectDivisionPage] Updating company to first filtered division')
      setSelectedCompany(nextDivision.name || '')
    }
    console.log('[SelectDivisionPage] Resetting division and jobLevel')
    setSelectedDivision(nextDivision.class || '')
    setSelectedJobLevel(nextDivision.jobLevel || '')
  }, [filteredDivisions, isOpen, selectedCompany, selectedDivision, selectedJobLevel, showCombinedAccessOptions])

  const handleSelect = async () => {
    console.log('[SelectDivisionPage] handleSelect called')
    console.log('[SelectDivisionPage] Current selection:', {
      selectedCompany,
      selectedDivision,
      selectedJobLevel,
      showCombinedAccessOptions,
    })

    if (!selectedDivision) {
      const errorMsg = showCombinedAccessOptions ? 'Pilih akses terlebih dahulu.' : 'Pilih divisi terlebih dahulu.'
      console.error('[SelectDivisionPage] No division selected:', errorMsg)
      setSubmitError(errorMsg)
      return
    }

    console.log('[SelectDivisionPage] Finding matching division item from filteredDivisions')
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

    console.log('[SelectDivisionPage] Division change payload:', {
      company,
      division: selectedDivision,
      jobLevel: selectedJobLevel,
      selectedItem: selectedItem ? { id: selectedItem.id, name: selectedItem.name, class: selectedItem.class } : null,
    })

    try {
      console.log('[SelectDivisionPage] Sending POST /api/auth/me with division change')
      const response = await fetch('/api/auth/me', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, division: selectedDivision }),
      })

      console.log('[SelectDivisionPage] POST /api/auth/me response status:', response.status, response.ok)

      if (!response.ok) {
        console.error('%c❌ GAGAL! POST /api/auth/me returned status %d', 'color: #dc2626; font-weight: bold; font-size: 14px;', response.status)
        throw new Error('Gagal menyimpan divisi.')
      }

      console.log('[SelectDivisionPage] Parsing response JSON')
      const result = await response.json().catch(() => ({}))
      console.log('[SelectDivisionPage] Response JSON received:', result)
      let nextUser = null

      if (result?.user) {
        console.log('[SelectDivisionPage] Using user from response:', {
          userId: result.user.id,
          selectedCompany: result.user.selectedCompany,
          selectedDivision: result.user.selectedDivision,
        })
        nextUser = result.user
      } else if (userInfo) {
        console.log('[SelectDivisionPage] Building nextUser from current userInfo')
        nextUser = {
          ...userInfo,
          selectedCompany: company,
          selectedCompanyId: selectedCompanyOption?.id || userInfo?.selectedCompanyId || '',
          selectedCompanyCode: selectedCompanyOption?.code || userInfo?.selectedCompanyCode || '',
          selectedDivision,
          selectedJobLevel,
        }
        console.log('[SelectDivisionPage] Built nextUser:', {
          selectedCompany: nextUser.selectedCompany,
          selectedDivision: nextUser.selectedDivision,
          selectedJobLevel: nextUser.selectedJobLevel,
        })
      }

      if (nextUser) {
        console.log('[SelectDivisionPage] Updating user state with setUser and setFallbackUser')
        setFallbackUser(nextUser)
        setUser(nextUser, { replaceSelection: true })
        console.log('[SelectDivisionPage] User state updated')
      } else {
        console.warn('[SelectDivisionPage] No nextUser to update')
      }

      try {
        console.log('[SelectDivisionPage] Refreshing user info from', resolvedUserInfoEndpoint)
        const refreshedResponse = await fetch(`${resolvedUserInfoEndpoint}${resolvedUserInfoEndpoint.includes('?') ? '&' : '?'}_ts=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })

        console.log('[SelectDivisionPage] Refresh response status:', refreshedResponse.status, refreshedResponse.ok)

        if (refreshedResponse.ok) {
          const refreshedPayload = await refreshedResponse.json().catch(() => null)
          const refreshedUser = refreshedPayload?.user || refreshedPayload || null

          if (refreshedUser) {
            console.log('[SelectDivisionPage] Got refreshed user info:', {
              userId: refreshedUser.id,
              selectedCompany: refreshedUser.selectedCompany,
              selectedDivision: refreshedUser.selectedDivision,
            })

            // ✅ CHECK IF DIVISION CHANGE WAS SUCCESSFUL
            const divisionChangeSuccessful = refreshedUser.selectedDivision === selectedDivision
            const companyChangeSuccessful = refreshedUser.selectedCompany === company
            
            if (divisionChangeSuccessful && companyChangeSuccessful) {
              console.log('%c✅ BERHASIL! Division dan Company berhasil diubah', 'color: #16a34a; font-weight: bold; font-size: 14px;', {
                previousDivision: userInfo?.selectedDivision,
                newDivision: refreshedUser.selectedDivision,
                previousCompany: userInfo?.selectedCompany,
                newCompany: refreshedUser.selectedCompany,
              })
            } else {
              console.error('%c❌ GAGAL! Division atau Company tidak berubah sesuai harapan', 'color: #dc2626; font-weight: bold; font-size: 14px;', {
                requestedDivision: selectedDivision,
                actualDivision: refreshedUser.selectedDivision,
                divisionMatches: divisionChangeSuccessful,
                requestedCompany: company,
                actualCompany: refreshedUser.selectedCompany,
                companyMatches: companyChangeSuccessful,
                previousDivision: userInfo?.selectedDivision,
                previousCompany: userInfo?.selectedCompany,
              })
            }

            nextUser = refreshedUser
            setFallbackUser(refreshedUser)
            setUser(refreshedUser, { replaceSelection: true })
          } else {
            console.warn('[SelectDivisionPage] No user in refreshed payload')
            console.error('%c❌ GAGAL! Tidak ada user data di response', 'color: #dc2626; font-weight: bold; font-size: 14px;')
          }
        } else {
          console.warn('[SelectDivisionPage] Refresh response not ok')
          console.error('%c❌ GAGAL! Response dari server tidak OK (HTTP %d)', 'color: #dc2626; font-weight: bold; font-size: 14px;', refreshedResponse.status)
        }
      } catch (refreshError) {
        console.warn('[SelectDivisionPage] Failed to refresh user info after access change', refreshError)
        console.error('%c❌ GAGAL! Error saat refresh user info setelah ubah division', 'color: #dc2626; font-weight: bold; font-size: 14px;', refreshError.message)

      }

      console.log('[SelectDivisionPage] Notifying access changed with user:', {
        selectedCompany: nextUser?.selectedCompany,
        selectedDivision: nextUser?.selectedDivision,
      })
      notifyAccessChanged(nextUser)
      setIsRefreshing(false)

      if (ACCESS_ROUTE_PATHS.has(pathname)) {
        console.log('[SelectDivisionPage] Redirecting to home because pathname is:', pathname)
        navigate('/', { replace: true })
        return
      }

      console.log('[SelectDivisionPage] Closing division selector')
      handleClose()
    } catch (error) {
      console.error('[SelectDivisionPage] Exception during handleSelect:', {
        errorMessage: error.message,
        errorStack: error.stack,
        selectedDivision,
        selectedCompany,
      })
      console.error('%c❌ GAGAL! Error: %s', 'color: #dc2626; font-weight: bold; font-size: 14px;', error.message)
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
                    console.log('[SelectDivisionPage] User clicked division:', {
                      company: division.name,
                      division: division.class,
                      jobLevel: division.jobLevel,
                    })
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
