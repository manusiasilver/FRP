import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog'
import { XClose } from '../template/TemplateIcons.jsx'

const DOCS = [
  'Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak',
  'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order',
]

const normalizeNumber = v =>
  parseInt(String(v || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0

const formatDisplayDate = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function buildPostForm(action, payload, target = '_self') {
  const form = document.createElement('form')
  form.method = 'POST'; form.action = action; form.target = target; form.style.display = 'none'
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
  document.body.appendChild(form); form.submit(); document.body.removeChild(form)
}

function openPrintPreview(payload) {
  if (payload?.id) {
    window.open(`/api/frp/${encodeURIComponent(payload.id)}/print`, '_blank')
    return
  }
  buildPostForm('/print-pdf', payload, '_blank')
}

/* ── style tokens ── */
const fieldStyle = {
  width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0',
  borderRadius: '8px', background: '#f8fafc', fontSize: '0.85rem',
  boxSizing: 'border-box', fontFamily: 'inherit',
}
const sectionStyle = {
  background: 'white', border: '1px solid #e2e8f0',
  borderRadius: '12px', padding: '1rem', marginBottom: '0.5rem',
}
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', color: '#64748b', marginBottom: '4px',
}
const headingStyle = {
  margin: '0 0 10px', fontSize: '0.9rem', color: '#334155',
  display: 'flex', alignItems: 'center', gap: '6px',
}
const iconSz = { fontSize: '16px' }
const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }
const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  bg: '#fef9c3', color: '#854d0e', icon: 'schedule' },
  APPROVED: { label: 'Approved', bg: '#bbf7d0', color: '#166534', icon: 'check_circle' },
  REJECTED: { label: 'Rejected', bg: '#fecaca', color: '#991b1b', icon: 'cancel' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#e2e8f0', color: '#475569', icon: 'help' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      <span className="material-icons-round" style={{ fontSize: '13px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
function DialogStatusFrp({ isOpen = false, frpId = null, onClose }) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  /* fetch ketika dialog dibuka */
  useEffect(() => {
    if (!isOpen || !frpId) return
    setLoading(true); setError(null); setPayload(null)
    fetch(`/api/frp/${frpId}`)
      .then(r => { if (!r.ok) throw new Error('Gagal memuat data'); return r.json() })
      .then(d => setPayload(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [isOpen, frpId])

  /* tutup dengan Escape */
  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const data = payload?.data ?? null
  const items = Array.isArray(data?.items) ? data.items : []
  const total = items.reduce((sum, item) => sum + normalizeNumber(item.amount), 0)

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={onClose}
    >
      <style>{`
        .dsf-scrollbar::-webkit-scrollbar { display: none; }
        .dsf-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-status-frp-title"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(960px, calc(100vw - 48px))',
          maxHeight: '82vh',
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BackgroundDialog />

        {/* ── Header ── */}
        <div
          className="dashboard-popup__header"
          style={{
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexShrink: 0, position: 'relative', zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8' }}>
              Detail FRP
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2
                id="dialog-status-frp-title"
                style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2, fontFamily: 'monospace' }}
              >
                {data?.frpNo || frpId || '—'}
              </h2>
              {data && <StatusBadge status={data.status} />}
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            style={{
              flexShrink: 0, width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: '#94a3b8',
              cursor: 'pointer', borderRadius: '8px', transition: 'color 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#f8fafc' }}
            onMouseOut={e  => { e.currentTarget.style.color = '#94a3b8' }}
          >
            <XClose size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="dashboard-popup__body dsf-scrollbar"
          style={{
            flex: 1, overflowY: 'auto',
            padding: '8px 12px',
            position: 'relative', zIndex: 1,
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%)',
          }}
        >
          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '10px', color: '#64748b' }}>
              <span className="material-icons-round" style={{ fontSize: '28px', opacity: 0.4 }}>hourglass_empty</span>
              Memuat data...
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '10px', color: '#ef4444' }}>
              <span className="material-icons-round">error</span>
              {error}
            </div>
          )}

          {/* Konten */}
          {!loading && !error && data && (
            <>
              {/* Checklist Documents — grid kompak */}
              <div style={{ ...sectionStyle, marginBottom: '0.5rem' }}>
                <h3 style={headingStyle}>
                  <span className="material-icons-round" style={iconSz}>checklist</span>
                  Checklist Documents
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {DOCS.map(doc => {
                    const checked = (data.checkDocs || []).includes(doc)
                    return (
                      <label key={doc} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 10px', borderRadius: '8px',
                        border: `1px solid ${checked ? '#3b82f6' : '#cbd5e1'}`,
                        background: checked ? '#eff6ff' : 'white',
                        opacity: checked ? 1 : 0.5, cursor: 'default',
                      }}>
                        <input type="checkbox" checked={checked} disabled onChange={() => {}} style={{ margin: 0, width: '12px', height: '12px', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: checked ? 600 : 500, color: checked ? '#1d4ed8' : '#64748b', lineHeight: 1.3 }}>
                          {doc}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Row: Informasi FRP + Vendor & Pembayaran — 2 kolom sejajar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>

                {/* Informasi FRP */}
                <div style={{ ...sectionStyle, marginBottom: 0 }}>
                  <h3 style={headingStyle}>
                    <span className="material-icons-round" style={iconSz}>info</span>
                    Informasi FRP
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <div><label style={labelStyle}>Company</label><input readOnly value={data.companyName || ''} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Tanggal FRP</label><input readOnly value={formatDisplayDate(data.tanggalFrp)} style={fieldStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <div><label style={labelStyle}>Divisi</label><input readOnly value={data.divisi || ''} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Diminta Oleh</label><input readOnly value={data.dimintaOleh || ''} style={fieldStyle} /></div>
                  </div>
                  <div>
                    <label style={labelStyle}>Keterangan FRP</label>
                    <textarea rows="2" readOnly value={data.keteranganFrp || ''} style={{ ...fieldStyle, resize: 'none' }} />
                  </div>
                  {data.rpReference && (
                    <div style={{ marginTop: '6px' }}>
                      <label style={{ ...labelStyle, color: '#1d4ed8' }}>Referensi RP No</label>
                      <input readOnly value={data.rpReference} style={{ ...fieldStyle, color: '#1d4ed8', fontWeight: 'bold', background: '#eff6ff', border: '1.5px solid #bfdbfe' }} />
                    </div>
                  )}
                </div>

                {/* Vendor & Pembayaran */}
                <div style={{ ...sectionStyle, marginBottom: 0 }}>
                  <h3 style={headingStyle}>
                    <span className="material-icons-round" style={iconSz}>store</span>
                    Vendor &amp; Pembayaran
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <div><label style={labelStyle}>Vendor</label><input readOnly value={data.vendor || ''} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Internal PO No</label><input readOnly value={data.internalPoNumber || ''} style={fieldStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <div><label style={labelStyle}>Doc Type</label><input readOnly value={data.extDocType || ''} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Doc Number</label><input readOnly value={data.extDocNumber || ''} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Payment</label><input readOnly value={data.paymentMethod || ''} style={fieldStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <div><label style={labelStyle}>Payment Date</label><input readOnly value={formatDisplayDate(data.paymentDate)} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Bank Tujuan</label><input readOnly value={data.bankTujuan || ''} style={fieldStyle} /></div>
                    <div><label style={labelStyle}>Rekening</label><input readOnly value={data.rekBankTujuan || ''} style={fieldStyle} /></div>
                  </div>
                </div>
              </div>

              {/* Detail Pembayaran */}
              <div style={sectionStyle}>
                <h3 style={headingStyle}>
                  <span className="material-icons-round" style={iconSz}>receipt_long</span>
                  Detail Pembayaran
                </h3>
                <div className="dsf-scrollbar" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        {['No', 'Memo / Keterangan', 'Budget ID', 'Amount (IDR)'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', textAlign: 'left',
                            borderBottom: '2px solid #e2e8f0',
                            color: '#475569', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', width: '40px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                            <input readOnly value={item.memo || ''} style={{ ...fieldStyle, margin: 0 }} />
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                            <input readOnly value={item.budgetId || ''} style={{ ...fieldStyle, margin: 0 }} />
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                            <input readOnly value={item.amount || ''} style={{ ...fieldStyle, margin: 0, textAlign: 'right', fontFamily: 'monospace' }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '13px' }}>Total</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#1e40af' }}>
                          IDR {total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="dashboard-popup__actions"
          style={{
            flexShrink: 0, position: 'relative', zIndex: 1,
            padding: '12px 20px', background: '#f8fafc',
            borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          }}
        >
          {/* Total kiri */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
              Total Pembayaran
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', fontFamily: 'monospace' }}>
              {data ? `IDR ${total.toLocaleString('id-ID')}` : '—'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Tutup */}
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'transparent', color: '#64748b',
                border: '1px solid #cbd5e1', borderRadius: '6px',
                padding: '6px 16px', fontWeight: 600, fontSize: '0.75rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8' }}
              onMouseOut={e  => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#cbd5e1' }}
            >
              Tutup
            </button>

            {/* Edit */}
            {data && (
              <button
                type="button"
                onClick={() => { window.location.href = `/?revisi=${data.id}` }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '6px 14px', fontWeight: 600, fontSize: '0.75rem',
                  cursor: 'pointer', boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseOut={e  => { e.currentTarget.style.boxShadow = '0 4px 10px rgba(37,99,235,0.25)'; e.currentTarget.style.transform = 'none' }}
              >
                <span className="material-icons-round" style={{ fontSize: '14px' }}>edit</span>
                Edit
              </button>
            )}

            {/* Duplicate */}
            {data && (
              <button
                type="button"
                onClick={() => { window.location.href = `/?revisi=${data.id}&duplicate=1` }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'white', color: '#475569',
                  border: '1px solid #cbd5e1', borderRadius: '6px',
                  padding: '6px 14px', fontWeight: 600, fontSize: '0.75rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9' }}
                onMouseOut={e  => { e.currentTarget.style.background = 'white' }}
              >
                <span className="material-icons-round" style={{ fontSize: '14px' }}>content_copy</span>
                Duplicate
              </button>
            )}

            {/* Preview */}
            {data && (
              <button
                type="button"
                onClick={() => openPrintPreview(data)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'linear-gradient(135deg, #1a2a57 0%, #2d4a8c 100%)',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '6px 14px', fontWeight: 600, fontSize: '0.75rem',
                  cursor: 'pointer', boxShadow: '0 4px 10px rgba(26,42,87,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(26,42,87,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseOut={e  => { e.currentTarget.style.boxShadow = '0 4px 10px rgba(26,42,87,0.25)'; e.currentTarget.style.transform = 'none' }}
              >
                <span className="material-icons-round" style={{ fontSize: '14px' }}>visibility</span>
                Preview
              </button>
            )}

            {/* Download */}
            {data && (
              <button
                type="button"
                onClick={() => buildPostForm('/generate-pdf', data, '_blank')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '6px 14px', fontWeight: 600, fontSize: '0.75rem',
                  cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseOut={e  => { e.currentTarget.style.boxShadow = '0 4px 10px rgba(16,185,129,0.25)'; e.currentTarget.style.transform = 'none' }}
              >
                <span className="material-icons-round" style={{ fontSize: '14px' }}>download</span>
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogStatusFrp
