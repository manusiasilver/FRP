import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, RefreshCw, Save, Plus, Hash, CheckCircle2, Check } from 'lucide-react';
import '../../styles/frp/new-frp.css';
import SearchableSelect from '../../components/template/SearchableSelect.jsx';

function FloatingGroup({ label, children, style, className }) {
  return (
    <div className={`frp-float-group${className ? ' ' + className : ''}`} style={style}>
      {children}
      <span className="frp-float-label">{label}</span>
    </div>
  )
}

function DateField({ name, value, onChange, required }) {
  const inputRef = useRef(null)
  const openPicker = () => {
    if (!inputRef.current) return
    if (typeof inputRef.current.showPicker === 'function') {
      inputRef.current.showPicker()
      return
    }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div style={{ position: 'relative', display: 'block', lineHeight: 0 }} onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        name={name}
        className="frp-input"
        placeholder=" "
        required={required}
        style={{ paddingRight: '2.8rem', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'textfield', appearance: 'none', lineHeight: 'normal' }}
        value={value}
        onChange={onChange}
      />
      <button type="button" onClick={openPicker} style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: '#e2e8f0', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, pointerEvents: 'none' }}>
        <span className="material-icons-round" style={{ fontSize: '16px' }}>calendar_month</span>
      </button>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
        input[type="date"]::-webkit-inner-spin-button, input[type="date"]::-webkit-clear-button { display: none; }
      `}</style>
    </div>
  )
}

function ResultBanner({ doc, loading, isEditing, onDownload, onDuplicate, onSave, onNew }) {
  const [copied, setCopied] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleCopy = () => {
    if (doc) {
      navigator.clipboard.writeText(doc.doc_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', position: 'sticky', top: '0', zIndex: 50, overflow: 'hidden', marginBottom: '20px', flexShrink: 0, boxShadow: '0 10px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <CheckCircle2 size={16} color={doc ? "#10b981" : "#94a3b8"} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>Document Number</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 800, wordBreak: 'break-all', lineHeight: 1.2, color: doc ? '#1e293b' : '#94a3b8' }}>
          {doc ? doc.doc_number : `--/-----/--/${currentYear}`}
        </span>
        <button type="button" onClick={handleCopy} title="Salin" disabled={!doc} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', cursor: doc ? 'pointer' : 'not-allowed', color: copied ? '#10b981' : (doc ? '#475569' : '#cbd5e1'), display: 'flex', alignItems: 'center', opacity: doc ? 1 : 0.5, transition: 'all 0.2s' }}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={onNew} disabled={!doc} className="frp-btn-secondary" style={{ opacity: doc ? 1 : 0.5, cursor: doc ? 'pointer' : 'not-allowed' }}><Plus size={14} /> New</button>
        <button type="button" onClick={onDuplicate} disabled={!doc} className="frp-btn-secondary" style={{ opacity: doc ? 1 : 0.5, cursor: doc ? 'pointer' : 'not-allowed' }}><Copy size={14} /> Duplicate</button>
        <button type="button" onClick={onDownload} disabled={!doc} className="frp-btn-primary" style={{ opacity: doc ? 1 : 0.5, cursor: doc ? 'pointer' : 'not-allowed' }}><Download size={14} /> Download</button>

        {doc ? (
          <button type="button" onClick={onSave} disabled={loading} className="frp-btn-primary">
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Simpan
          </button>
        ) : (
          <button type="submit" disabled={loading} className="frp-btn-primary" style={{ marginLeft: 'auto', padding: '0.5rem 1.5rem' }}>
            {loading ? <><RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</> : isEditing ? <><Save size={17} /> Simpan Perubahan</> : <><Hash size={17} /> Generate Number</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function FormView({ editingDoc, generatedDoc, formData, templates, masterData, loading, hChange, hSubmit, hDownload, resetForm, startDuplicate, userName }) {
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  useEffect(() => { const handleResize = () => setViewportWidth(window.innerWidth); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize) }, [])
  const isMobile = viewportWidth < 768

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: isMobile ? '12px' : '16px' }}>
      <form onSubmit={hSubmit} className="frp-shell" style={{ overflowY: 'auto' }}>
        <ResultBanner 
          doc={generatedDoc} 
          loading={loading}
          isEditing={!!editingDoc}
          onDownload={() => hDownload(generatedDoc)} 
          onDuplicate={() => startDuplicate(generatedDoc)} 
          onSave={hSubmit} 
          onNew={resetForm}
        />
        <div className="frp-top-panel">
          {/* Card Perusahaan & Template */}
          <div className="frp-card">
            <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
              <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>business</span>
              Perusahaan & Template
            </h3>

            <div className="frp-grid-2">
              <FloatingGroup label="Kode PT">
                <SearchableSelect
                  name="company"
                  value={formData.company}
                  onChange={v => hChange({ target: { name: 'company', value: v } })}
                  options={[
                    { value: 'PNM', label: 'PT Pilar Niaga Makmur (PNM)' },
                    { value: 'PKS', label: 'PT Pilar Karang Samudera (PKS)' },
                    { value: 'PKP', label: 'PT Pilar Kargo Perkasa (PKP)' }
                  ]}
                  disabled={!!editingDoc}
                  className="frp-select"
                  searchable={false}
                />
              </FloatingGroup>

              <FloatingGroup label="Int/Ext">
                <SearchableSelect
                  name="internal_external"
                  value={formData.internal_external}
                  onChange={v => hChange({ target: { name: 'internal_external', value: v } })}
                  options={[
                    { value: 'Internal', label: 'Internal' },
                    { value: 'External', label: 'External' }
                  ]}
                  className="frp-select"
                  searchable={false}
                />
              </FloatingGroup>
            </div>

            <FloatingGroup label="Template" style={{ marginTop: '20px' }}>
              <SearchableSelect
                name="template_name"
                value={formData.template_name}
                onChange={v => hChange({ target: { name: 'template_name', value: v } })}
                options={templates.length === 0 ? [{ value: '', label: '— Belum ada template —' }] : templates.map(t => ({ value: t, label: t }))}
                className="frp-select"
                searchable={false}
              />
            </FloatingGroup>

            <FloatingGroup label="Judul Dokumen" style={{ marginTop: '20px' }}>
              <input type="text" name="judul_dokumen" value={formData.judul_dokumen} onChange={hChange} placeholder="Contoh: Perjanjian Kerja Sama Pemasaran..." required className="frp-input" />
            </FloatingGroup>
          </div>

          {/* Card Pengguna & Detail */}
          <div className="frp-card">
            <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
              <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>assignment</span>
              Detail Dokumen
            </h3>

            <div className="frp-grid-2">
              <FloatingGroup label="User">
                <input value={userName || ''} readOnly className="frp-input-readonly" />
              </FloatingGroup>

              <FloatingGroup label="Divisi">
                <SearchableSelect
                  name="division"
                  value={formData.division}
                  onChange={v => hChange({ target: { name: 'division', value: v } })}
                  options={[...new Set(masterData.divisions.map(d => d?.name).filter(Boolean))].map(name => ({ value: name, label: name }))}
                  placeholder="— Pilih —"
                  className="frp-select"
                />
              </FloatingGroup>
            </div>

            <div className="frp-grid-2" style={{ marginTop: '20px' }}>
              <FloatingGroup label="Tanggal">
                <DateField name="doc_date" value={formData.doc_date} onChange={hChange} required />
              </FloatingGroup>

              <FloatingGroup label="Klasifikasi">
                <input type="text" name="klasifikasi" value={formData.klasifikasi} onChange={hChange} placeholder="Klasifikasi..." className="frp-input" />
              </FloatingGroup>
            </div>

            <div className="frp-grid-2" style={{ marginTop: '20px' }}>
              <FloatingGroup label="Perihal">
                <input type="text" name="perihal" value={formData.perihal} onChange={hChange} placeholder="Perihal..." className="frp-input" />
              </FloatingGroup>

              <FloatingGroup label="Ditandatangani Oleh">
                <input type="text" name="signed_by" value={formData.signed_by} onChange={hChange} placeholder="Ditandatangani oleh..." className="frp-input" />
              </FloatingGroup>
            </div>
          </div>
        </div>

        {/* Card Keterangan & Link */}
        <div className="frp-bottom-panel" style={{ minHeight: '300px' }}>
          <div className="frp-card frp-card--scroll">
             <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
              <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>link</span>
              Keterangan & Lampiran
            </h3>
            <FloatingGroup label="Link Dokumen">
              <input type="text" name="link_document" value={formData.link_document} onChange={hChange} placeholder="https://..." className="frp-input" />
            </FloatingGroup>

            <FloatingGroup label="Keterangan" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100px' }}>
              <textarea name="keterangan" value={formData.keterangan} onChange={hChange} placeholder="Keterangan..." className="frp-textarea" style={{ height: '100%' }} />
            </FloatingGroup>
          </div>

        </div>
      </form>
    </main>
  );
}
