import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import DialogChangeAccess from '../components/Dialog/DialogChangeAccess.jsx'

const normalizeDivision = (assignment, index = 0) => {
  const className = assignment?.class || assignment?.dept_class || assignment?.departmentClass || ''
  const name = assignment?.name || assignment?.companyName || assignment?.company || assignment?.deptName || assignment?.departmentName || ''
  const jobLevel = assignment?.jobLevel || assignment?.job_level_name || assignment?.selectedJobLevel || ''
  const jobLevelRank = assignment?.jobLevelRank || assignment?.job_level_rank || null
  const label = assignment?.label || (className && name ? `${name} - ${className}` : (name || className || '-'))

  return {
    ...assignment,
    originalIndex: assignment?.originalIndex ?? assignment?.id ?? index,
    class: className,
    name,
    jobLevel,
    jobLevelRank,
    label,
  }
}

const getDivisionOptionsFromUserInfo = (userInfo, options = {}) => {
  const { includeAllCompanies = false } = options
  const selectedCompany = String(userInfo?.selectedCompany || '').trim()
  const assignmentOptions = Array.isArray(userInfo?.allAssignments) ? userInfo.allAssignments : []
  const departmentOptions = (Array.isArray(userInfo?.departments) ? userInfo.departments : []).map((department) => ({
        ...department,
        name: department?.companyName || department?.company || selectedCompany,
        class: department?.class || department?.dept_class || department?.name || '',
      }))
  const assignments = [...assignmentOptions, ...departmentOptions]

  const filteredAssignments = selectedCompany && !includeAllCompanies
    ? assignments.filter((assignment) => String(assignment?.name || '').trim() === selectedCompany)
    : assignments

  const divisions = filteredAssignments.flatMap((assignment, index) => {
    const classes = Array.isArray(assignment?.classes) && assignment.classes.length > 0
      ? assignment.classes
      : [assignment?.class || assignment?.dept_class || assignment?.departmentClass].filter(Boolean)

    return classes.map((className, classIndex) => normalizeDivision({
      ...assignment,
      class: className,
      originalIndex: assignment?.id ?? index + classIndex,
    }, index + classIndex))
  })

  return [...new Map(divisions.map((division) => [`${division.name}::${division.class}`, division])).values()]
}

const getCompanyOptionsFromUserInfo = (userInfo) => {
  const assignments = Array.isArray(userInfo?.allAssignments) ? userInfo.allAssignments : []
  const companies = Array.isArray(userInfo?.companies) ? userInfo.companies : []
  const departments = Array.isArray(userInfo?.departments) ? userInfo.departments : []
  const optionMap = new Map()

  const addOption = (raw) => {
    if (typeof raw === 'string') {
      const name = raw.trim()
      if (!name || optionMap.has(name)) return

      optionMap.set(name, {
        id: '',
        code: '',
        name,
        isPrimary: 0,
      })
      return
    }

    const name = String(
      raw?.name ||
      raw?.companyName ||
      raw?.company ||
      '',
    ).trim()

    if (!name || optionMap.has(name)) return

    optionMap.set(name, {
      id: raw?.companyId || raw?.id || '',
      code: raw?.companyCode || raw?.code || '',
      name,
      isPrimary: raw?.is_primary ?? raw?.isPrimary ?? 0,
    })
  }

  companies.forEach(addOption)
  assignments.forEach(addOption)
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

export default function SelectDivisionPage({
  isOpen = true,
  onClose,
  onSuccess,
  user: userProp = null,
  includeAllCompanies = false,
  userInfoEndpoint,
  forceFetchUserInfo = false,
} = {}) {
  const navigate = useNavigate()
  const { user: sessionUser, setUser } = useUser()
  const activeUser = userProp || sessionUser || null
  const [fallbackUser, setFallbackUser] = useState(null)
  const [loading, setLoading] = useState(forceFetchUserInfo || !activeUser)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedJobLevel, setSelectedJobLevel] = useState('')
  const [submitError, setSubmitError] = useState('')
  const resolvedUserInfoEndpoint = userInfoEndpoint || (includeAllCompanies ? '/api/data/select-company' : '/api/data/select-division')
  const isDebugAccessEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug-access') === '1'

  useEffect(() => {
    if (!isOpen || (activeUser && !forceFetchUserInfo)) return undefined

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
        setUser(userInfo)
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
  }, [activeUser, forceFetchUserInfo, isDebugAccessEnabled, isOpen, resolvedUserInfoEndpoint, setUser])

  const userInfo = fallbackUser || activeUser
  const companyOptions = useMemo(() => getCompanyOptionsFromUserInfo(userInfo), [userInfo])
  const divisions = useMemo(
    () => getDivisionOptionsFromUserInfo(userInfo, { includeAllCompanies }),
    [includeAllCompanies, userInfo],
  )
  const hasMultipleCompanies = companyOptions.length > 1
  const filteredDivisions = useMemo(() => {
    if (!selectedCompany) return divisions
    return divisions.filter((division) => division.name === selectedCompany)
  }, [divisions, selectedCompany])

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

    const selectedItem = filteredDivisions.find((division) => division.class === selectedDivision)
    if (selectedItem) {
      if (selectedItem.jobLevel !== selectedJobLevel) {
        setSelectedJobLevel(selectedItem.jobLevel || '')
      }
      return
    }

    const nextDivision = filteredDivisions[0]
    setSelectedDivision(nextDivision.class || '')
    setSelectedJobLevel(nextDivision.jobLevel || '')
  }, [filteredDivisions, isOpen, selectedDivision, selectedJobLevel])

  const handleSelect = async () => {
    if (!selectedCompany && hasMultipleCompanies) {
      setSubmitError('Pilih company terlebih dahulu.')
      return
    }

    if (!selectedDivision) {
      setSubmitError('Pilih divisi terlebih dahulu.')
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

      if (typeof onSuccess === 'function') {
        onSuccess()
        return
      }

      window.location.href = '/'
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
      title={hasMultipleCompanies ? 'Pilih Akses' : 'Pilih Divisi'}
      eyebrow={hasMultipleCompanies ? 'Select Company & Division' : 'Select Division'}
      labelBatal="Batal"
      labelSimpan="Pilih"
      onClose={handleClose}
      onSave={handleSelect}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          {hasMultipleCompanies
            ? 'Pilih company dan divisi Anda untuk melanjutkan.'
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
            {hasMultipleCompanies && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>
                  Company
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {companyOptions.map((company, index) => {
                    const isSelected = selectedCompany === company.name

                    return (
                      <button
                        key={`${company.id || company.code || company.name}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedCompany(company.name || '')
                          setSubmitError('')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: '16px',
                          border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 10px 24px rgba(37, 99, 235, 0.08)' : 'none',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                            {company.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: isSelected ? '#2563eb' : '#94a3b8', marginTop: '2px' }}>
                            {company.code || 'Company Access'}
                          </div>
                        </div>
                        <span
                          className="material-icons-round"
                          style={{ color: isSelected ? '#2563eb' : '#cbd5e1', fontSize: '20px' }}
                        >
                          {isSelected ? 'check_circle' : 'business'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginTop: hasMultipleCompanies ? '4px' : 0 }}>
              Divisi
            </div>
            {filteredDivisions.length === 0 && (
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                Tidak ada divisi untuk company yang dipilih.
              </div>
            )}
            {filteredDivisions.map((division, index) => {
              const isSelected = selectedDivision === division.class && selectedCompany === division.name

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
                      {hasMultipleCompanies ? (division.class || division.label || division.name) : (division.label || division.class || division.name)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: isSelected ? '#15803d' : '#94a3b8', marginTop: '2px' }}>
                      {division.jobLevel || selectedJobLevel || '-'}
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
