import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const today = new Date().toISOString().split('T')[0]

const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))

const getEmployeeAssignments = e => {
  if (Array.isArray(e?.companies) && e.companies.length > 0) return e.companies
  if (e?.class) return [{ name: e.company || '', class: e.class, jobLevel: e.jobLevel || '' }]
  return []
}

const buildDepartments = (employees, companyName) =>
  [...new Set((employees || []).flatMap(e => getEmployeeAssignments(e)).filter(a => !companyName || a.name === companyName).map(a => a.class || '').filter(Boolean))].sort()

const getDefaultItems = () => [{ memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }]

const blankForm = { companyName: '', tanggalFrp: today, divisi: '', dimintaOleh: '', currency: 'IDR', kurs: '1', vendor: '', internalPoNumber: '', extDocType: '', extDocNumber: '', paymentMethod: 'Transfer', paymentDate: today, attachLink: '', keteranganFrp: '', checkDocs: ['Form Request Payment'], items: getDefaultItems(), id: '' }

const buildInitialForm = data => {
  const base = { ...blankForm, companyName: data.selectedCompany || '', divisi: data.selectedDivision || '', dimintaOleh: data.user?.fullName || '', id: data.editData?.id || '' }
  if (!data.editData) return base
  return { ...base, ...data.editData, tanggalFrp: data.editData.tanggalFrp || today, paymentDate: data.editData.paymentDate || today, checkDocs: Array.isArray(data.editData.checkDocs) ? data.editData.checkDocs : base.checkDocs, items: Array.isArray(data.editData.items) ? data.editData.items.map(i => ({ memo: i.memo || '', budgetId: i.budgetId || '', qty: String(i.qty || '1'), hargaSatuan: String(i.hargaSatuan || i.harga || '0') })) : getDefaultItems() }
}

const S = {
  card: { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: 'white', color: '#1e293b', transition: 'border-color 0.2s' },
  inputReadonly: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#f8fafc', color: '#64748b' },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: '72px', color: '#1e293b' },
  select: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: 'white', color: '#1e293b', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tdInput: { width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: 'white' },
  tdSelect: { width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: 'white', cursor: 'pointer' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.4rem', background: '#1f4e8c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', transition: 'background 0.2s' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.4rem', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' },
  btnAdd: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  btnDel: { display: 'inline-flex', alignItems: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' },
  totalLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  totalValue: { fontSize: '1.1rem', fontWeight: 800, color: '#1f4e8c' },
  checkRow: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  checkItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#475569', userSelect: 'none', transition: 'all 0.15s' },
  checkItemActive: { borderColor: '#1f4e8c', background: '#eff6ff', color: '#1f4e8c' },
  divider: { height: '1px', background: '#f1f5f9', margin: '1.25rem 0' },
}

export default function FormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [frpData, setFrpData] = useState(null)
  const [values, setValues] = useState(blankForm)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    fetch(`/api/form-data${query}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error(`HTTP ${r.status}`) } return r.json() })
      .then(data => { setFrpData(data); setValues(buildInitialForm(data)) })
      .catch(err => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [])

  const FRP = frpData || {}
  const departments = useMemo(() => buildDepartments(FRP.employees || [], values.companyName), [FRP.employees, values.companyName])
  const filteredEmployees = useMemo(() => {
    if (FRP.user?.role !== 'administrator') return [{ fullName: FRP.user?.fullName || '' }]
    return (FRP.employees || []).filter(e => {
      const assignments = getEmployeeAssignments(e)
      if (!values.companyName && !values.divisi) return true
      return assignments.some(a => (!values.companyName || a.name === values.companyName) && (!values.divisi || a.class === values.divisi))
    })
  }, [values.companyName, values.divisi, FRP.employees])

  const budgetOptions = useMemo(() => (FRP.budgets || []).filter(b => {
    const tc = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
    const sc = (values.companyName || '').trim().toUpperCase()
    const td = (b.department || '').trim().toLowerCase()
    const sd = (values.divisi || '').trim().toLowerCase()
    return (!sc || tc === sc) && (!sd || td === sd)
  }), [values.companyName, values.divisi, FRP.budgets])

  const calculateRowAmount = item => normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)
  const totalAmount = useMemo(() => values.items.reduce((sum, item) => sum + calculateRowAmount(item), 0), [values.items, values.kurs])

  const updateField = (field, value) => setValues(prev => ({ ...prev, [field]: value }))
  const updateItem = (index, field, value) => setValues(prev => ({ ...prev, items: prev.items.map((item, idx) => idx === index ? { ...item, [field]: value } : item) }))
  const handleAddRow = () => setValues(prev => ({ ...prev, items: [...prev.items, { memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }] }))
  const handleRemoveRow = index => setValues(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))
  const handleCheckDocToggle = doc => setValues(prev => ({ ...prev, checkDocs: prev.checkDocs.includes(doc) ? prev.checkDocs.filter(d => d !== doc) : [...prev.checkDocs, doc] }))
  const visibleCompanyField = FRP.user?.role === 'administrator'

  const CHECK_DOCS = ['Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak', 'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order']

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = {
        ...values,
        items: values.items.map(item => ({
          ...item,
          amount: calculateRowAmount(item),
        })),
      }
      const res = await fetch('/api/frp/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (d.success) {
        navigate('/approval')
      } else {
        setSubmitError(d.error || 'Gagal menyimpan, coba lagi.')
      }
    } catch {
      setSubmitError('Koneksi gagal, coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} userName={FRP.user?.fullName} userRole={FRP.user?.selectedJobLevel || FRP.user?.role} userIsAdmin={FRP.user?.role === 'administrator'} allAssignments={FRP.user?.allAssignments || []} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
      <div className="dashboard-stage">
        <Header />
        <main className="dashboard-main">
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}
          {error && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>{error}</div>}
          {!loading && !error && <form id="frpForm" onSubmit={handleSubmit}>
            {values.id && <input type="hidden" name="frpId" value={values.id} />}

            {/* Informasi FRP */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>info</span>
                Informasi FRP
              </h3>
              <div style={S.grid2}>
                <div style={S.formGroup}>
                  <label style={S.label}>Company Name</label>
                  {visibleCompanyField
                    ? <select name="companyName" value={values.companyName} onChange={e => updateField('companyName', e.target.value)} style={S.select}>
                        <option value="">Pilih Company</option>
                        {(FRP.companies || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    : <input style={S.inputReadonly} value={values.companyName} readOnly />
                  }
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Tanggal FRP</label>
                  <input type="date" name="tanggalFrp" style={S.input} value={values.tanggalFrp} onChange={e => updateField('tanggalFrp', e.target.value)} />
                </div>
              </div>
              <div style={{ ...S.grid3, marginTop: '1rem' }}>
                <div style={S.formGroup}>
                  <label style={S.label}>Divisi</label>
                  <select name="divisi" value={values.divisi} onChange={e => updateField('divisi', e.target.value)} style={S.select}>
                    <option value="">Pilih Divisi</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Diminta Oleh</label>
                  <select name="dimintaOleh" value={values.dimintaOleh} onChange={e => updateField('dimintaOleh', e.target.value)} style={S.select}>
                    <option value="">Pilih Karyawan</option>
                    {filteredEmployees.map(e => <option key={e.fullName} value={e.fullName}>{e.fullName}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Currency</label>
                  <select name="currency" value={values.currency} onChange={e => updateField('currency', e.target.value)} style={S.select}>
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                    <option value="EUR">EUR</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>
              </div>
              {values.currency !== 'IDR' && (
                <div style={{ ...S.formGroup, marginTop: '1rem', maxWidth: '200px' }}>
                  <label style={S.label}>Kurs</label>
                  <input name="kurs" style={S.input} value={values.kurs} onChange={e => updateField('kurs', e.target.value)} />
                </div>
              )}
              <div style={{ ...S.formGroup, marginTop: '1rem' }}>
                <label style={S.label}>Keterangan FRP</label>
                <textarea name="keteranganFrp" style={S.textarea} value={values.keteranganFrp} onChange={e => updateField('keteranganFrp', e.target.value)} placeholder="Tulis keterangan..." />
              </div>
            </div>

            {/* Vendor & Pembayaran */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>store</span>
                Vendor &amp; Pembayaran
              </h3>
              <div style={S.grid2}>
                <div style={S.formGroup}>
                  <label style={S.label}>Vendor</label>
                  <input name="vendor" style={S.input} value={values.vendor} onChange={e => updateField('vendor', e.target.value)} list="vendorList" placeholder="Ketik atau pilih vendor" />
                  <datalist id="vendorList">{(FRP.vendors || []).map(v => <option key={v.name} value={v.name} />)}</datalist>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Internal PO Number</label>
                  <input name="internalPoNumber" style={S.input} value={values.internalPoNumber} onChange={e => updateField('internalPoNumber', e.target.value)} />
                </div>
              </div>
              <div style={{ ...S.grid3, marginTop: '1rem' }}>
                <div style={S.formGroup}>
                  <label style={S.label}>Ext Doc Type</label>
                  <select name="extDocType" value={values.extDocType} onChange={e => updateField('extDocType', e.target.value)} style={S.select}>
                    <option value="">Pilih</option>
                    <option value="invoice">Invoice</option>
                    <option value="kontrak">Kontrak</option>
                    <option value="kwitansi">Kwitansi</option>
                    <option value="nota">Nota</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Ext Doc Number</label>
                  <input name="extDocNumber" style={S.input} value={values.extDocNumber} onChange={e => updateField('extDocNumber', e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Payment Method</label>
                  <select name="paymentMethod" value={values.paymentMethod} onChange={e => updateField('paymentMethod', e.target.value)} style={S.select}>
                    <option value="Transfer">Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Giro">Giro</option>
                  </select>
                </div>
              </div>
              <div style={{ ...S.grid3, marginTop: '1rem' }}>
                <div style={S.formGroup}>
                  <label style={S.label}>Payment Date</label>
                  <input type="date" name="paymentDate" style={S.input} value={values.paymentDate} onChange={e => updateField('paymentDate', e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Bank Tujuan</label>
                  <input name="bankTujuan" style={S.input} value={values.bankTujuan || ''} onChange={e => updateField('bankTujuan', e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Rekening Bank Tujuan</label>
                  <input name="rekBankTujuan" style={S.input} value={values.rekBankTujuan || ''} onChange={e => updateField('rekBankTujuan', e.target.value)} />
                </div>
              </div>
              <div style={{ ...S.formGroup, marginTop: '1rem' }}>
                <label style={S.label}>Attach Link</label>
                <input name="attachLink" style={S.input} value={values.attachLink} onChange={e => updateField('attachLink', e.target.value)} placeholder="https://..." />
              </div>
            </div>

            {/* Checklist Documents */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>checklist</span>
                Checklist Documents
              </h3>
              <div style={S.checkRow}>
                {CHECK_DOCS.map(doc => {
                  const checked = values.checkDocs.includes(doc)
                  return (
                    <div key={doc} style={{ ...S.checkItem, ...(checked ? S.checkItemActive : {}) }} onClick={() => handleCheckDocToggle(doc)}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>{checked ? 'check_box' : 'check_box_outline_blank'}</span>
                      <input type="checkbox" name="checkDocs[]" value={doc} checked={checked} onChange={() => {}} style={{ display: 'none' }} />
                      {doc}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Line Items */}
            <div style={S.card}>
              <h3 style={S.sectionTitle}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>table_rows</span>
                Line Items
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, width: '30%' }}>Memo</th>
                      <th style={{ ...S.th, width: '28%' }}>Budget</th>
                      <th style={{ ...S.th, width: '9%' }}>Qty</th>
                      <th style={{ ...S.th, width: '14%' }}>Harga Satuan</th>
                      <th style={{ ...S.th, width: '14%' }}>Amount (IDR)</th>
                      <th style={{ ...S.th, width: '5%' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {values.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={S.td}><input name={`items[${idx}][memo]`} style={S.tdInput} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi..." /></td>
                        <td style={S.td}>
                          <select name={`items[${idx}][budgetId]`} style={S.tdSelect} value={item.budgetId} onChange={e => updateItem(idx, 'budgetId', e.target.value)}>
                            <option value="">Pilih Budget</option>
                            {budgetOptions.map(b => <option key={b.id} value={b.id}>{b.id} — {b.description}</option>)}
                          </select>
                        </td>
                        <td style={S.td}><input type="number" name={`items[${idx}][qty]`} style={S.tdInput} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></td>
                        <td style={S.td}><input type="number" name={`items[${idx}][hargaSatuan]`} style={S.tdInput} value={item.hargaSatuan} onChange={e => updateItem(idx, 'hargaSatuan', e.target.value)} /></td>
                        <td style={S.td}><input name={`items[${idx}][amount]`} style={{ ...S.tdInput, background: '#f8fafc', color: '#475569', fontWeight: 600 }} value={formatCurrency(calculateRowAmount(item))} readOnly /></td>
                        <td style={S.td}>
                          <button type="button" style={S.btnDel} onClick={() => handleRemoveRow(idx)}>
                            <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={S.totalRow}>
                <button type="button" style={S.btnAdd} onClick={handleAddRow}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>
                  Tambah Baris
                </button>
                <div>
                  <span style={S.totalLabel}>Total Pembayaran</span>
                  <div style={S.totalValue}>Rp {formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {submitError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                {submitError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingBottom: '2rem' }}>
              <button type="button" style={S.btnSecondary} onClick={() => setValues(buildInitialForm(FRP))} disabled={submitting}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                Reset
              </button>
              <button type="submit" style={{ ...S.btnPrimary, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                {submitting ? 'Menyimpan...' : 'Submit ke Approval'}
              </button>
            </div>
          </form>}
        </main>
      </div>
    </div>
  )
}
