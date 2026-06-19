import React, { useEffect, useRef, useState } from 'react'
import ButtonApprove from './ButtonApprove.jsx'
import ButtonReject from './ButtonReject.jsx'
import ButtonDetail from './ButtonDetail.jsx'
import ButtonRevert from './ButtonRevert.jsx'

export default function ButtonAccessManagerRp({
  rp,
  user = null,
  userJobLevelRank = 0,
  canTakeApprovalAction = false,
  actionLoading,
  requestAction,
  setSelected,
  showActions = true,
  canProcessThisRp = false,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })  
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    function handleScroll(event) {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [dropdownOpen])

  if (!showActions || !rp) return null

  const normalizeDivision = value => String(value || '').trim().toUpperCase()
  const userDivisions = []
  const seenDivisions = new Set()
  const addUserDivision = value => {
    const normalizedDivision = normalizeDivision(value)
    if (!normalizedDivision || seenDivisions.has(normalizedDivision)) return
    seenDivisions.add(normalizedDivision)
    userDivisions.push(normalizedDivision)
  }

  const userJobLevelName = String(user?.selectedJobLevel || user?.jobLevelName || '').toLowerCase()
  const isManagerJobLevel = /\bmanager\b/.test(userJobLevelName)
  const canTakeManagerAction = canTakeApprovalAction || userJobLevelRank >= 2 || isManagerJobLevel

  addUserDivision(user?.departmentClass)
  addUserDivision(user?.selectedDivision)
  addUserDivision(user?.departmentName)
  ;(user?.allAssignments || []).forEach((assignment) => {
    addUserDivision(assignment?.dept_class || assignment?.departmentClass || assignment?.class)
    addUserDivision(assignment?.dept_name || assignment?.departmentName || assignment?.department_name)
    ;(assignment?.classes || []).forEach(addUserDivision)
  })
  ;(user?.departments || []).forEach((department) => {
    addUserDivision(department?.class)
    addUserDivision(department?.name)
  })

  const requesterDivision = normalizeDivision(rp.departmentClass || rp.divisi || rp.departmentName)
  const processDivision = normalizeDivision(rp.processedByDepartment || rp.diprosesOleh)
  const hasDivisionAccess = division => !!division && userDivisions.includes(division)
  const isITManager = hasDivisionAccess('IT')
  const hasRequesterDivisionAccess = hasDivisionAccess(requesterDivision)
  const canFinalApproveByDivision = hasDivisionAccess(processDivision)
  const isManagerActionDisabledByDivision =
    rp.status === 'waiting_manager' &&
    canTakeManagerAction &&
    isITManager &&
    !hasRequesterDivisionAccess

  const canManagerApprove = rp.status === 'waiting_manager' && canTakeManagerAction && hasRequesterDivisionAccess
  const canDivisionProcess = rp.status === 'division_review' && userJobLevelRank > 1 && canProcessThisRp
  const canFinalApprove = rp.status === 'final_review' && canTakeManagerAction && canFinalApproveByDivision
  const showDivisionReviewDetailOnly =
    rp.status === 'division_review' &&
    userJobLevelRank > 1 &&
    !canDivisionProcess
  const showRevertAction = rp.canRevert
  const showReadOnlyDropdown =
    (
      !canTakeManagerAction ||
      (rp.status === 'waiting_manager' && !hasRequesterDivisionAccess) ||
      (rp.status === 'final_review' && !canFinalApproveByDivision)
    ) &&
    (userJobLevelRank > 1 || isManagerJobLevel) &&
    (rp.status === 'waiting_manager' || rp.status === 'final_review')
  const showDropdownDetail = rp.status === 'waiting_manager' || rp.status === 'final_review' || showReadOnlyDropdown
  const showDropdownRevert = rp.status === 'final_review' && showRevertAction && !showReadOnlyDropdown
  const showDropdown = showDropdownDetail || showDropdownRevert

  return (
    <>
      {canManagerApprove && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
          opacity: isManagerActionDisabledByDivision ? 0.72 : 1,
        }}>
          <ButtonReject
            disabled={actionLoading || isManagerActionDisabledByDivision}
            title={isManagerActionDisabledByDivision ? 'Manager IT hanya dapat approve divisi IT' : undefined}
            onClick={() => requestAction(rp, 'manager-reject')}
          >
            Reject
          </ButtonReject>
          <ButtonApprove
            disabled={actionLoading || isManagerActionDisabledByDivision}
            title={isManagerActionDisabledByDivision ? 'Manager IT hanya dapat approve divisi IT' : undefined}
            onClick={() => requestAction(rp, 'manager-approve')}
          >
            Approve
          </ButtonApprove>
        </div>
      )}

      {canDivisionProcess && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <ButtonRevert disabled={actionLoading} onClick={() => requestAction(rp, 'revert')}>Revert</ButtonRevert>
          <ButtonDetail onClick={() => setSelected(rp)}>Detail</ButtonDetail>
        </div>
      )}

      {showDivisionReviewDetailOnly && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <ButtonDetail onClick={() => setSelected(rp)}>Detail</ButtonDetail>
        </div>
      )}

      {canFinalApprove && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-reject')}>Reject</ButtonReject>
          <ButtonApprove disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-approve')}>Approve</ButtonApprove>
        </div>
      )}

      {(canManagerApprove || canFinalApprove || showReadOnlyDropdown) && showDropdown && (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!dropdownOpen) {
                const rect = e.currentTarget.getBoundingClientRect()
                setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
              }
              setDropdownOpen(!dropdownOpen)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.2s'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>more_vert</span>
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.05)',
              minWidth: '160px',
              zIndex: 9999,
              padding: '4px'
            }}>
              {showDropdownDetail && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); setSelected(rp) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#3b82f6',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>info</span>
                  Detail
                </button>
              )}
              {showDropdownRevert && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); requestAction(rp, 'revert') }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#f59e0b',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>restart_alt</span>
                  Revert
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
