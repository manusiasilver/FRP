import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Edit, Download, Link, ChevronLeft, ChevronRight, ChevronDown, Search, Inbox, SearchX, Clock } from 'lucide-react';
import { token, Btn, card, badgeStyles, useIsMobile } from './SharedUI';
import DialogEditHistory from '../../components/Dialog/docs/DialogEditHistory.jsx';

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

const thStyle = { padding: '1rem 1.15rem', textAlign: 'left', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: token.muted, whiteSpace: 'nowrap', background: 'linear-gradient(180deg,#f8fafc,#eef2f6)', borderBottom: `2px solid ${token.blueLight}`, boxSizing: 'border-box' };
const tdStyle = { padding: '1rem 1.15rem', verticalAlign: 'top', borderBottom: `1px solid ${token.border}`, boxSizing: 'border-box' };

const COLUMNS = [
  { key: 'no', label: 'No', width: 48 },
  { key: 'company', label: 'Kode PT', width: 82 },
  { key: 'doc_number', label: 'No. Dokumen', width: 185 },
  { key: 'judul_dokumen', label: 'Judul Dokumen', width: 210 },
  { key: 'klasifikasi', label: 'Klasifikasi', width: 145 },
  { key: 'perihal', label: 'Perihal', width: 165 },
  { key: 'division', label: 'Divisi', width: 130 },
  { key: 'internal_external', label: 'Int/Ext', width: 92 },
  { key: 'user_name', label: 'User', width: 120 },
  { key: 'signed_by', label: 'Ditandatangani', width: 145 },
  { key: 'keterangan', label: 'Keterangan', width: 185 },
  { key: 'link_document', label: 'Link Dokumen', width: 165 },
  { key: 'created_at', label: 'Dibuat', width: 145 },
  { key: 'updated_at', label: 'Diperbarui', width: 145 },
  { key: 'aksi', label: 'Aksi', width: 96 },
];
const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const clampStyle = { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

const filterCtrlStyle = { width: '100%', height: '2.25rem', padding: '0 0.85rem', fontSize: '0.82rem', border: '1px solid rgba(26,42,87,0.12)', borderRadius: '0.6rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s' };
const filterSelStyle = { ...filterCtrlStyle, cursor: 'pointer', appearance: 'none', padding: '0 1.9rem 0 0.85rem', backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1em' };

const hFocus = e => { e.target.style.borderColor = token.blueMid; e.target.style.boxShadow = '0 0 0 3px rgba(45,74,140,0.12)'; };
const hBlur = e => { e.target.style.borderColor = 'rgba(26,42,87,0.12)'; e.target.style.boxShadow = 'none'; };

function FilterField({ label, width, flex, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem', width, flex, flexShrink: flex ? 1 : 0 }}>
      <span style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: token.muted, paddingLeft: '0.15rem' }}>{label}</span>
      {children}
    </div>
  );
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const onDocDown = e => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [ref, handler]);
}

function SearchableSelect({ value, onChange, options, placeholder = 'Semua' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  useClickOutside(rootRef, () => { setOpen(false); setQuery(''); });
  const filtered = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;
  const pick = v => { onChange(v); setOpen(false); setQuery(''); };

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ ...filterCtrlStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer', color: value ? token.text : token.muted, borderColor: open ? token.blueMid : 'rgba(26,42,87,0.12)', boxShadow: open ? '0 0 0 3px rgba(45,74,140,0.12)' : 'none' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
        <ChevronDown size={14} style={{ color: token.muted, flexShrink: 0, marginLeft: '0.4rem', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', width: 'max-content', maxWidth: '260px', background: '#ffffff', border: `1px solid ${token.border}`, borderRadius: '0.65rem', boxShadow: '0 14px 34px rgba(15,23,42,0.16)', zIndex: 30, overflow: 'hidden' }}>
          <div style={{ padding: '0.45rem', borderBottom: `1px solid ${token.border}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', color: token.muted, pointerEvents: 'none' }} />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari..." style={{ width: '100%', height: '2rem', padding: '0 0.5rem 0 1.75rem', fontSize: '0.8rem', border: `1px solid ${token.border}`, borderRadius: '0.45rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: token.text }} onFocus={hFocus} onBlur={hBlur} />
            </div>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '0.3rem' }}>
            <div
              onClick={() => pick('')}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = 'rgba(26,42,87,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = !value ? 'rgba(45,74,140,0.08)' : 'transparent'; }}
              style={{ padding: '0.5rem 0.6rem', fontSize: '0.82rem', borderRadius: '0.4rem', cursor: 'pointer', color: !value ? token.blue : token.text, fontWeight: !value ? 700 : 500, background: !value ? 'rgba(45,74,140,0.08)' : 'transparent' }}
            >{placeholder}</div>
            {filtered.length === 0 && <div style={{ padding: '0.6rem', fontSize: '0.78rem', color: token.muted, textAlign: 'center' }}>Tidak ditemukan</div>}
            {filtered.map(opt => (
              <div
                key={opt}
                onClick={() => pick(opt)}
                onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = 'rgba(26,42,87,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = value === opt ? 'rgba(45,74,140,0.08)' : 'transparent'; }}
                style={{ padding: '0.5rem 0.6rem', fontSize: '0.82rem', borderRadius: '0.4rem', cursor: 'pointer', color: value === opt ? token.blue : token.text, fontWeight: value === opt ? 700 : 500, background: value === opt ? 'rgba(45,74,140,0.08)' : 'transparent' }}
              >{opt}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryView({ filtered, pageSize, setPageSize, setCurrentPage, fetchData, tableLoading, searchTerm, setSearchTerm, searchDate, setSearchDate, searchIntExt, setSearchIntExt, searchCompany, setSearchCompany, searchDivision, setSearchDivision, searchUser, setSearchUser, companyOptions = [], divisionOptions = [], userOptions = [], pageData, currentPage, hDownload, totalPages, masterData, templates, userName }) {
  const [editDoc, setEditDoc] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const toggleRow = id => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isMobile = useIsMobile();
  const hasFilters = !!(searchTerm || searchDate || searchIntExt || searchCompany || searchDivision || searchUser);
  const resetFilters = () => { setSearchTerm(''); setSearchDate(''); setSearchIntExt(''); setSearchCompany(''); setSearchDivision(''); setSearchUser(''); setCurrentPage(1); };

  return (
    <div style={{ position: 'relative', height: isMobile ? 'auto' : '100%', flex: isMobile ? '0 0 auto' : '1 1 0', minHeight: 0, padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%', overflow: isMobile ? 'visible' : 'hidden' }}>
      <DialogEditHistory doc={editDoc} templates={templates} masterData={masterData} userName={userName} onClose={() => setEditDoc(null)} onSaved={() => { fetchData(); setEditDoc(null); }} />

      <div style={{ ...card, padding: isMobile ? '0.75rem' : '1rem', borderRadius: isMobile ? '1rem' : '1.25rem', flex: isMobile ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : 0, overflow: isMobile ? 'visible' : 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,255,0.98))', border: '1.5px solid rgba(26,42,87,0.10)' }}>

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: isMobile ? '0.6rem' : '0.85rem', marginBottom: '1rem', padding: isMobile ? '1rem' : '0.85rem 1rem', background: '#ffffff', borderRadius: '1rem', border: '1px solid rgba(26,42,87,0.08)', boxShadow: '0 4px 15px rgba(15,23,42,0.03)' }}>
          <FilterField label="Cari" width={isMobile ? '100%' : undefined} flex={isMobile ? undefined : '1 1 260px'}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: token.muted, pointerEvents: 'none' }} />
              <input type="search" value={searchTerm} placeholder="No. dokumen, judul..." onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ ...filterCtrlStyle, width: '100%', paddingLeft: '2.15rem' }} onFocus={hFocus} onBlur={hBlur} />
            </div>
          </FilterField>

          <FilterField label="Perusahaan" width={isMobile ? 'calc(50% - 0.3rem)' : '140px'}>
            <SearchableSelect value={searchCompany} onChange={v => { setSearchCompany(v); setCurrentPage(1); }} options={companyOptions} />
          </FilterField>

          <FilterField label="Divisi" width={isMobile ? 'calc(50% - 0.3rem)' : '170px'}>
            <SearchableSelect value={searchDivision} onChange={v => { setSearchDivision(v); setCurrentPage(1); }} options={divisionOptions} />
          </FilterField>

          <FilterField label="User" width={isMobile ? 'calc(50% - 0.3rem)' : '170px'}>
            <SearchableSelect value={searchUser} onChange={v => { setSearchUser(v); setCurrentPage(1); }} options={userOptions} />
          </FilterField>

          <FilterField label="Tipe" width={isMobile ? 'calc(50% - 0.3rem)' : '120px'}>
            <select value={searchIntExt} onChange={e => { setSearchIntExt(e.target.value); setCurrentPage(1); }} style={filterSelStyle} onFocus={hFocus} onBlur={hBlur}>
              <option value="">Semua</option><option value="Internal">Internal</option><option value="External">External</option>
            </select>
          </FilterField>

          <FilterField label="Tanggal" width={isMobile ? 'calc(50% - 0.3rem)' : '145px'}>
            <input type="date" value={searchDate} onChange={e => { setSearchDate(e.target.value); setCurrentPage(1); }} style={filterCtrlStyle} onFocus={hFocus} onBlur={hBlur} />
          </FilterField>

          {hasFilters && (
            <button type="button" onClick={resetFilters} style={{ height: '2.25rem', padding: '0 0.85rem', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.6rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', whiteSpace: 'nowrap', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}><X size={14} /> Reset</button>
          )}
        </div>

        {/* Table */}
        {isMobile ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {pageData.length === 0 ? <EmptyState hasFilters={hasFilters} onReset={resetFilters} /> : (
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {pageData.map((doc, idx) => (
                  <div key={doc.id} style={{ border: '1px solid rgba(26,42,87,0.10)', borderRadius: '1rem', background: 'white', padding: '1.15rem' }}>
                    <div style={{ fontSize: '1.08rem', fontWeight: 800, color: token.blue, marginBottom: '0.55rem', lineHeight: 1.35, wordBreak: 'break-word' }}>{doc.doc_number}</div>
                    <div style={{ fontSize: '0.94rem', color: token.text, fontWeight: 700, marginBottom: '0.6rem', lineHeight: 1.45 }}>{dash(doc.judul_dokumen)}</div>
                    <div style={{ fontSize: '0.84rem', color: token.muted, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', lineHeight: 1.45 }}>
                      <span>{formatDate(doc.doc_date)}</span>
                      {formatTime(doc.created_at) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}><Clock size={10} />{formatTime(doc.created_at)}</span>}
                      <span>· {dash(doc.division)} · {dash(doc.internal_external)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Btn variant="ghost" style={{ padding: '0.58rem 0.85rem', fontSize: '0.82rem' }} onClick={() => setEditDoc(doc)}><Edit size={13} /> Edit</Btn>
                      <Btn variant="success" style={{ padding: '0.58rem 0.85rem', fontSize: '0.82rem' }} onClick={() => hDownload(doc)}><Download size={13} /> Download</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'white', borderRadius: '1rem', border: '1px solid rgba(26,42,87,0.10)' }}>
            <table style={{ width: '100%', minWidth: `${TABLE_MIN_WIDTH}px`, borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.9rem', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>{COLUMNS.map(c => <th key={c.key} style={{ ...thStyle, width: c.width }}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr><td colSpan={COLUMNS.length}><EmptyState hasFilters={hasFilters} onReset={resetFilters} /></td></tr>
                ) : pageData.map((doc, idx) => (
                  <tr key={doc.id} style={{ transition: 'background 0.15s', background: idx % 2 === 1 ? 'rgba(26,42,87,0.015)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,42,87,0.045)'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(26,42,87,0.015)' : 'transparent'}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ fontSize: '0.8rem', color: token.muted, fontWeight: 800 }}>{(currentPage - 1) * pageSize + idx + 1}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ ...(badgeStyles[doc.company] || {}), padding: '0.3rem 0.68rem', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-block' }}>{doc.company}</span></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: token.text, lineHeight: 1.4, wordBreak: 'break-word', flex: 1 }}>{doc.doc_number}</span>
                        <button onClick={() => { navigator.clipboard.writeText(doc.doc_number); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: token.muted, padding: '0.15rem', display: 'flex', flexShrink: 0 }} title="Salin"><Copy size={14} /></button>
                      </div>
                    </td>
                    <td style={tdStyle}><div style={{ fontSize: '0.92rem', fontWeight: 700, color: token.text, lineHeight: 1.45, ...clampStyle }}>{dash(doc.judul_dokumen)}</div></td>
                    <td style={tdStyle}><div style={{ fontSize: '0.9rem', color: token.text, lineHeight: 1.45, ...clampStyle }}>{dash(doc.klasifikasi)}</div></td>
                    <td style={tdStyle}><div style={{ fontSize: '0.9rem', color: token.text, lineHeight: 1.45, ...clampStyle }}>{dash(doc.perihal)}</div></td>
                    <td style={tdStyle}><span style={{ fontSize: '0.9rem', color: token.text, lineHeight: 1.45 }}>{dash(doc.division)}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: '0.86rem', color: token.muted, lineHeight: 1.45 }}>{dash(doc.internal_external)}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: '0.9rem', color: token.text, lineHeight: 1.45 }}>{dash(doc.user_name)}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: '0.9rem', color: token.text, lineHeight: 1.45 }}>{dash(doc.signed_by)}</span></td>
                    <td style={tdStyle}><div style={{ fontSize: '0.9rem', color: token.text, lineHeight: 1.45, ...clampStyle }}>{dash(doc.keterangan)}</div></td>
                    <td style={tdStyle}>
                      {doc.link_document
                        ? <a href={doc.link_document} target="_blank" rel="noreferrer" style={{ fontSize: '0.86rem', color: token.blueMid, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', lineHeight: 1.45, wordBreak: 'break-all' }}><Link size={13} style={{ flexShrink: 0 }} /><span style={clampStyle}>{doc.link_document}</span></a>
                        : <span style={{ fontSize: '0.9rem', color: token.muted }}>-</span>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.88rem', color: token.text, whiteSpace: 'nowrap' }}>{formatDate(doc.created_at)}</span>
                        {formatTime(doc.created_at) && <span style={{ fontSize: '0.76rem', color: token.muted, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}><Clock size={11} />{formatTime(doc.created_at)}</span>}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.88rem', color: token.text, whiteSpace: 'nowrap' }}>{formatDate(doc.updated_at)}</span>
                        {formatTime(doc.updated_at) && <span style={{ fontSize: '0.76rem', color: token.muted, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}><Clock size={11} />{formatTime(doc.updated_at)}</span>}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setEditDoc(doc)} title="Edit" style={{ background: 'rgba(26,42,87,0.06)', border: `1px solid ${token.border}`, borderRadius: '0.5rem', padding: '0.45rem', cursor: 'pointer', color: token.blue, display: 'flex' }}><Edit size={15} /></button>
                        <button onClick={() => hDownload(doc)} title="Download" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem', padding: '0.45rem', cursor: 'pointer', color: '#059669', display: 'flex' }}><Download size={15} /></button>
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
