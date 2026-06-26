import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog'

import ButtonApprove from '../button/ButtonApprove.jsx'

const normalizeNumber = v => parseInt(String(v || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0

const normalizeExternalUrl = value => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  return `https://${raw}`
}

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

const fieldStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1.5px solid #dde3ed',
  borderRadius: '8px',
  background: '#f8fafc',
  fontSize: '0.825rem',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#334155',
  fontWeight: '500',
}
const sectionStyle = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '12px 16px',
  marginBottom: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
}
const labelStyle = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#64748b',
  marginBottom: '4px',
  letterSpacing: '0.04em',
}
const headingStyle = {
  margin: '0 0 8px',
  fontSize: '0.875rem',
  color: '#1e293b',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}
const iconStyle = { fontSize: '16px', color: '#1e3a8a' }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '6px' }
const headerContentStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px 16px',
  width: '100%',
}
const headerTitleStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
  flex: '1 1 280px',
}
const headerMetaStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '8px',
  flex: '0 1 auto',
}
const metaChipStyle = {
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
  overflow: 'hidden',
  maxWidth: '100%',
}

const getResponseMessage = async response => {
  try {
    const text = await response.text()
    if (!text) return response.statusText || 'Request gagal.'

    try {
      const data = JSON.parse(text)
      return data?.error || data?.message || text
    } catch (_) {
      return text
    }
  } catch (_) {
    return response.statusText || 'Request gagal.'
  }
}

const fetchBlob = async (url, options = {}) => {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(await getResponseMessage(response))
  }

  return await response.blob()
}

const openBlobInWindow = (targetWindow, blob) => {
  const blobUrl = URL.createObjectURL(blob)

  if (targetWindow) {
    targetWindow.location.href = blobUrl
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    return
  }

  window.open(blobUrl, '_blank')
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
}

const previewRpPdf = async rpId => {
  if (!rpId || typeof window === 'undefined') return

  try {
    const blob = await fetchBlob(`/api/rp/${encodeURIComponent(rpId)}/pdf`)
    openBlobInWindow(null, blob)
  } catch (error) {
    window.alert(error.message || 'Gagal membuka preview PDF.')
  }
}

const printRpPdf = async rpId => {
  if (!rpId || typeof window === 'undefined') return

  const printWindow = window.open('', '_blank')

  try {
    const blob = await fetchBlob(`/api/rp/${encodeURIComponent(rpId)}/print`)
    openBlobInWindow(printWindow, blob)
  } catch (error) {
    if (printWindow) printWindow.close()
    window.alert(error.message || 'Gagal membuka print PDF.')
  }
}

function DialogDetailRP({
  isOpen = false,
  request = null,
  title = 'Detail Request Purchase',
  eyebrow = 'Request Detail',
  onClose,
  extraFooter = null,
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

        /* Modern premium styles for inputs and panels */
        .dialog-section-premium {
          transition: all 0.2s ease-in-out !important;
        }
        .dialog-section-premium:hover {
          border-color: #cbd5e1 !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04) !important;
        }
        .dialog-input-premium {
          transition: border-color 0.2s, background 0.2s !important;
        }
        .dialog-input-premium:focus {
          border-color: #3b82f6 !important;
          background: #ffffff !important;
          outline: none !important;
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
        
        .btn-dialog-duplicate {
          background: #ffffff !important;
          color: #334155 !important;
          border: 1.5px solid #cbd5e1 !important;
        }
        .btn-dialog-duplicate:hover {
          background: #f8fafc !important;
          border-color: #94a3b8 !important;
          box-shadow: 0 4px 12px rgba(148, 163, 184, 0.15) !important;
        }
        
        .btn-dialog-preview {
          background: linear-gradient(135deg, #1a2a57 0%, #2d4a8c 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 6px 18px rgba(26, 42, 87, 0.25) !important;
        }
        .btn-dialog-preview:hover {
          box-shadow: 0 8px 24px rgba(26, 42, 87, 0.38) !important;
        }
        
        .btn-dialog-print {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.25) !important;
        }
        .btn-dialog-print:hover {
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.38) !important;
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
        aria-labelledby="dialog-rp-detail-title"
        onClick={(event) => event.stopPropagation()}
        style={{ height: 'auto', maxHeight: '85vh', width: 'min(1180px, calc(100vw - 48px))', margin: 'auto', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        <BackgroundDialog />
        <div className="dashboard-popup__header" style={{ padding: '12px 16px' }}>
          <div style={headerContentStyle}>
            <div style={headerTitleStyle}>
              <span className="dashboard-popup__eyebrow" style={{ margin: '0 0 4px 0', fontSize: '0.65rem', lineHeight: 1, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                {eyebrow}
              </span>
              <h2 className="dashboard-popup__title" id="dialog-rp-detail-title" style={{ fontSize: '1.1rem', margin: 0, lineHeight: 1.2, color: '#f8fafc', fontWeight: 600 }}>
                {title}
              </h2>
            </div>

            <div style={headerMetaStyle}>
              <span style={metaChipStyle}>
                {request.rpNo ? `No: ${request.rpNo}` : `ID: ${request.id}`}
              </span>
              {(() => {
                const statusStr = request.status || 'Waiting Approval'
                const sLow = statusStr.toLowerCase()
                let bg = 'rgba(245, 158, 11, 0.12)', border = 'rgba(245, 158, 11, 0.25)', color = '#fbbf24'

                if (sLow.includes('approve') || sLow.includes('completed')) {
                  bg = 'rgba(16, 185, 129, 0.12)'; border = 'rgba(16, 185, 129, 0.25)'; color = '#34d399'
                } else if (sLow.includes('reject')) {
                  bg = 'rgba(239, 68, 68, 0.12)'; border = 'rgba(239, 68, 68, 0.25)'; color = '#f87171'
                } else if (sLow.includes('draft')) {
                  bg = 'rgba(148, 163, 184, 0.12)'; border = 'rgba(148, 163, 184, 0.25)'; color = '#cbd5e1'
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
          </div>
        </div>

        <div className="dashboard-popup__body dashboard-popup__body--frp-detail" style={{ flex: '0 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 24px 8px 24px' }}>
          <div className="frp-detail-content hide-scrollbar" style={{
            padding: '4px 8px',
            overflowY: 'auto',
            maxHeight: 'calc(85vh - 160px)',
            scrollBehavior: 'smooth',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
          }}>

            <div style={sectionStyle} className="dialog-section-premium">
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>info</span> Informasi Request Purchase</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Company Name</label><input readOnly value={request.companyName || ''} style={fieldStyle} className="dialog-input-premium" /></div>
                <div><label style={labelStyle}>Tanggal Dibutuhkan</label><input readOnly value={formatDisplayDate(request.requiredDate || request.tanggalDibutuhkan || request.tanggalRp)} style={fieldStyle} className="dialog-input-premium" /></div>
              </div>
              <div style={grid3}>
                <div><label style={labelStyle}>Divisi</label><input readOnly value={request.divisi || ''} style={fieldStyle} className="dialog-input-premium" /></div>
                <div><label style={labelStyle}>Class</label><input readOnly value={request.classClass || request.class || ''} style={fieldStyle} className="dialog-input-premium" /></div>
                <div><label style={labelStyle}>Dibuat Oleh</label><input readOnly value={request.dibuatOleh || ''} style={fieldStyle} className="dialog-input-premium" /></div>
              </div>
              <div><label style={labelStyle}>Deskripsi (Alasan Permintaan Barang)</label><textarea rows="2" readOnly value={request.description || request.deskripsi || request.keteranganRp || ''} style={{ ...fieldStyle, resize: 'none' }} className="dialog-input-premium" /></div>
            </div>

            {request.processChanges?.changes?.length > 0 && (
              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px' }} className="dialog-section-premium">
                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {request.processChanges.changes.map((change, index) => (
                    <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                      <strong>{change.field}:</strong>{' '}
                      <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                      <span style={{ color: '#64748b' }}> -&gt; </span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                  Diubah oleh: {request.processUpdatedBy || '-'} {request.processUpdatedAt ? `(${formatDisplayDate(request.processUpdatedAt)})` : ''}
                </div>
              </div>
            )}

            <div style={sectionStyle} className="dialog-section-premium">
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>store</span> Vendor & Proses</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Kategori Pembelian</label><input readOnly value={request.kategoriPembelian || ''} style={fieldStyle} className="dialog-input-premium" /></div>
                <div><label style={labelStyle}>Diproses Oleh</label><input readOnly value={request.diprosesOleh || ''} style={fieldStyle} className="dialog-input-premium" /></div>
              </div>
              <div style={grid2}>
                <div><label style={labelStyle}>Vendor Suggestion</label><input readOnly value={request.vendorSuggestion || ''} style={fieldStyle} className="dialog-input-premium" /></div>
                <div><label style={labelStyle}>PIC Penerima</label><input readOnly value={request.receiverPic || request.picPenerima || ''} style={fieldStyle} className="dialog-input-premium" /></div>
              </div>
            </div>

            <div style={sectionStyle} className="dialog-section-premium">
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>table_rows</span> Detail Item</h3>
              <div className="hide-scrollbar" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['No', 'Budget ID', 'Memo', 'Link Pembelian', 'Qty', 'Est. Value', 'Subtotal'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(request.items || []).map((item, idx) => {
                      const qty = normalizeNumber(item.qty) || 1
                      const val = normalizeNumber(item.estimatedValue) || 0
                      const sub = qty * val
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', width: '36px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.budgetId || ''} style={{ ...fieldStyle, margin: 0 }} className="dialog-input-premium" /></td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.memo || item.description || ''} style={{ ...fieldStyle, margin: 0 }} className="dialog-input-premium" /></td>
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
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, color: '#334155' }}>{qty}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 500, color: '#475569' }}>{val.toLocaleString('id-ID')}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{sub.toLocaleString('id-ID')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="6" style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Estimasi</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#1e3a8a', textAlign: 'right', borderTop: '2px solid #e2e8f0' }}>
                        IDR {((request.items || []).reduce((sum, item) => sum + (normalizeNumber(item.qty) || 1) * normalizeNumber(item.estimatedValue), 0)).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions with elegant design, transitions and shadow */}
        <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1, padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {extraFooter}

          <button
            type="button"
            className="dashboard-popup__button btn-dialog btn-dialog-close"
            onClick={onClose}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
            Tutup
          </button>

          <button
            type="button"
            className="dashboard-popup__button btn-dialog btn-dialog-duplicate"
            onClick={() => {
              window.location.href = `/rp?revisi=${request.id}&duplicate=1`
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>content_copy</span>
            Duplicate
          </button>

          {['approved', 'CREATED_FRP'].includes(request.status) && (
            <>
              <button
                type="button"
                className="dashboard-popup__button btn-dialog btn-dialog-preview"
                onClick={() => previewRpPdf(request.id)}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span>
                Preview
              </button>

              <button
                type="button"
                className="dashboard-popup__button btn-dialog btn-dialog-print"
                onClick={() => printRpPdf(request.id)}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>print</span>
                Print PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDetailRP
