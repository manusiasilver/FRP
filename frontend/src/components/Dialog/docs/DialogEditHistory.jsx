import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { RefreshCw, Save, X } from 'lucide-react'

import { token, Btn, Inp, Field, Sel, Divider, useIsMobile } from '../../../pages/document/SharedUI'

function Overlay({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(5px)', zIndex: 9000 }}
    />
  )
}

function ModalBox({ children, maxWidth = '700px', isMobile }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: isMobile ? 'max(12px,env(safe-area-inset-top,0px))' : '50%',
        left: '50%',
        transform: isMobile ? 'translateX(-50%)' : 'translate(-50%,-50%)',
        zIndex: 9001,
        background: token.surface,
        borderRadius: '1.1rem',
        boxShadow: '0 30px 80px rgba(15,23,42,0.25)',
        border: `1px solid ${token.border}`,
        maxHeight: isMobile ? 'calc(100dvh - 24px)' : '92vh',
        display: 'flex',
        flexDirection: 'column',
        width: isMobile ? 'calc(100vw - 24px)' : '92vw',
        maxWidth,
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  )
}

function DialogEditHistoryContent({ doc, templates, masterData, userName, onClose, onSaved }) {
  const isMobile = useIsMobile()
  const [form, setForm] = useState({
    company: doc.company,
    template_name: doc.template_name || templates[0] || '',
    judul_dokumen: doc.judul_dokumen || '',
    division: doc.division || '',
    internal_external: doc.internal_external || 'Internal',
    doc_date: doc.doc_date || '',
    klasifikasi: doc.klasifikasi || '',
    perihal: doc.perihal || '',
    signed_by: doc.signed_by || '',
    keterangan: doc.keterangan || '',
    link_document: doc.link_document || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const hChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const hSubmit = async (e) => {
    e.preventDefault()
    if (!form.division || !form.doc_date) {
      alert('Harap isi Divisi dan Tanggal!')
      return
    }
    setSaving(true)
    try {
      await axios.put(`/api/document/documents/${doc.id}`, form)
      onSaved?.()
      onClose?.()
    } catch {
      alert('Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const dialogNode = (
    <>
      <style>{'@keyframes dialogEditHistorySpin{to{transform:rotate(360deg)}}'}</style>
      <Overlay onClick={onClose} />
      <ModalBox maxWidth="800px" isMobile={isMobile}>
        <div
          style={{
            padding: isMobile ? '1rem' : '1.25rem 1.75rem',
            borderBottom: `1px solid ${token.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: token.surface,
            zIndex: 1,
            borderRadius: '1.1rem 1.1rem 0 0',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: token.muted }}>Edit Dokumen</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: token.blue }}>{doc.doc_number}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            style={{ background: 'rgba(26,42,87,0.07)', border: 'none', cursor: 'pointer', color: token.muted, padding: '0.4rem', borderRadius: '0.5rem', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={hSubmit} style={{ padding: isMobile ? '1rem' : '1rem 1.75rem 1.5rem' }}>
          <Divider label="Perusahaan" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Template">
              <Sel name="template_name" value={form.template_name} onChange={hChange}>
                {templates.map((t) => <option key={t} value={t}>{t}</option>)}
              </Sel>
            </Field>
            <Field label="Int/Ext">
              <Sel name="internal_external" value={form.internal_external} onChange={hChange}>
                <option value="Internal">Internal</option>
                <option value="External">External</option>
              </Sel>
            </Field>
            <Field label="Kode PT"><Inp value={form.company} readOnly /></Field>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Field label="Judul Dokumen">
              <Inp type="text" name="judul_dokumen" value={form.judul_dokumen} onChange={hChange} placeholder="Judul dokumen..." />
            </Field>
          </div>

          <Divider label="Pengguna & Tanggal" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="User"><Inp value={userName || ''} readOnly /></Field>
            <Field label="Divisi *">
              <Sel name="division" value={form.division} onChange={hChange} required>
                <option value="">-- Pilih --</option>
                {masterData.divisions.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
              </Sel>
            </Field>
            <Field label="Tanggal *"><Inp type="date" name="doc_date" value={form.doc_date} onChange={hChange} required /></Field>
            <Field label="Klasifikasi"><Inp type="text" name="klasifikasi" value={form.klasifikasi} onChange={hChange} /></Field>
          </div>

          <Divider label="Detail" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <Field label="Perihal"><Inp type="text" name="perihal" value={form.perihal} onChange={hChange} /></Field>
            <Field label="Ditandatangani Oleh"><Inp type="text" name="signed_by" value={form.signed_by} onChange={hChange} /></Field>
            <Field label="Link Dokumen"><Inp type="text" name="link_document" value={form.link_document} onChange={hChange} placeholder="https://..." /></Field>
            <Field label="Keterangan">
              <textarea
                name="keterangan"
                value={form.keterangan}
                onChange={hChange}
                rows={2}
                style={{
                  width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.88rem', color: token.text,
                  background: token.surface, border: `1px solid ${token.border}`, borderRadius: '0.5rem',
                  outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </Field>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${token.border}`, display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Btn variant="ghost" type="button" onClick={onClose}>Batal</Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving
                ? <><RefreshCw size={13} style={{ animation: 'dialogEditHistorySpin 1s linear infinite' }} /> Menyimpan...</>
                : <><Save size={13} /> Simpan Perubahan</>}
            </Btn>
          </div>
        </form>
      </ModalBox>
    </>
  )

  return createPortal(dialogNode, document.body)
}

function DialogEditHistory({ doc = null, templates = [], masterData = { divisions: [] }, userName = '', onClose, onSaved }) {
  if (!doc || typeof document === 'undefined') {
    return null
  }

  return (
    <DialogEditHistoryContent
      key={doc.id}
      doc={doc}
      templates={templates}
      masterData={masterData}
      userName={userName}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

export default DialogEditHistory
