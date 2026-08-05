// DocumentPage.jsx — Orchestrator untuk Generate Document, Riwayat, dan Kelola Template
// Diakses via route /document/generate, /document/riwayat, /document/template
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../../contexts/UserContext';
import FormView from './FormView';
import HistoryView from './HistoryView';
import TemplatesView from './TemplatesView';

const asArray = v => (Array.isArray(v) ? v : []);

// view: 'form' | 'history' | 'templates'
export default function DocumentPage({ view = 'form' }) {
  const { user, setUser } = useUser();
  const userName = user?.fullName || user?.name || '';

  const [masterData, setMasterData]   = useState({ divisions: [] });
  const [documents, setDocuments]     = useState([]);
  const [templates, setTemplates]     = useState([]);
  const [formData, setFormData]       = useState({
    company: 'PNM', template_name: '', judul_dokumen: '', division: '',
    internal_external: 'Internal', doc_date: new Date().toISOString().split('T')[0],
    klasifikasi: '', perihal: '', signed_by: '', keterangan: '', link_document: '',
  });
  const [loading, setLoading]           = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [editingDoc, setEditingDoc]     = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg]       = useState({ type: '', text: '' });
  const [showNote, setShowNote]         = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(25);
  const [searchTerm, setSearchTerm]     = useState('');
  const [searchDate, setSearchDate]     = useState('');
  const [searchIntExt, setSearchIntExt] = useState('');
  const [searchCompany, setSearchCompany]   = useState('');
  const [searchDivision, setSearchDivision] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => { fetchData(); fetchDepartments('PNM'); }, []);
  useEffect(() => { fetchDepartments(formData.company); }, [formData.company]);

  async function fetchData() {
    setTableLoading(true);
    try {
      const [docRes, tplRes] = await Promise.all([
        axios.get('/api/document/documents'),
        axios.get('/api/document/templates'),
      ]);
      setDocuments(asArray(docRes.data));
      setTemplates(asArray(tplRes.data));
    } catch (e) { console.error(e); }
    finally { setTableLoading(false); }
  }

  async function fetchDepartments(company) {
    try {
      const res = await axios.get('/api/document/master-departments', { params: { company } });
      setMasterData(p => ({ ...p, divisions: asArray(res.data.departments) }));
      if (res.data.user) {
        setUser(res.data.user);
      }
    } catch (e) { console.error(e); }
  }

  const hChange = e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  async function hSubmit(e) {
    e.preventDefault();
    if (!formData.judul_dokumen.trim() || !formData.doc_date) { alert('Harap isi Judul Dokumen dan Tanggal!'); return; }
    setLoading(true);
    try {
      if (editingDoc) {
        const r = await axios.put(`/api/document/documents/${editingDoc.id}`, formData);
        alert('Dokumen diperbarui!');
        setGeneratedDoc(r.data);
      } else {
        const r = await axios.post('/api/document/generate', formData);
        setGeneratedDoc(r.data);
        setEditingDoc(r.data);
      }
      fetchData();
    } catch (e) { alert(e.response?.data?.error || 'Gagal memproses dokumen.'); }
    finally { setLoading(false); }
  }

  async function hDownload(doc) {
    try {
      const r = await axios.post('/api/document/download', { doc_number: doc.doc_number }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(doc.judul_dokumen || 'Dokumen').replace(/[^a-zA-Z0-9 -]/g, '')}_${doc.doc_number.replace(/\//g, '_')}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err) {
      let msg = 'Gagal download.';
      if (err.response?.data instanceof Blob) {
        try { msg = JSON.parse(await err.response.data.text()).error || msg; } catch {}
      }
      alert(msg);
    }
  }

  function resetForm() {
    setGeneratedDoc(null); setEditingDoc(null);
    setFormData({ company: 'PNM', template_name: templates[0] || '', judul_dokumen: '', division: '', internal_external: 'Internal', doc_date: new Date().toISOString().split('T')[0], klasifikasi: '', perihal: '', signed_by: '', keterangan: '', link_document: '' });
  }

  function startDuplicate(doc) {
    setEditingDoc(null); setGeneratedDoc(null);
    setFormData({ company: doc.company, template_name: doc.template_name || templates[0] || '', judul_dokumen: doc.judul_dokumen || '', division: doc.division, internal_external: doc.internal_external || 'Internal', doc_date: new Date().toISOString().split('T')[0], klasifikasi: doc.klasifikasi || '', perihal: doc.perihal || '', signed_by: doc.signed_by || '', keterangan: doc.keterangan || '', link_document: doc.link_document || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function hUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.endsWith('.docx')) { setUploadMsg({ type: 'err', text: 'Hanya file .docx.' }); return; }
    setUploadLoading(true); setUploadMsg({ type: '', text: '' });
    const fd = new FormData(); fd.append('template', file);
    try {
      const r = await axios.post('/api/document/templates/upload', fd);
      setUploadMsg({ type: 'ok', text: r.data.message || 'Berhasil diupload!' }); fetchData();
    } catch (err) { setUploadMsg({ type: 'err', text: err.response?.data?.error || 'Gagal upload.' }); }
    finally { setUploadLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function hDeleteTemplate(name) {
    if (!confirm(`Hapus template "${name}"?`)) return;
    try { await axios.delete(`/api/document/templates/${encodeURIComponent(name)}`); setUploadMsg({ type: 'ok', text: `"${name}" dihapus.` }); fetchData(); }
    catch (err) { setUploadMsg({ type: 'err', text: err.response?.data?.error || 'Gagal hapus.' }); }
  }

  const filtered = asArray(documents).filter(doc => {
    const s = !searchTerm || [doc.company, doc.doc_number, doc.judul_dokumen, doc.user_name].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()));
    const d = !searchDate || doc.doc_date === searchDate;
    const ie = !searchIntExt || doc.internal_external === searchIntExt;
    const c = !searchCompany || doc.company === searchCompany;
    const dv = !searchDivision || doc.division === searchDivision;
    return s && d && ie && c && dv;
  });
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const companyOptions = [...new Set(asArray(documents).map(d => d.company).filter(Boolean))].sort();
  const divisionOptions = [...new Set(asArray(documents).map(d => d.division).filter(Boolean))].sort();

  if (view === 'templates') {
    return <TemplatesView templates={templates} uploadLoading={uploadLoading} uploadMsg={uploadMsg} showNote={showNote} setShowNote={setShowNote} hUpload={hUpload} hDeleteTemplate={hDeleteTemplate} fileInputRef={fileInputRef} setUploadMsg={setUploadMsg} />;
  }

  if (view === 'history') {
    return <HistoryView filtered={filtered} pageSize={pageSize} setPageSize={setPageSize} setCurrentPage={setCurrentPage} fetchData={fetchData} tableLoading={tableLoading} searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchDate={searchDate} setSearchDate={setSearchDate} searchIntExt={searchIntExt} setSearchIntExt={setSearchIntExt} searchCompany={searchCompany} setSearchCompany={setSearchCompany} searchDivision={searchDivision} setSearchDivision={setSearchDivision} companyOptions={companyOptions} divisionOptions={divisionOptions} pageData={pageData} currentPage={currentPage} hDownload={hDownload} totalPages={totalPages} masterData={masterData} templates={templates} userName={userName} />;
  }

  // default: form
  return <FormView editingDoc={editingDoc} generatedDoc={generatedDoc} formData={formData} templates={templates} masterData={masterData} loading={loading} hChange={hChange} hSubmit={hSubmit} hDownload={hDownload} resetForm={resetForm} startDuplicate={startDuplicate} userName={userName} />;
}
