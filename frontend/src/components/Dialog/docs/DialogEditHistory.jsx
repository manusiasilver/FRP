import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { RefreshCw, Save } from 'lucide-react'

import SearchableSelect from '../../template/SearchableSelect.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'
import { token, Inp, Field, Divider, useIsMobile } from '../../../pages/document/SharedUI'

const asArray = (value) => (Array.isArray(value) ? value : [])

function toDateInputValue(value) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

const selectStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  fontSize: '0.88rem',
  color: token.text,
  background: token.surface,
  border: `1px solid ${token.border}`,
  borderRadius: '0.5rem',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const readonlySelectStyle = {
  ...selectStyle,
  background: '#f1f5f9',
  color: token.muted,
}

function DialogEditHistoryContent({ doc, templates, masterData, userName, onClose, onSaved }) {
  const isMobile = useIsMobile()
  const initialDivisions = asArray(masterData?.divisions)
  const [form, setForm] = useState({
    company: doc.company,
    template_name: doc.template_name || templates[0] || '',
    judul_dokumen: doc.judul_dokumen || '',
    division: doc.division || '',
    internal_external: doc.internal_external || 'Internal',
    doc_date: toDateInputValue(doc.doc_date),
    klasifikasi: doc.klasifikasi || '',
    perihal: doc.perihal || '',
    signed_by: doc.signed_by || '',
    keterangan: doc.keterangan || '',
    link_document: doc.link_document || '',
  })
  const [divisions, setDivisions] = useState(initialDivisions)
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

  useEffect(() => {
    let alive = true

    async function loadDivisions() {
      try {
        const response = await axios.get('/api/document/master-departments', { params: { company: doc.company } })
        if (alive) setDivisions(asArray(response.data?.departments))
      } catch {
        if (alive) setDivisions(initialDivisions)
      }
    }

    loadDivisions()

    return () => {
      alive = false
    }
  }, [doc.company])

  const hChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }))

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
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const templateOptions = templates.length === 0
    ? [{ value: '', label: 'Belum ada template' }]
    : templates.map((template) => ({ value: template, label: template }))
  const divisionOptions = [...new Set(divisions.map((division) => division?.name).filter(Boolean))]
    .map((division) => ({ value: division, label: division }))

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <form
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-history-title"
        onSubmit={hSubmit}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: isMobile ? 'min(100%, calc(100vw - 24px))' : 'min(92vw, 800px)',
          maxHeight: isMobile ? 'calc(100dvh - 24px)' : '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="dashboard-popup__header">
          <div style={{ minWidth: 0 }}>
            <p className="dashboard-popup__eyebrow">Edit Dokumen</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-history-title">
              {doc.doc_number}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            onClick={onClose}
            aria-label="Tutup dialog"
          >
            <XClose size={18} />
          </button>
        </div>

        <div
          className="dashboard-popup__body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: isMobile ? '1rem' : '1.25rem',
          }}
        >
          <Divider label="Perusahaan" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Template">
              <SearchableSelect
                name="template_name"
                value={form.template_name}
                onChange={(value) => setField('template_name', value)}
                options={templateOptions}
                placeholder="Pilih template"
                searchable={false}
                disabled={saving}
                style={selectStyle}
              />
            </Field>
            <Field label="Int/Ext">
              <SearchableSelect
                name="internal_external"
                value={form.internal_external}
                onChange={(value) => setField('internal_external', value)}
                options={[
                  { value: 'Internal', label: 'Internal' },
                  { value: 'External', label: 'External' },
                ]}
                placeholder="Pilih tipe"
                searchable={false}
                disabled={saving}
                style={selectStyle}
              />
            </Field>
            <Field label="Kode PT">
              <SearchableSelect
                name="company"
                value={form.company}
                onChange={() => {}}
                options={[
                  { value: 'PNM', label: 'PT Pilar Niaga Makmur (PNM)' },
                  { value: 'PKS', label: 'PT Pilar Karang Samudera (PKS)' },
                  { value: 'PKP', label: 'PT Pilar Kargo Perkasa (PKP)' },
                ]}
                searchable={false}
                disabled
                style={readonlySelectStyle}
              />
            </Field>
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
              <SearchableSelect
                name="division"
                value={form.division}
                onChange={(value) => setField('division', value)}
                options={divisionOptions}
                placeholder="Pilih divisi"
                disabled={saving}
                style={selectStyle}
              />
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
        </div>

        <div className="dashboard-popup__actions" style={{ flexWrap: 'wrap', paddingTop: '1rem', borderTop: `1px solid ${token.border}` }}>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="submit"
            className="dashboard-popup__button dashboard-popup__button--primary"
            disabled={saving}
          >
            {saving
              ? <><RefreshCw className="dashboard-popup__spinner" size={13} /> Menyimpan...</>
              : <><Save size={13} /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
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
