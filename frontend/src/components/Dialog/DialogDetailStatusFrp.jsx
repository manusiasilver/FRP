import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUser } from '../../contexts/UserContext'
import CreateButton from '../button/CreateButton'
import DialogConfirm from './DialogConfirm'
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

function openPrintPreview(payload) {
  if (payload?.id) {
    window.open(`/api/frp/${encodeURIComponent(payload.id)}/print`, '_blank')
    return
  }
  buildPostForm('/print-pdf', payload, '_blank')
}

const fieldStyle = { width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }
const sectionStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '0.5rem' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }
const headingStyle = { margin: '0 0 10px', fontSize: '0.9rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }
const iconStyle = { fontSize: '16px' }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }

function DialogDetailStatusFrp({
  isOpen = false,
  request = null,
  title = 'Detail FRP',
  eyebrow = 'Form Request Payment',
  onClose,
}) {
  const { user } = useUser()
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  const isIT = user?.role === 'IT' || user?.department === 'IT'
  // using request.canApprove or defaults if not given
  const canApprove = request?.canApprove

  const doAction = async (action) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/frp/${request.id}/${action}`, { method: 'POST' })
      const result = await res.json()
      if (result.success) window.location.reload()
      else window.alert('Gagal mengeksekusi aksi.')
    } catch (e) {
      window.alert(e.message)
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  const revisiForm = () => {
    window.location.href = `/?revisi=${request.id}`
  }

  const duplicateForm = () => {
    window.location.href = `/?revisi=${request.id}&duplicate=1`
  }

  const requestAction = (action) => {
    setConfirmAction(action)
  }

  const confirmActionMeta = {
    approve: { eyebrow: 'Konfirmasi Approval', title: 'Approve FRP?', message: 'FRP akan disetujui.', confirmLabel: 'Ya, Approve', icon: 'check_circle', tone: 'approve' },
    reject: { eyebrow: 'Konfirmasi Reject', title: 'Reject FRP?', message: 'FRP akan ditolak.', confirmLabel: 'Ya, Reject', icon: 'cancel', tone: 'reject' },
    delete: { eyebrow: 'Konfirmasi Hapus', title: 'Hapus FRP?', message: 'FRP akan dihapus permanen.', confirmLabel: 'Ya, Hapus', icon: 'delete', tone: 'danger' },
    revisi: { eyebrow: 'Konfirmasi Revisi', title: 'Revisi FRP?', message: 'Anda akan merevisi FRP ini.', confirmLabel: 'Ya, Revisi', icon: 'edit', tone: 'primary' },
    duplicate: { eyebrow: 'Konfirmasi Duplikasi', title: 'Duplikasi FRP?', message: 'FRP ini akan diduplikasi menjadi form baru.', confirmLabel: 'Ya, Duplikasi', icon: 'content_copy', tone: 'primary' },
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !request || typeof document === 'undefined') return null

  const items = Array.isArray(request.items) ? request.items : []
  const total = items.reduce((sum, item) => sum + normalizeNumber(item.amount), 0)

  const statusStr = request.status || 'PENDING'
  const sLow = statusStr.toLowerCase()
  let statusBg = 'rgba(245, 158, 11, 0.12)', statusBorder = 'rgba(245, 158, 11, 0.25)', statusColor = '#fbbf24'
  if (sLow.includes('approve') || sLow.includes('completed')) {
    statusBg = 'rgba(16, 185, 129, 0.12)'; statusBorder = 'rgba(16, 185, 129, 0.25)'; statusColor = '#34d399'
  } else if (sLow.includes('reject')) {
    statusBg = 'rgba(239, 68, 68, 0.12)'; statusBorder = 'rgba(239, 68, 68, 0.25)'; statusColor = '#f87171'
  } else if (sLow.includes('draft')) {
    statusBg = 'rgba(148, 163, 184, 0.12)'; statusBorder = 'rgba(148, 163, 184, 0.25)'; statusColor = '#cbd5e1'
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        className="dashboard-popup dashboard-popup--frp-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-status-frp-detail-title"
        onClick={(event) => event.stopPropagation()}
        style={{ height: 'auto', maxHeight: '80vh', margin: 'auto' }}
      >
        <BackgroundDialog />
        {/* Header */}
        <div className="dashboard-popup__header" style={{ padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <span className="dashboard-popup__eyebrow" style={{ margin: '0 0 4px 0', fontSize: '0.65rem', lineHeight: 1, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {eyebrow}
            </span>
            <h2 className="dashboard-popup__title" id="dialog-status-frp-detail-title" style={{ fontSize: '1.1rem', margin: 0, lineHeight: 1.2, color: '#f8fafc', fontWeight: 600 }}>
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
              FRP No: {request.frpNo || `#${request.id}`}
            </span>
            <span style={{
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              color: statusColor,
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

        {/* Body */}
        <div className="dashboard-popup__body dashboard-popup__body--frp-detail">
          <div className="frp-detail-content hide-scrollbar" style={{
            padding: '4px 8px',
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 144px)',
            scrollBehavior: 'smooth',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
          }}>

            {/* Checklist Documents */}
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

            {/* Informasi FRP */}
            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>info</span> Informasi FRP</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Company Name</label><input readOnly value={request.companyName || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Tanggal FRP</label><input readOnly value={formatDisplayDate(request.tanggalFrp)} style={fieldStyle} /></div>
              </div>
              <div style={grid2}>
                <div><label style={labelStyle}>Divisi</label><input readOnly value={request.divisi || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Diminta Oleh</label><input readOnly value={request.dimintaOleh || ''} style={fieldStyle} /></div>
              </div>
              <div><label style={labelStyle}>Keterangan FRP</label><textarea rows="2" readOnly value={request.keteranganFrp || ''} style={{ ...fieldStyle, resize: 'none' }} /></div>
              {request.rpReference && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ ...labelStyle, color: '#1d4ed8' }}>Referensi RP No</label>
                  <input readOnly value={request.rpReference} style={{ ...fieldStyle, color: '#1d4ed8', fontWeight: 'bold', background: '#eff6ff', border: '1.5px solid #bfdbfe' }} />
                </div>
              )}
            </div>

            {/* Vendor & Pembayaran */}
            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>store</span> Vendor &amp; Pembayaran</h3>
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

            {/* Detail Pembayaran */}
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
                    {items.map((item, idx) => (
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
                        IDR {total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1, padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {request.status === 'APPROVED' && <>
            <CreateButton variant="accordion" tone="primary" onClick={() => requestAction('duplicate')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>content_copy</span>
              Duplicate
            </CreateButton>
            <CreateButton variant="accordion" tone="primary" onClick={() => openPrintPreview(request)}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>print</span>
              Preview
            </CreateButton>
            <CreateButton variant="accordion" tone="neutral" onClick={() => buildPostForm('/generate-pdf', request, '_blank')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>download</span>
              Download
            </CreateButton>
            {(canApprove || isIT) && <CreateButton variant="accordion" tone="warning" onClick={() => requestAction('reject')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>cancel</span>
              Reject
            </CreateButton>}
          </>}
          {request.status === 'PENDING' && <>
            <CreateButton variant="accordion" tone="primary" onClick={() => requestAction('duplicate')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>content_copy</span>
              Duplicate
            </CreateButton>
            {(canApprove || isIT || request.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="danger" onClick={() => requestAction('delete')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
              Hapus
            </CreateButton>}
            {(canApprove || isIT || request.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="primary" onClick={() => requestAction('revisi')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
              Revisi
            </CreateButton>}
            {(canApprove || isIT) && <CreateButton variant="accordion" tone="warning" onClick={() => requestAction('reject')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>cancel</span>
              Reject
            </CreateButton>}
            {(canApprove || isIT) && <CreateButton variant="accordion" onClick={() => requestAction('approve')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>check_circle</span>
              Approve
            </CreateButton>}
          </>}
          {request.status === 'REJECTED' && <>
            <CreateButton variant="accordion" tone="primary" onClick={() => requestAction('duplicate')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>content_copy</span>
              Duplicate
            </CreateButton>
            {(canApprove || isIT || request.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="danger" onClick={() => requestAction('delete')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
              Hapus
            </CreateButton>}
            {(canApprove || isIT || request.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="primary" onClick={() => requestAction('revisi')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
              Revisi
            </CreateButton>}
            {(canApprove || isIT) && <CreateButton variant="accordion" onClick={() => requestAction('approve')}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>check_circle</span>
              Approve
            </CreateButton>}
          </>}
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '100px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
            Tutup
          </button>
        </div>
      </div>
      <DialogConfirm
        isOpen={!!confirmAction}
        eyebrow={confirmAction ? confirmActionMeta[confirmAction]?.eyebrow : ''}
        title={confirmAction ? confirmActionMeta[confirmAction]?.title : ''}
        message={confirmAction ? confirmActionMeta[confirmAction]?.message : ''}
        confirmLabel={confirmAction ? confirmActionMeta[confirmAction]?.confirmLabel : ''}
        icon={confirmAction ? confirmActionMeta[confirmAction]?.icon : ''}
        tone={confirmAction ? confirmActionMeta[confirmAction]?.tone : 'primary'}
        isLoading={actionLoading}
        onClose={() => { if (!actionLoading) setConfirmAction(null) }}
        onConfirm={() => {
          if (confirmAction === 'revisi') revisiForm()
          else if (confirmAction === 'duplicate') duplicateForm()
          else doAction(confirmAction)
        }}
      />
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDetailStatusFrp
