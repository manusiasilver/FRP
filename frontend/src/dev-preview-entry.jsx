import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import HistoryView from './pages/document/HistoryView';

const mockDocs = [
  { id: 1, company: 'PNM', doc_number: 'PNM/001/VIII/2026', judul_dokumen: 'Surat Keputusan Direksi Tentang Kebijakan Kerja', division: 'Human Capital', internal_external: 'Internal', doc_date: '2026-08-05T00:00:00.000Z', created_at: '2026-08-05T07:23:00.000Z', user_name: 'Budi Santoso' },
  { id: 2, company: 'PKS', doc_number: 'PKS/014/VIII/2026', judul_dokumen: 'Perjanjian Kerja Sama Vendor', division: 'Legal', internal_external: 'External', doc_date: '2026-08-04T00:00:00.000Z', created_at: '2026-08-04T14:47:00.000Z', user_name: 'Siti Aminah' },
  { id: 3, company: 'PKP', doc_number: 'PKP/002/VIII/2026', judul_dokumen: 'Memo Internal Anggaran', division: 'Finance', internal_external: 'Internal', doc_date: '2026-08-03T00:00:00.000Z', created_at: '2026-08-03T09:05:00.000Z', user_name: 'Andi Wijaya' },
  { id: 4, company: 'PNM', doc_number: 'PNM/002/VIII/2026', judul_dokumen: 'Surat Edaran Cuti Bersama', division: 'Human Capital', internal_external: 'Internal', doc_date: '2026-08-02T00:00:00.000Z', created_at: '2026-08-02T16:11:00.000Z', user_name: 'Budi Santoso' },
];

function Preview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchIntExt, setSearchIntExt] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [searchDivision, setSearchDivision] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = mockDocs.filter(doc => {
    const s = !searchTerm || [doc.company, doc.doc_number, doc.judul_dokumen, doc.user_name].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()));
    const d = !searchDate || doc.doc_date.slice(0, 10) === searchDate;
    const ie = !searchIntExt || doc.internal_external === searchIntExt;
    const c = !searchCompany || doc.company === searchCompany;
    const dv = !searchDivision || doc.division === searchDivision;
    return s && d && ie && c && dv;
  });
  const companyOptions = [...new Set(mockDocs.map(d => d.company))].sort();
  const divisionOptions = [...new Set(mockDocs.map(d => d.division))].sort();

  return (
    <HistoryView
      filtered={filtered}
      pageSize={pageSize} setPageSize={setPageSize}
      setCurrentPage={setCurrentPage}
      fetchData={() => {}}
      tableLoading={false}
      searchTerm={searchTerm} setSearchTerm={setSearchTerm}
      searchDate={searchDate} setSearchDate={setSearchDate}
      searchIntExt={searchIntExt} setSearchIntExt={setSearchIntExt}
      searchCompany={searchCompany} setSearchCompany={setSearchCompany}
      searchDivision={searchDivision} setSearchDivision={setSearchDivision}
      companyOptions={companyOptions} divisionOptions={divisionOptions}
      pageData={filtered}
      currentPage={currentPage}
      hDownload={() => {}}
      totalPages={1}
      masterData={{ divisions: [] }}
      templates={['Template A']}
      userName="Preview User"
    />
  );
}

createRoot(document.getElementById('root')).render(<Preview />);
