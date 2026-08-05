import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, X, Copy, Edit, Download, Link, FileText, ChevronLeft, ChevronRight, ChevronDown, Save, SlidersHorizontal, Globe, LayoutList, Inbox, SearchX, Clock } from 'lucide-react';
import { token, Btn, card, Inp, badgeStyles, Field, Sel, Divider } from './SharedUI';

const MOBILE_BP = 768;
// doc_date arrives either as "YYYY-MM-DD" or a full ISO datetime (API serializes the DB's DATE column via toISOString at UTC midnight) — read the calendar date back out in UTC so both shapes land on the same day regardless of the browser's local timezone
const formatDate = v => { if (!v) return '-'; try { const d = new Date(v); if (isNaN(d)) return v; return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d); } catch { return v; } };
// doc_date is date-only (always midnight); created_at is the only field carrying real time-of-day
const formatTime = v => { if (!v) return null; try { return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(v)) + ' WIB'; } catch { return null; } };
const dash = v => v || '-';

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages - 1, totalPages];
  if (currentPage >= totalPages - 2) return [1, 2, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

const pagBtnStyle = (disabled, active) => ({
  minWidth: '2.15rem', height: '2.15rem', padding: '0 0.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
  border: `1px solid ${active ? token.blueMid : token.border}`, borderRadius: '0.55rem',
  background: disabled ? '#f8fafc' : active ? 'rgba(45,74,140,0.1)' : '#ffffff',
  color: disabled ? token.muted : active ? token.blue : token.text,
  fontWeight: active ? 800 : 600, fontSize: '0.8rem', cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
});

function useIsMobile(bp = MOBILE_BP) {
  const [m, setM] = useState(() => window.innerWidth <= bp);
  useEffect(() => { const fn = () => setM(window.innerWidth <= bp); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, [bp]);
  return m;
}

function Overlay({ onClick }) { return <div onClick={onClick} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(5px)', zIndex: 9000 }} />; }

function ModalBox({ children, maxWidth = '700px', isMobile }) {
  return (
    <div style={{ position: 'fixed', top: isMobile ? 'max(12px,env(safe-area-inset-top,0px))' : '50%', left: '50%', transform: isMobile ? 'translateX(-50%)' : 'translate(-50%,-50%)', zIndex: 9001, background: token.surface, borderRadius: '1.1rem', boxShadow: '0 30px 80px rgba(15,23,42,0.25)', border: `1px solid ${token.border}`, maxHeight: isMobile ? 'calc(100dvh - 24px)' : '92vh', display: 'flex', flexDirection: 'column', width: isMobile ? 'calc(100vw - 24px)' : '92vw', maxWidth, overflowY: 'auto' }}>
      {children}
    </div>
  );
}

function EditModal({ doc, templates, masterData, onClose, onSaved, userName }) {
  const [form, setForm] = useState({ company: doc.company, template_name: doc.template_name || templates[0] || '', judul_dokumen: doc.judul_dokumen || '', division: doc.division || '', internal_external: doc.internal_external || 'Internal', doc_date: doc.doc_date || '', klasifikasi: doc.klasifikasi || '', perihal: doc.perihal || '', signed_by: doc.signed_by || '', keterangan: doc.keterangan || '', link_document: doc.link_document || '' });
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();
  const hChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const hSubmit = async e => { e.preventDefault(); if (!form.division || !form.doc_date) { alert('Harap isi Divisi dan Tanggal!'); return; } setSaving(true); try { await axios.put(`/api/document/documents/${doc.id}`, form); onSaved(); onClose(); } catch { alert('Gagal menyimpan.'); } finally { setSaving(false); } };

  return (
    <>
      <Overlay onClick={onClose} />
      <ModalBox maxWidth="800px" isMobile={isMobile}>
        <div style={{ padding: isMobile ? '1rem' : '1.25rem 1.75rem', borderBottom: `1px solid ${token.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: token.surface, zIndex: 1, borderRadius: '1.1rem 1.1rem 0 0' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: token.muted }}>Edit Dokumen</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: token.blue }}>{doc.doc_number}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(26,42,87,0.07)', border: 'none', cursor: 'pointer', color: token.muted, padding: '0.4rem', borderRadius: '0.5rem', display: 'flex' }}><X size={18} /></button>
        </div>
        <form onSubmit={hSubmit} style={{ padding: isMobile ? '1rem' : '1rem 1.75rem 1.5rem' }}>
          <Divider label="Perusahaan" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Template"><Sel name="template_name" value={form.template_name} onChange={hChange}>{templates.map(t => <option key={t} value={t}>{t}</option>)}</Sel></Field>
            <Field label="Int/Ext"><Sel name="internal_external" value={form.internal_external} onChange={hChange}><option value="Internal">Internal</option><option value="External">External</option></Sel></Field>
            <Field label="Kode PT"><Inp value={form.company} readOnly /></Field>
          </div>
          <div style={{ marginTop: '1rem' }}><Field label="Judul Dokumen"><Inp type="text" name="judul_dokumen" value={form.judul_dokumen} onChange={hChange} placeholder="Judul dokumen..." /></Field></div>
          <Divider label="Pengguna & Tanggal" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="User"><Inp value={userName || ''} readOnly /></Field>
            <Field label="Divisi *"><Sel name="division" value={form.division} onChange={hChange} required><option value="">-- Pilih --</option>{masterData.divisions.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}</Sel></Field>
            <Field label="Tanggal *"><Inp type="date" name="doc_date" value={form.doc_date} onChange={hChange} required /></Field>
            <Field label="Klasifikasi"><Inp type="text" name="klasifikasi" value={form.klasifikasi} onChange={hChange} /></Field>
          </div>
          <Divider label="Detail" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <Field label="Perihal"><Inp type="text" name="perihal" value={form.perihal} onChange={hChange} /></Field>
            <Field label="Ditandatangani Oleh"><Inp type="text" name="signed_by" value={form.signed_by} onChange={hChange} /></Field>
            <Field label="Link Dokumen"><Inp type="text" name="link_document" value={form.link_document} onChange={hChange} placeholder="https://..." /></Field>
            <Field label="Keterangan"><textarea name="keterangan" value={form.keterangan} onChange={hChange} rows={2} style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.88rem', color: token.text, background: token.surface, border: `1px solid ${token.border}`, borderRadius: '0.5rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} /></Field>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${token.border}`, display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Btn variant="ghost" type="button" onClick={onClose}>Batal</Btn>
            <Btn variant="primary" type="submit" disabled={saving}>{saving ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : <><Save size={13} /> Simpan Perubahan</>}</Btn>
          </div>
        </form>
      </ModalBox>
    </>
  );
}

function EmptyState({ hasFilters, onReset }) {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '1.25rem', background: hasFilters ? 'rgba(239,68,68,0.07)' : 'rgba(26,42,87,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
        {hasFilters ? <SearchX size={32} style={{ color: '#ef4444', opacity: 0.75 }} /> : <Inbox size={32} style={{ color: '#2d4a8c', opacity: 0.55 }} />}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: hasFilters ? '#b91c1c' : '#1e293b', marginBottom: '0.45rem' }}>{hasFilters ? 'Tidak ada hasil' : 'Belum ada dokumen'}</div>
      <div style={{ fontSize: '0.82rem', color: '#8a93a6', maxWidth: '300px', lineHeight: 1.65, marginBottom: hasFilters ? '1.25rem' : 0 }}>{hasFilters ? 'Coba hapus filter atau ubah kata pencarian.' : 'Dokumen yang digenerate akan muncul di sini.'}</div>
      {hasFilters && <button type="button" onClick={onReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, borderRadius: '0.55rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}><X size={13} /> Hapus Filter</button>}
    </div>
  );
}

const thStyle = { padding: '1rem 1.15rem', textAlign: 'left', fontWeight: 700, fontSize: '0.66rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: token.muted, whiteSpace: 'nowrap', background: 'linear-gradient(180deg,#f8fafc,#eef2f6)' };
const tdStyle = { padding: '1rem 1.15rem', verticalAlign: 'top', borderBottom: `1px solid ${token.border}` };

const filterCtrlStyle = { width: '100%', height: '2.25rem', padding: '0 0.85rem', fontSize: '0.82rem', border: '1px solid rgba(26,42,87,0.12)', borderRadius: '0.6rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: '#f8fafc', boxSizing: 'border-box' };
const filterSelStyle = { ...filterCtrlStyle, cursor: 'pointer', appearance: 'none', padding: '0 1.9rem 0 0.85rem', backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1em' };

function FilterField({ label, width, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem', width, flexShrink: 0 }}>
      <span style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: token.muted, paddingLeft: '0.15rem' }}>{label}</span>
      {children}
    </div>
  );
}

export default function HistoryView({ filtered, pageSize, setPageSize, setCurrentPage, fetchData, tableLoading, searchTerm, setSearchTerm, searchDate, setSearchDate, searchIntExt, setSearchIntExt, searchCompany, setSearchCompany, searchDivision, setSearchDivision, companyOptions = [], divisionOptions = [], pageData, currentPage, hDownload, totalPages, masterData, templates, userName }) {
  const [editDoc, setEditDoc] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const toggleRow = id => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isMobile = useIsMobile();
  const hasFilters = !!(searchTerm || searchDate || searchIntExt || searchCompany || searchDivision);
  const resetFilters = () => { setSearchTerm(''); setSearchDate(''); setSearchIntExt(''); setSearchCompany(''); setSearchDivision(''); setCurrentPage(1); };

  return (
    <div style={{ position: 'relative', height: isMobile ? 'auto' : '100%', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {editDoc && <EditModal doc={editDoc} templates={templates} masterData={masterData} userName={userName} onClose={() => setEditDoc(null)} onSaved={() => { fetchData(); setEditDoc(null); }} />}

      <div style={{ ...card, padding: isMobile ? '0.75rem' : '1rem', borderRadius: isMobile ? '1rem' : '1.25rem', flex: isMobile ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : 0, overflow: isMobile ? 'visible' : 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,255,0.98))', border: '1.5px solid rgba(26,42,87,0.10)' }}>

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? '0.8rem' : '0.85rem', marginBottom: '1rem', justifyContent: 'space-between', padding: isMobile ? '1rem' : '0.85rem 1rem', background: '#ffffff', borderRadius: '1rem', border: '1px solid rgba(26,42,87,0.08)', boxShadow: '0 4px 15px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.8rem' : '0.85rem', flex: 1 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: token.blue, height: '2.25rem', flexShrink: 0 }}>
              <SlidersHorizontal size={15} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: isMobile ? '0.6rem' : '0.85rem', flex: 1, width: '100%' }}>
              <FilterField label="Cari" width={isMobile ? '100%' : '190px'}>
                <input type="search" value={searchTerm} placeholder="No. dokumen, judul..." onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ ...filterCtrlStyle, transition: 'border-color 0.2s' }} />
              </FilterField>

              <FilterField label="Perusahaan" width={isMobile ? 'calc(50% - 0.3rem)' : '120px'}>
                <select value={searchCompany} onChange={e => { setSearchCompany(e.target.value); setCurrentPage(1); }} style={filterSelStyle}>
                  <option value="">Semua</option>
                  {companyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FilterField>

              <FilterField label="Divisi" width={isMobile ? 'calc(50% - 0.3rem)' : '150px'}>
                <select value={searchDivision} onChange={e => { setSearchDivision(e.target.value); setCurrentPage(1); }} style={filterSelStyle}>
                  <option value="">Semua</option>
                  {divisionOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </FilterField>

              <FilterField label="Tipe" width={isMobile ? 'calc(50% - 0.3rem)' : '120px'}>
                <select value={searchIntExt} onChange={e => { setSearchIntExt(e.target.value); setCurrentPage(1); }} style={filterSelStyle}>
                  <option value="">Semua</option><option value="Internal">Internal</option><option value="External">External</option>
                </select>
              </FilterField>

              <FilterField label="Tanggal" width={isMobile ? 'calc(50% - 0.3rem)' : '145px'}>
                <input type="date" value={searchDate} onChange={e => { setSearchDate(e.target.value); setCurrentPage(1); }} style={filterCtrlStyle} />
              </FilterField>

              {hasFilters && (
                <button type="button" onClick={resetFilters} style={{ height: '2.25rem', padding: '0 0.85rem', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.6rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', whiteSpace: 'nowrap', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}><X size={14} /> Reset</button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, justifyContent: isMobile ? 'space-between' : 'flex-end', marginTop: isMobile ? '0.5rem' : 0, paddingTop: isMobile ? '0.8rem' : 0, borderTop: isMobile ? '1px dashed rgba(26,42,87,0.1)' : 'none', width: isMobile ? '100%' : 'auto' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: token.blueMid, background: 'rgba(26,42,87,0.05)', border: '1px solid rgba(26,42,87,0.08)', padding: '0.4rem 0.85rem', borderRadius: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', height: '2.25rem', boxSizing: 'border-box' }}>
              <FileText size={13} style={{ color: token.blue }} /> {filtered.length} dokumen
            </span>
            <button type="button" onClick={fetchData} disabled={tableLoading} title="Refresh Data" style={{ height: '2.25rem', padding: '0 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid rgba(26,42,87,0.12)', borderRadius: '0.6rem', background: '#ffffff', cursor: tableLoading ? 'not-allowed' : 'pointer', color: token.text, transition: 'all 0.2s', fontWeight: 600, fontSize: '0.8rem', boxShadow: '0 1px 2px rgba(15,23,42,0.02)' }}>
              <RefreshCw size={14} style={{ color: token.muted, ...(tableLoading ? { animation: 'spin 1s linear infinite' } : {}) }} />
              <span style={{ display: isMobile ? 'inline' : 'none' }}>Refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        {isMobile ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {pageData.length === 0 ? <EmptyState hasFilters={hasFilters} onReset={resetFilters} /> : (
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {pageData.map((doc, idx) => (
                  <div key={doc.id} style={{ border: '1px solid rgba(26,42,87,0.10)', borderRadius: '1rem', background: 'white', padding: '1rem' }}>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: token.blue, marginBottom: '0.5rem', wordBreak: 'break-word' }}>{doc.doc_number}</div>
                    <div style={{ fontSize: '0.85rem', color: token.text, fontWeight: 600, marginBottom: '0.5rem' }}>{dash(doc.judul_dokumen)}</div>
                    <div style={{ fontSize: '0.78rem', color: token.muted, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <span>{formatDate(doc.doc_date)}</span>
                      {formatTime(doc.created_at) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}><Clock size={10} />{formatTime(doc.created_at)}</span>}
                      <span>· {dash(doc.division)} · {dash(doc.internal_external)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Btn variant="ghost" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setEditDoc(doc)}><Edit size={12} /> Edit</Btn>
                      <Btn variant="success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} onClick={() => hDownload(doc)}><Download size={12} /> Download</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'white', borderRadius: '1rem', border: '1px solid rgba(26,42,87,0.10)' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.845rem', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>{['No','Kode PT','No. Dokumen','Judul','Tanggal','User','Divisi','Int/Ext','Aksi'].map(h => <th key={h} style={{ ...thStyle, borderBottom: `1px solid ${token.border}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr><td colSpan={9}><EmptyState hasFilters={hasFilters} onReset={resetFilters} /></td></tr>
                ) : pageData.map((doc, idx) => (
                  <tr key={doc.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,42,87,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, textAlign: 'center', width: '4%' }}><span style={{ fontSize: '0.72rem', color: token.muted, fontWeight: 700 }}>{(currentPage - 1) * pageSize + idx + 1}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'center', width: '7%' }}><span style={{ ...(badgeStyles[doc.company] || {}), padding: '0.24rem 0.58rem', borderRadius: '999px', fontSize: '0.66rem', fontWeight: 700, display: 'inline-block' }}>{doc.company}</span></td>
                    <td style={{ ...tdStyle, width: '19%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: token.text, wordBreak: 'break-word', flex: 1 }}>{doc.doc_number}</span>
                        <button onClick={() => { navigator.clipboard.writeText(doc.doc_number); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: token.muted, padding: '0.1rem', display: 'flex' }} title="Salin"><Copy size={12} /></button>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, width: '20%' }}><div style={{ fontSize: '0.82rem', fontWeight: 600, color: token.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{dash(doc.judul_dokumen)}</div></td>
                    <td style={{ ...tdStyle, width: '10%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: token.text, whiteSpace: 'nowrap' }}>{formatDate(doc.doc_date)}</span>
                        {formatTime(doc.created_at) && <span style={{ fontSize: '0.7rem', color: token.muted, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}><Clock size={10} />{formatTime(doc.created_at)}</span>}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, width: '11%' }}><span style={{ fontSize: '0.82rem', color: token.text }}>{dash(doc.user_name)}</span></td>
                    <td style={{ ...tdStyle, width: '13%' }}><span style={{ fontSize: '0.82rem', color: token.text }}>{dash(doc.division)}</span></td>
                    <td style={{ ...tdStyle, width: '9%' }}><span style={{ fontSize: '0.78rem', color: token.muted }}>{dash(doc.internal_external)}</span></td>
                    <td style={{ ...tdStyle, width: '7%' }}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setEditDoc(doc)} title="Edit" style={{ background: 'rgba(26,42,87,0.06)', border: `1px solid ${token.border}`, borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: token.blue, display: 'flex' }}><Edit size={13} /></button>
                        <button onClick={() => hDownload(doc)} title="Download" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: '#059669', display: 'flex' }}><Download size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', padding: isMobile ? '0.75rem' : '0.6rem 0.85rem', flexWrap: 'wrap', gap: '0.65rem', flexShrink: 0, background: '#ffffff', borderRadius: '0.85rem', border: `1px solid ${token.border}`, boxShadow: '0 1px 2px rgba(15,23,42,0.02)' }}>
          <span style={{ fontSize: '0.78rem', color: token.muted, whiteSpace: 'nowrap' }}>
            Menampilkan <strong style={{ color: token.text }}>{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>–<strong style={{ color: token.text }}>{Math.min(currentPage * pageSize, filtered.length)}</strong> dari <strong style={{ color: token.text }}>{filtered.length}</strong> dokumen
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: token.muted, whiteSpace: 'nowrap' }}>Baris per halaman</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ height: '2.15rem', padding: '0 1.8rem 0 0.7rem', fontSize: '0.8rem', border: `1px solid ${token.border}`, borderRadius: '0.55rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: '#ffffff', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.55rem center', backgroundSize: '1em' }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ width: '1px', height: '1.3rem', background: token.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={pagBtnStyle(currentPage === 1, false)} title="Sebelumnya">
                <ChevronLeft size={14} />{!isMobile && <span>Prev</span>}
              </button>
              {getPaginationItems(currentPage, totalPages).map((item, i) => (
                typeof item === 'number' ? (
                  <button key={i} onClick={() => setCurrentPage(item)} disabled={item === currentPage} style={pagBtnStyle(false, item === currentPage)} aria-current={item === currentPage ? 'page' : undefined}>
                    {item}
                  </button>
                ) : (
                  <span key={i} style={{ color: token.muted, padding: '0 0.2rem', fontSize: '0.8rem' }}>…</span>
                )
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pagBtnStyle(currentPage === totalPages, false)} title="Berikutnya">
                {!isMobile && <span>Next</span>}<ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
