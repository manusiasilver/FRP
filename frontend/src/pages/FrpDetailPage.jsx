import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import CreateButton from '../components/button/CreateButton'

const DOCS = ['Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak', 'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order']

const normalizeNumber = v => parseInt(String(v || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0

const statusColor = s => s === 'APPROVED' ? '#10b981' : s === 'REJECTED' ? '#ef4444' : '#f59e0b'

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
  const target = `print-preview-${Date.now()}`
  const printWindow = window.open('', target)

  if (!printWindow) {
    buildPostForm('/preview', payload, '_blank')
    return
  }

  let printed = false
  const triggerPrint = () => {
    if (printed) {
      return
    }

    try {
      printed = true
      printWindow.focus()
      printWindow.print()
    } catch {
      printed = false
    }
  }

  const poll = window.setInterval(() => {
    if (printWindow.closed) {
      window.clearInterval(poll)
      return
    }

    try {
      const readyState = printWindow.document?.readyState
      if (readyState === 'complete') {
        window.clearInterval(poll)
        window.setTimeout(triggerPrint, 250)
      }
    } catch {
      // Tunggu hingga dokumen preview selesai termuat dan bisa diakses.
    }
  }, 200)

  buildPostForm('/preview', payload, target)
}

export default function FrpDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const isApprovalEmbedded = new URLSearchParams(location.search).get('embedded') === 'approval'

  useEffect(() => {
    fetch(`/api/frp/${id}`)
      .then(r => r.json())
      .then(setPayload)
      .catch(() => setPayload(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Memuat...</div>
  if (!payload?.data) return <div style={{ padding: '2rem', color: '#ef4444' }}>Data FRP tidak ditemukan.</div>

  const { data, user, isIT, canApprove } = payload
  const items = Array.isArray(data.items) ? data.items : []
  const total = items.reduce((sum, item) => sum + normalizeNumber(item.amount), 0)

  const doAction = async (action) => {
    if (!window.confirm(`Anda yakin ingin melakukan ${action}?`)) return
    const res = await fetch(`/api/frp/${data.id}/${action}`, { method: 'POST' })
    const result = await res.json()
    if (result.success) window.parent.postMessage('refresh', '*')
    else window.alert('Gagal mengeksekusi aksi.')
  }

  const revisiForm = () => {
    if (!window.confirm('Anda yakin ingin merevisi FRP ini?')) return
    window.parent.location.href = `/?revisi=${data.id}`
  }

  const fieldStyle = { width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }
  const sectionStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }
  const actionBarStyle = { position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', boxShadow: '0 -4px 15px rgba(0,0,0,0.05)', zIndex: 1000, flexWrap: 'wrap', boxSizing: 'border-box' }

  return (
    <div style={{ background: 'transparent', minHeight: '100vh', paddingBottom: '80px', padding: '1rem' }}>
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '22px' }}>description</span>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Form Request Payment ({data.frpNo})</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Status: <strong style={{ color: statusColor(data.status) }}>{data.status}</strong></p>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-round" style={{ fontSize: '18px' }}>info</span> Informasi FRP</h3>
        <div style={grid2}>
          <div><label style={labelStyle}>Company Name</label><input readOnly value={data.companyName || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Tanggal FRP</label><input type="date" readOnly value={data.tanggalFrp || ''} style={fieldStyle} /></div>
        </div>
        <div style={grid2}>
          <div><label style={labelStyle}>Divisi</label><input readOnly value={data.divisi || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Diminta Oleh</label><input readOnly value={data.dimintaOleh || ''} style={fieldStyle} /></div>
        </div>
        <div><label style={labelStyle}>Keterangan FRP</label><textarea rows="2" readOnly value={data.keteranganFrp || ''} style={{ ...fieldStyle, resize: 'none' }} /></div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-round" style={{ fontSize: '18px' }}>store</span> Vendor & Pembayaran</h3>
        <div style={grid2}>
          <div><label style={labelStyle}>Vendor</label><input readOnly value={data.vendor || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Internal PO Number</label><input readOnly value={data.internalPoNumber || ''} style={fieldStyle} /></div>
        </div>
        <div style={grid3}>
          <div><label style={labelStyle}>Ext Doc Type</label><input readOnly value={data.extDocType || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Ext Doc Number</label><input readOnly value={data.extDocNumber || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Payment Method</label><input readOnly value={data.paymentMethod || ''} style={fieldStyle} /></div>
        </div>
        <div style={grid3}>
          <div><label style={labelStyle}>Payment Date</label><input type="date" readOnly value={data.paymentDate || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Bank Tujuan</label><input readOnly value={data.bankTujuan || ''} style={fieldStyle} /></div>
          <div><label style={labelStyle}>Rekening Bank Tujuan</label><input readOnly value={data.rekBankTujuan || ''} style={fieldStyle} /></div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-round" style={{ fontSize: '18px' }}>checklist</span> Checklist Documents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {DOCS.map(doc => {
            const checked = (data.checkDocs || []).includes(doc)
            return (
              <label key={doc} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1.5px solid ${checked ? '#2563eb' : '#e2e8f0'}`, background: checked ? '#eff6ff' : 'white', opacity: checked ? 1 : 0.6, cursor: 'default' }}>
                <input type="checkbox" checked={checked} disabled onChange={() => {}} />
                <span style={{ fontSize: '0.85rem' }}>{doc}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-round" style={{ fontSize: '18px' }}>receipt_long</span> Detail Pembayaran</h3>
        <div style={{ overflowX: 'auto' }}>
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
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>IDR {total.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={actionBarStyle}>
        {data.status === 'APPROVED' && <>
          <CreateButton variant="accordion" tone="primary" onClick={() => openPrintPreview(data)}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>print</span>
            Print
          </CreateButton>
          <CreateButton variant="accordion" tone="neutral" onClick={() => buildPostForm('/generate-pdf', data, '_blank')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>download</span>
            Download
          </CreateButton>
          {!isApprovalEmbedded && (canApprove || isIT) && <CreateButton variant="accordion" tone="warning" onClick={() => doAction('reject')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>cancel</span>
            Reject
          </CreateButton>}
        </>}
        {data.status === 'PENDING' && <>
          {(canApprove || isIT || data.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="danger" onClick={() => doAction('delete')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
            Hapus
          </CreateButton>}
          {(canApprove || isIT || data.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="primary" onClick={revisiForm}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
            Revisi
          </CreateButton>}
          {!isApprovalEmbedded && (canApprove || isIT) && <CreateButton variant="accordion" tone="warning" onClick={() => doAction('reject')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>cancel</span>
            Reject
          </CreateButton>}
          {!isApprovalEmbedded && (canApprove || isIT) && <CreateButton variant="accordion" onClick={() => doAction('approve')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>check_circle</span>
            Approve
          </CreateButton>}
        </>}
        {data.status === 'REJECTED' && <>
          {(canApprove || isIT || data.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="danger" onClick={() => doAction('delete')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
            Hapus
          </CreateButton>}
          {(canApprove || isIT || data.createdBy === user?.fullName) && <CreateButton variant="accordion" tone="primary" onClick={revisiForm}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
            Revisi
          </CreateButton>}
          {!isApprovalEmbedded && (canApprove || isIT) && <CreateButton variant="accordion" onClick={() => doAction('approve')}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>check_circle</span>
            Approve
          </CreateButton>}
        </>}
      </div>
    </div>
  )
}
