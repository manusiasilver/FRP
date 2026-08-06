import React, { useState, useRef, useEffect } from 'react'
import ButtonApprove from './ButtonApprove.jsx'
import ButtonReject from './ButtonReject.jsx'

export default function ButtonActionApprovalFrp({
  request,
  canApprove,
  isApprovedView,
  requestAction,
  setSelectedRequest,
  options = {}
}) {
  const { showDetail = true, showRevert = true } = options
  const hasAttachment = Boolean(request.attachLink)

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
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("scroll", handleScroll, true)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [dropdownOpen])

  const showApproveReject = canApprove && !isApprovedView
  const showRevertAction = showRevert && request.canRevert && isApprovedView

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center' }}>
      {showApproveReject && (
        <>
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
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); requestAction(request, 'approve'); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', 
                border: 'none', 
                borderRadius: '24px',
                padding: '4px 12px', 
                fontSize: '11px', 
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(16,185,129,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(16,185,129,0.3)'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>check</span>
              Approve
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); requestAction(request, 'reject'); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'white',
                color: '#ef4444', 
                border: '1px solid transparent', 
                borderRadius: '24px',
                padding: '4px 10px', 
                fontSize: '11px', 
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2'
                e.currentTarget.style.color = '#dc2626'
                e.currentTarget.style.borderColor = '#fca5a5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#ef4444'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span>
              Reject
            </button>
          </div>
          
          {showDetail && (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap' }} ref={dropdownRef}>
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!dropdownOpen) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                  }
                  setDropdownOpen(!dropdownOpen); 
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  width: '32px',
                  height: '32px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#475569',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                title="Aksi lainnya"
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>more_vert</span>
                <span
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: hasAttachment ? '#22c55e' : '#cbd5e1',
                    border: '1.5px solid white',
                    boxShadow: hasAttachment ? '0 0 0 1px rgba(34, 197, 94, 0.18)' : '0 0 0 1px rgba(148, 163, 184, 0.12)',
                    pointerEvents: 'none',
                  }}
                  title={hasAttachment ? 'Dokumen tersedia' : 'Dokumen tidak tersedia'}
                />
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
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); setSelectedRequest(request); }}
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
                    onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>info</span>
                    Detail
                  </button>
                  {request.attachLink ? (
                    <a
                      href={`/api/frp/${request.id}/attachment`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => { e.stopPropagation(); setDropdownOpen(false) }}
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
                        color: '#2563eb',
                        fontSize: '13px',
                        fontWeight: 500,
                        textAlign: 'left',
                        textDecoration: 'none',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>description</span>
                      Dokumen
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {isApprovedView && (showDetail || showRevertAction) && (
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
          {showRevertAction && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); requestAction(request, 'revert'); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'white',
                color: '#ef4444', 
                border: '1px solid transparent', 
                borderRadius: '24px',
                padding: '4px 10px', 
                fontSize: '11px', 
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2'
                e.currentTarget.style.color = '#dc2626'
                e.currentTarget.style.borderColor = '#fca5a5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#ef4444'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>restart_alt</span>
              Revert
            </button>
          )}
          {showDetail && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white', 
                border: 'none', 
                borderRadius: '24px',
                padding: '4px 12px', 
                fontSize: '11px', 
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(59,130,246,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(59,130,246,0.3)'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
              Detail
            </button>
          )}
        </div>
      )}
    </div>
  )
}
