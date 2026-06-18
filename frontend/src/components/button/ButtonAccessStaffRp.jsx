import React, { useEffect, useRef, useState } from 'react'
import ButtonCheckData from './ButtonCheckData.jsx'
import ButtonReject from './ButtonReject.jsx'
import ButtonDetail from './ButtonDetail.jsx'
import ButtonRevert from './ButtonRevert.jsx'

const PROCESS_ACCESS_DIVISIONS = new Set(['IT', 'HCGA'])

const normalizeDivision = value => String(value || '').trim().toUpperCase()

export default function ButtonAccessStaffRp({
  rp,
  actionLoading,
  requestAction,
  onCheckData = null,
  setSelected,
  showActions = true,
  showDetail = true,
  showRevert = true,
  isStaff = false,
  userDivision = '',
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

  const normalizedUserDivision = normalizeDivision(userDivision)
  const canProcessDivision = PROCESS_ACCESS_DIVISIONS.has(normalizedUserDivision)
  const isDivisionProcess = rp.status === 'division_review'
  const isStaffFinalStage = isStaff && (rp.status === 'final_review' || rp.status === 'approved')
  const showDivisionProcessActions =
    isDivisionProcess &&
    canProcessDivision &&
    canProcessThisRp &&
    typeof onCheckData === 'function'
  const showRestrictedDivisionProcess = isDivisionProcess && !canProcessDivision
  const showRevertAction = showRevert && rp.canRevert

  if (showRestrictedDivisionProcess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          color: '#475569',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: 1.4,
          maxWidth: '280px',
        }}>
          <span className="material-icons-round" style={{ fontSize: '16px', color: '#64748b', flexShrink: 0 }}>
            info
          </span>
          <span>Department Anda tidak memiliki akses untuk memproses RP</span>
        </div>
        {showDetail && (
          <ButtonDetail onClick={() => setSelected(rp)}>Detail</ButtonDetail>
        )}
      </div>
    )
  }

  const extractDetail = showDetail && (
    rp.status === 'waiting_manager' ||
    rp.status === 'final_review' ||
    (isStaff && rp.status === 'approved')
  )

  const extractRevert = showRevertAction && (
    rp.status === 'waiting_manager' ||
    rp.status === 'final_review' ||
    (isStaff && rp.status === 'approved')
  )

  const showDropdownActions = isDivisionProcess || isStaffFinalStage
  const showDropdownDetail = showDetail && (showDropdownActions || !extractDetail)
  const showDropdownRevert = showRevertAction && (showDropdownActions || !extractRevert)
  const showDropdown = showDropdownDetail || showDropdownRevert

  const showInlineDetailRevert = !showDropdownActions && (extractDetail || extractRevert)

  if (!showDivisionProcessActions && !showInlineDetailRevert && !showDropdown) return null

  return (
    <>
      {showDivisionProcessActions && (
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
          <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'process-reject')}>
            Reject
          </ButtonReject>
          <ButtonCheckData disabled={actionLoading} onClick={() => onCheckData(rp)}>
            Check Data
          </ButtonCheckData>
        </div>
      )}

      {showInlineDetailRevert && (
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
          {extractRevert && (
            <ButtonRevert disabled={actionLoading} onClick={() => requestAction(rp, 'revert')}>Revert</ButtonRevert>
          )}
          {extractDetail && (
            <ButtonDetail onClick={() => setSelected(rp)}>Detail</ButtonDetail>
          )}
        </div>
      )}

      {showDropdown && (
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
