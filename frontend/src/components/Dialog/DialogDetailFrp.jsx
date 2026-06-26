import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog.jsx'

import { XClose } from '../template/TemplateIcons.jsx'

const DOCS = ['Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak', 'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order']

const normalizeNumber = v => parseInt(String(v || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0

const formatDisplayDate = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function buildPostForm(action, payload, target = '_self') {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  form.target = target
  form.style.display = 'none'
  const append = (name, value) => {
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = name; input.value = value ?? ''
    form.appendChild(input)
  }
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (item && typeof item === 'object') Object.entries(item).forEach(([sk, sv]) => append(`${key}[${idx}][${sk}]`, sv))
        else append(`${key}[]`, item)
      })
      return
    }
    append(key, value)
  })
  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

function printPreview(payload) {
  const target = `print-frame-${Date.now()}`
  const iframe = document.createElement('iframe')
  iframe.name = target
  iframe.title = 'Print preview'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'

  document.body.appendChild(iframe)
  buildPostForm('/preview', { ...payload, autoPrint: '1' }, target)

  const removeFrame = () => {
    window.removeEventListener('afterprint', removeFrame)
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  window.addEventListener('afterprint', removeFrame)
  window.setTimeout(removeFrame, 30000)
}

const fieldStyle = { width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }
const sectionStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '0.5rem' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }
const headingStyle = { margin: '0 0 10px', fontSize: '0.9rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }
const iconStyle = { fontSize: '16px' }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }
function DialogFrpDetail({
  isOpen = false,
  request = null,
  title = 'Detail FRP',
  eyebrow = 'Request Detail',
  onClose,
  canApprove = false,
  isApprovedView = false,
  userRole = '',
  onApprove,
  onReject,
  onRevert,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !request || typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div
        className="dashboard-popup dashboard-popup--frp-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-frp-detail-title"
        onClick={(event) => event.stopPropagation()}
        style={{ height: 'auto', maxHeight: '75vh', margin: 'auto' }}
      >
        <BackgroundDialog />
        <div className="dashboard-popup__header" style={{ padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <span className="dashboard-popup__eyebrow" style={{ margin: '0 0 4px 0', fontSize: '0.65rem', lineHeight: 1, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {eyebrow}
            </span>
            <h2 className="dashboard-popup__title" id="dialog-frp-detail-title" style={{ fontSize: '1.1rem', margin: 0, lineHeight: 1.2, color: '#f8fafc', fontWeight: 600 }}>
              {title}
            </h2>
          </div>
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '4px 10px', 
              borderRadius: '8px', 
              color: '#cbd5e1', 
              fontSize: '0.7rem', 
              fontWeight: '500', 
              fontFamily: 'monospace', 
              whiteSpace: 'nowrap', 
              textOverflow: 'ellipsis', 
              overflow: 'hidden' 
            }}>
              FRP No: {request.frpNo}
            </span>
            {(() => {
              const statusStr = request.status || 'Waiting Approval'
              const sLow = statusStr.toLowerCase()
              let bg = 'rgba(245, 158, 11, 0.12)', border = 'rgba(245, 158, 11, 0.25)', color = '#fbbf24' // Warning/Yellow
              
              if (sLow.includes('approve') || sLow.includes('completed')) { 
                bg = 'rgba(16, 185, 129, 0.12)'; border = 'rgba(16, 185, 129, 0.25)'; color = '#34d399' // Success/Green
              } else if (sLow.includes('reject')) { 
                bg = 'rgba(239, 68, 68, 0.12)'; border = 'rgba(239, 68, 68, 0.25)'; color = '#f87171' // Danger/Red
              } else if (sLow.includes('draft')) { 
                bg = 'rgba(148, 163, 184, 0.12)'; border = 'rgba(148, 163, 184, 0.25)'; color = '#cbd5e1' // Neutral/Gray
              }

              return (
                <span style={{ 
                  background: bg, 
                  border: `1px solid ${border}`,
                  color: color, 
                  padding: '4px 10px', 
                  borderRadius: '8px', 
                  fontSize: '0.65rem', 
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {statusStr}
                </span>
              )
            })()}
          </div>

          <div className="frp-detail-header-actions" style={{ flexShrink: 0, marginLeft: '6px' }}>
            <button
              type="button"
              className="dashboard-popup__close"
              aria-label="Tutup dialog"
              onClick={onClose}
              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', borderRadius: '8px' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <XClose size={20} />
            </button>
          </div>
        </div>

        <div className="dashboard-popup__body dashboard-popup__body--frp-detail">
          <div className="frp-detail-content hide-scrollbar" style={{ 
            padding: '4px 8px', 
            overflowY: 'auto', 
            maxHeight: 'calc(75vh - 144px)',
            scrollBehavior: 'smooth',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
          }}>
            
            <div style={{ ...sectionStyle, marginBottom: '0.5rem' }}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>checklist</span> Checklist Documents</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DOCS.map(doc => {
                  const checked = (request.checkDocs || []).includes(doc)
                  return (
                    <label key={doc} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '30px', border: `1px solid ${checked ? '#3b82f6' : '#cbd5e1'}`, background: checked ? '#eff6ff' : 'white', opacity: checked ? 1 : 0.5, cursor: 'default' }}>
                      <input type="checkbox" checked={checked} disabled onChange={() => {}} style={{ margin: 0, width: '12px', height: '12px' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: checked ? 600 : 500, color: checked ? '#1d4ed8' : '#64748b', whiteSpace: 'nowrap' }}>{doc}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>info</span> Informasi FRP</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Company Name</label><input readOnly value={request.companyName || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Tanggal FRP</label><input readOnly value={formatDisplayDate(request.date)} style={fieldStyle} /></div>
              </div>
              <div style={grid2}>
                <div><label style={labelStyle}>Divisi</label><input readOnly value={request.division || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Diminta Oleh</label><input readOnly value={request.requesterName || ''} style={fieldStyle} /></div>
              </div>
              <div><label style={labelStyle}>Keterangan FRP</label><textarea rows="2" readOnly value={request.keteranganFrp || ''} style={{ ...fieldStyle, resize: 'none' }} /></div>
              {request.rpReference && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ ...labelStyle, color: '#1d4ed8' }}>Referensi RP No</label>
                  <input readOnly value={request.rpReference} style={{ ...fieldStyle, color: '#1d4ed8', fontWeight: 'bold', background: '#eff6ff', border: '1.5px solid #bfdbfe' }} />
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>store</span> Vendor & Pembayaran</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Vendor</label><input readOnly value={request.vendor || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Internal PO Number</label><input readOnly value={request.internalPoNumber || ''} style={fieldStyle} /></div>
              </div>
              <div style={grid3}>
                <div><label style={labelStyle}>Ext Doc Type</label><input readOnly value={request.extDocType || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Ext Doc Number</label><input readOnly value={request.extDocNumber || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Payment Method</label><input readOnly value={request.paymentMethod || ''} style={fieldStyle} /></div>
              </div>
              <div style={grid3}>
                <div><label style={labelStyle}>Payment Date</label><input readOnly value={formatDisplayDate(request.paymentDate)} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Bank Tujuan</label><input readOnly value={request.bankTujuan || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Rekening Bank</label><input readOnly value={request.rekBankTujuan || ''} style={fieldStyle} /></div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>receipt_long</span> Detail Pembayaran</h3>
              <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      {['No', 'Memo / Keterangan', 'Budget ID', 'Amount (IDR)'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(request.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', width: '40px' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.memo || ''} style={{ ...fieldStyle, margin: 0 }} /></td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.budgetId || ''} style={{ ...fieldStyle, margin: 0 }} /></td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.amount || ''} style={{ ...fieldStyle, margin: 0, textAlign: 'right', fontFamily: 'monospace' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '13px' }}>Total</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                        IDR {((request.items || []).reduce((sum, item) => sum + normalizeNumber(item.amount), 0)).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1, padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {canApprove && !isApprovedView && (
              <>
                <button
                  type="button"
                  className="dashboard-popup__button"
                  onClick={() => {
                    onReject?.(request)
                  }}
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '115px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff', border: 'none',
                    boxShadow: '0 8px 20px rgba(239, 68, 68, 0.28)', transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 12px 28px rgba(239, 68, 68, 0.4)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.28)'}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>cancel</span>
                  Reject
                </button>
                <button
                  type="button"
                  className="dashboard-popup__button"
                  onClick={() => {
                    onApprove?.(request)
                  }}
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '115px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff', border: 'none',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.28)', transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 12px 28px rgba(16, 185, 129, 0.4)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.28)'}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>check_circle</span>
                  Approve
                </button>
              </>
            )}
            {canApprove && isApprovedView && userRole === 'administrator' && (
              <button
                type="button"
                className="dashboard-popup__button"
                onClick={() => {
                  onRevert?.(request)
                }}
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '115px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff', border: 'none',
                  boxShadow: '0 8px 20px rgba(217, 119, 6, 0.28)', transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 12px 28px rgba(217, 119, 6, 0.4)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(217, 119, 6, 0.28)'}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>restart_alt</span>
                Revert
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={() => {
                window.location.href = `/?revisi=${request.id}&duplicate=1`
              }}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '115px',
                cursor: 'pointer'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>content_copy</span>
              Duplicate
            </button>
            <button
              type="button"
              className="dashboard-popup__button"
              onClick={() => printPreview(request)}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '115px',
                background: 'linear-gradient(135deg, #1a2a57 0%, #2d4a8c 100%)',
                color: '#fff', border: 'none',
                boxShadow: '0 8px 20px rgba(26, 42, 87, 0.28)', transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 12px 28px rgba(26, 42, 87, 0.4)'}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(26, 42, 87, 0.28)'}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>print</span>
              Print
            </button>
            <button
              type="button"
              className="dashboard-popup__button"
              onClick={() => buildPostForm('/generate-pdf', request, '_blank')}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '115px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff', border: 'none',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.28)', transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 12px 28px rgba(16, 185, 129, 0.4)'}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.28)'}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>download</span>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogFrpDetail
