import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import SearchableSelect from '../../components/SearchableSelect.jsx'
import { frpService } from '../../services/frp/new-frp'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const today = new Date().toISOString().split('T')[0]

const normalizeNumber = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))

const formatNumberInput = v => {
  if (v === undefined || v === null || v === '') return ''
  const clean = String(v).replace(/\D/g, '')
  if (!clean) return ''
  return new Intl.NumberFormat('en-US').format(parseInt(clean, 10))
}

const normalizeCompany = v => String(v || '').trim().toUpperCase()

const getEmployeeAssignments = e => {
  if (Array.isArray(e?.companies) && e.companies.length > 0) return e.companies
  if (Array.isArray(e?.allAssignments) && e.allAssignments.length > 0) return e.allAssignments
  if (e?.class) return [{ name: e.company || '', class: e.class, jobLevel: e.jobLevel || '' }]
  if (e?.departmentClass || e?.companyName) return [{ name: e.companyName || e.company || '', class: e.departmentClass || e.class || '' }]
  return []
}

const buildDepartments = (employees, companyName) =>
  [...new Set((employees || [])
    .flatMap(e => getEmployeeAssignments(e))
    .filter(a => !companyName || normalizeCompany(a.name) === normalizeCompany(companyName))
    .map(a => a.class || '')
    .filter(Boolean))]
    .sort()

const buildDepartmentsFromMaster = (departments, companyName) =>
  [...new Set((departments || [])
    .filter(d => !companyName || normalizeCompany(d.company) === normalizeCompany(companyName))
    .map(d => d.name || '')
    .filter(Boolean))]
    .sort()

const getDefaultItems = () => [{ memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }]

const blankForm = {
  companyName: '',
  tanggalFrp: today,
  divisi: '',
  dimintaOleh: '',
  currency: 'IDR',
  kurs: '1',
  vendor: '',
  internalPoNumber: '',
  extDocType: '',
  extDocNumber: '',
  paymentMethod: 'Transfer',
  paymentDate: today,
  attachLink: '',
  keteranganFrp: '',
  checkDocs: ['Form Request Payment'],
  items: getDefaultItems(),
  id: '',
  rpReference: '',
  fromRpId: '',
}

const buildInitialForm = (data, isDuplicate = false) => {
  const base = {
    ...blankForm,
    companyName: data.selectedCompany || '',
    divisi: data.selectedDivision || '',
    dimintaOleh: data.user?.fullName || '',
    id: isDuplicate ? '' : (data.editData?.id || ''),
  }

  if (!data.editData) return base

  return {
    ...base,
    ...data.editData,
    tanggalFrp: isDuplicate ? today : (data.editData.tanggalFrp || today),
    id: isDuplicate ? '' : (data.editData.id || ''),
    rpReference: isDuplicate ? '' : (data.editData.rpReference || ''),
    fromRpId: isDuplicate ? '' : (data.editData.fromRpId || ''),
    status: isDuplicate ? '' : (data.editData.status || ''),
    frpNo: isDuplicate ? '' : (data.editData.frpNo || ''),
    paymentDate: data.editData.paymentDate || today,
    checkDocs: Array.isArray(data.editData.checkDocs) ? data.editData.checkDocs : base.checkDocs,
    items: Array.isArray(data.editData.items)
      ? data.editData.items.map(i => ({
          memo: i.memo || '',
          budgetId: i.budgetId || '',
          qty: String(i.qty || '1'),
          hargaSatuan: String(i.hargaSatuan || i.harga || '0'),
        }))
      : getDefaultItems(),
  }
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

function DateField({ name, value, onChange }) {
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
    <div style={{ position: 'relative' }} onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        name={name}
        style={{
          ...S.input,
          paddingRight: '3rem',
          cursor: 'pointer',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          appearance: 'none',
        }}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Buka kalender"
        style={{
          position: 'absolute',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          border: 'none',
          background: '#e2e8f0',
          color: '#475569',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          padding: 0,
          pointerEvents: 'none',
        }}
      >
        <span className="material-icons-round" style={{ fontSize: '18px' }}>calendar_month</span>
      </button>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          display: none;
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-clear-button {
          display: none;
        }
      `}</style>
    </div>
  )
}


const S = {
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 1.25rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #d7e0ea',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#f8fafc',
    color: '#1e293b',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
  },
  inputReadonly: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    background: '#eef2f7',
    color: '#475569',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #d7e0ea',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
    minHeight: '72px',
    background: '#f8fafc',
    color: '#1e293b',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #d7e0ea',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#f8fafc',
    color: '#1e293b',
    cursor: 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc',
    fontWeight: 700,
    color: '#475569',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tdInput: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1.5px solid #d7e0ea',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#f8fafc',
  },
  tdSelect: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1.5px solid #d7e0ea',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#f8fafc',
    cursor: 'pointer',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.65rem 1.4rem',
    background: '#1f4e8c',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.65rem 1.4rem',
    background: '#f1f5f9',
    color: '#475569',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
  },
  btnAdd: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: '#e0f2fe',
    color: '#0369a1',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
  },
  btnDel: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '2px solid #e2e8f0',
  },
  totalLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  totalValue: { fontSize: '1.1rem', fontWeight: 800, color: '#1f4e8c' },
  checkRow: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#475569',
    userSelect: 'none',
    transition: 'all 0.15s',
  },
  checkItemActive: { borderColor: '#1f4e8c', background: '#eff6ff', color: '#1f4e8c' },
  itemCard: {
    padding: '1rem',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    background: '#fbfdff',
    marginBottom: '0.85rem',
  },
  itemCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '0.9rem',
  },
  itemCardTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' },
  itemCardAmount: {
    marginTop: '0.9rem',
    paddingTop: '0.9rem',
    borderTop: '1px solid #e2e8f0',
  },
}

export default function FormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [frpData, setFrpData] = useState(null)
  const [values, setValues] = useState(blankForm)
  const { setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))

  useEffect(() => {
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    frpService.getFormData(query)
      .then(async data => {
        setFrpData(data)
        setUser(data?.user)
        const isDuplicate = searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'
        const initial = buildInitialForm(data, isDuplicate)

        const fromRpId = searchParams.get('fromRp')
        if (fromRpId) {
          try {
            const rpJson = await frpService.getRpData(fromRpId)
            if (rpJson && rpJson.data) {
              const rp = rpJson.data

              // Map items from RP to FRP format
              const mappedItems = Array.isArray(rp.items) ? rp.items.map(it => {
                const qtyVal = Number(it.qty) || 1
                const estVal = Number(it.estimatedValue) || 0
                return {
                  memo: it.memo || '',
                  budgetId: it.budgetId || '',
                  qty: String(qtyVal),
                  hargaSatuan: formatNumberInput(estVal),
                  amount: qtyVal * estVal,
                }
              }) : getDefaultItems()

              const rpAttachLink = Array.isArray(rp.items) ? (rp.items.find(it => it.linkPembelian)?.linkPembelian || '') : ''

              setValues({
                ...initial,
                companyName: rp.companyName || initial.companyName,
                divisi: rp.divisi || initial.divisi,
                dimintaOleh: rp.dibuatOleh || initial.dimintaOleh,
                keteranganFrp: rp.deskripsi || '',
                vendor: rp.vendorSuggestion || '',
                paymentDate: rp.tanggalDibutuhkan || today,
                attachLink: rpAttachLink || '',
                rpReference: rp.rpNo || '',
                fromRpId: fromRpId,
                items: mappedItems,
              })
              return
            }
          } catch (e) {
            console.error('Failed to load RP data:', e)
          }
        }

        setValues(initial)
      })
      .catch(err => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const FRP = frpData || {}
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const departments = useMemo(
    () => (FRP.departments?.length
      ? buildDepartmentsFromMaster(FRP.departments, values.companyName)
      : (FRP.divisionList || buildDepartments(FRP.employees || [], values.companyName))),
    [FRP.departments, FRP.divisionList, FRP.employees, values.companyName],
  )

  const filteredEmployees = useMemo(() => {
    // Backend sudah filter by divisi (non-IT) atau semua (IT/admin)
    // Frontend hanya filter by company jika ada multiple company
    const sourceEmployees = FRP.employees;
    if (!sourceEmployees || sourceEmployees.length === 0) {
      return [{
        fullName: FRP.user?.fullName || '',
        allAssignments: [{
          name: FRP.user?.selectedCompany || '',
          code: FRP.user?.selectedCompany || '',
          class: FRP.user?.selectedDivision || '',
        }]
      }];
    }
    const targetCompany = normalizeCompany(values.companyName);
    if (!targetCompany) return sourceEmployees;

    return sourceEmployees.filter(e => {
      const assignments = getEmployeeAssignments(e);
      if (!assignments.length) {
        return normalizeCompany(e.companyName || e.company || '') === targetCompany;
      }
      return assignments.some(a =>
        normalizeCompany(a.name) === targetCompany ||
        normalizeCompany(a.code) === targetCompany ||
        normalizeCompany(a.companyCode) === targetCompany
      );
    });
  }, [values.companyName, FRP.employees, FRP.user?.fullName, FRP.user?.selectedCompany, FRP.user?.selectedDivision])

  const budgetOptions = useMemo(
    () =>
      (FRP.budgets || []).filter(b => {
        const tc = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
        const sc = (values.companyName || '').trim().toUpperCase()
        const td = (b.department || '').trim().toLowerCase()
        const sd = (values.divisi || '').trim().toLowerCase()
        return (!sc || tc === sc) && (!sd || td === sd)
      }),
    [values.companyName, values.divisi, FRP.budgets],
  )

  const calculateRowAmount = item =>
    normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)

  const totalAmount = useMemo(
    () => values.items.reduce((sum, item) => sum + calculateRowAmount(item), 0),
    [values.items, values.kurs],
  )

  const updateField = (field, value) => setValues(prev => ({ ...prev, [field]: value }))
  const updateItem = (index, field, value) =>
    setValues(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }))

  const handleAddRow = () =>
    setValues(prev => ({
      ...prev,
      items: [...prev.items, { memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }],
    }))

  const handleRemoveRow = index =>
    setValues(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }))

  const handleCheckDocToggle = doc =>
    setValues(prev => ({
      ...prev,
      checkDocs: prev.checkDocs.includes(doc)
        ? prev.checkDocs.filter(d => d !== doc)
        : [...prev.checkDocs, doc],
    }))

  const visibleCompanyField = FRP.user?.role === 'administrator'
  const grid2Style = useMemo(
    () => ({ ...S.grid2, gridTemplateColumns: getGridColumns(2, isMobile, isTablet), gap: isMobile ? '0.85rem' : '1rem' }),
    [isMobile, isTablet],
  )
  const grid3Style = useMemo(
    () => ({ ...S.grid3, gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: isMobile ? '0.85rem' : '1rem' }),
    [isMobile, isTablet],
  )
  const cardStyle = useMemo(
    () => ({
      ...S.card,
      padding: isMobile ? '1rem' : '1.5rem',
      borderRadius: isMobile ? '14px' : '16px',
      marginBottom: isMobile ? '1rem' : '1.5rem',
    }),
    [isMobile],
  )
  const companySelectOptions = useMemo(
    () => (FRP.companies || []).map(company => ({ value: company.name, label: company.name })),
    [FRP.companies],
  )
  const divisionSelectOptions = useMemo(
    () => departments.map(department => ({ value: department, label: department })),
    [departments],
  )
  const employeeSelectOptions = useMemo(
    () => filteredEmployees.map(employee => ({ value: employee.fullName, label: employee.fullName })),
    [filteredEmployees],
  )
  const vendorSelectOptions = useMemo(
    () => (FRP.vendors || []).map(vendor => ({ value: vendor.name, label: vendor.name })),
    [FRP.vendors],
  )
  const currencySelectOptions = useMemo(
    () => ['IDR', 'USD', 'CNY', 'EUR', 'SGD'].map(currency => ({ value: currency, label: currency })),
    [],
  )
  const extDocTypeOptions = useMemo(
    () => ([
      { value: 'invoice', label: 'Invoice' },
      { value: 'kontrak', label: 'Kontrak' },
      { value: 'kwitansi', label: 'Kwitansi' },
      { value: 'nota', label: 'Nota' },
      { value: 'other', label: 'Lainnya' },
    ]),
    [],
  )
  const paymentMethodOptions = useMemo(
    () => ['Transfer', 'Cash', 'Giro'].map(method => ({ value: method, label: method })),
    [],
  )
  const budgetSelectOptions = useMemo(
    () => budgetOptions.map(budget => ({ value: budget.id, label: `${budget.id} - ${budget.description}`, keywords: `${budget.id} ${budget.description}` })),
    [budgetOptions],
  )

  const CHECK_DOCS = [
    'Form Request Payment',
    'Tanda Terima Asli',
    'Invoice / Kontrak',
    'Surat Jalan Asli / Berita Acara',
    'Faktur Pajak',
    'Purchase Order',
  ]

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
    <main className="dashboard-main">
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>
              Memuat data...
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>
              {error}
            </div>
          )}
          {!loading && !error && (
            <form id="frpForm" onSubmit={handleSubmit}>
              {values.id && <input type="hidden" name="frpId" value={values.id} />}

              {values.rpReference && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', marginBottom: '1.5rem', color: '#1e40af', fontWeight: 600, fontSize: '0.9rem' }}>
                  <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '20px' }}>info</span>
                  Membuat FRP dari referensi Request Purchase No: <strong>{values.rpReference}</strong>
                </div>
              )}

              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>info</span>
                  Informasi FRP
                </h3>
                <div style={grid2Style}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Company Name</label>
                    {visibleCompanyField ? (
                      <SearchableSelect
                        name="companyName"
                        value={values.companyName}
                        onChange={selectedValue => updateField('companyName', selectedValue)}
                        options={companySelectOptions}
                        placeholder="Pilih Company"
                        style={S.select}
                      />
                    ) : (
                      <input style={S.inputReadonly} value={values.companyName} readOnly />
                    )}
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Tanggal FRP</label>
                    <DateField name="tanggalFrp" value={values.tanggalFrp} onChange={e => updateField('tanggalFrp', e.target.value)} />
                  </div>
                </div>
                <div style={{ ...grid3Style, marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Divisi</label>
                    {FRP.user?.role === 'administrator' ? (
                      <SearchableSelect
                        name="divisi"
                        value={values.divisi}
                        onChange={selectedValue => updateField('divisi', selectedValue)}
                        options={divisionSelectOptions}
                        placeholder="Pilih Divisi"
                        style={S.select}
                      />
                    ) : (
                      <input style={S.inputReadonly} value={values.divisi} readOnly />
                    )}
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Diminta Oleh</label>
                    <SearchableSelect
                      name="dimintaOleh"
                      value={values.dimintaOleh}
                      onChange={selectedValue => updateField('dimintaOleh', selectedValue)}
                      options={employeeSelectOptions}
                      placeholder="Pilih Karyawan"
                      style={S.select}
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Currency</label>
                    <SearchableSelect
                      name="currency"
                      value={values.currency}
                      onChange={async selectedValue => {
                        updateField('currency', selectedValue)
                        if (selectedValue === 'IDR') {
                          updateField('kurs', '1')
                        } else {
                          updateField('kurs', 'Memuat...')
                          try {
                            const data = await frpService.getKurs(selectedValue)
                            if (data.success && data.rate) {
                              updateField('kurs', String(data.rate))
                            } else {
                              updateField('kurs', '1')
                              console.error('API Error:', data.error)
                            }
                          } catch (e) {
                            updateField('kurs', '1')
                            console.error('Gagal mengambil kurs:', e)
                          }
                        }
                      }}
                      options={currencySelectOptions}
                      placeholder="Pilih Currency"
                      style={S.select}
                    />
                  </div>
                </div>
                {values.currency !== 'IDR' && (
                  <div style={{ ...S.formGroup, marginTop: '1rem', maxWidth: isMobile ? '100%' : '200px' }}>
                    <label style={S.label}>Kurs</label>
                    <input name="kurs" style={S.input} value={values.kurs} onChange={e => updateField('kurs', e.target.value)} />
                  </div>
                )}
                <div style={{ ...S.formGroup, marginTop: '1rem' }}>
                  <label style={S.label}>Keterangan FRP</label>
                  <textarea
                    name="keteranganFrp"
                    style={S.textarea}
                    value={values.keteranganFrp}
                    onChange={e => updateField('keteranganFrp', e.target.value)}
                    placeholder="Tulis keterangan..."
                  />
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>store</span>
                  Vendor &amp; Pembayaran
                </h3>
                <div style={grid2Style}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Vendor</label>
                    <SearchableSelect
                      name="vendor"
                      value={values.vendor}
                      onChange={selectedValue => {
                        const selected = (FRP.vendors || []).find(v => v.name === selectedValue)
                        console.log('Selected vendor:', selected)
                        updateField('vendor', selectedValue)
                        updateField('bankTujuan', selected?.bank || '')
                        updateField('rekBankTujuan', selected?.no_rekening || '')
                      }}
                      options={vendorSelectOptions}
                      placeholder="Pilih Vendor"
                      style={S.select}
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Internal PO Number</label>
                    <input name="internalPoNumber" style={S.input} value={values.internalPoNumber} onChange={e => updateField('internalPoNumber', e.target.value)} />
                  </div>
                </div>
                <div style={{ ...grid3Style, marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Ext Doc Type</label>
                    <SearchableSelect
                      name="extDocType"
                      value={values.extDocType}
                      onChange={selectedValue => updateField('extDocType', selectedValue)}
                      options={extDocTypeOptions}
                      placeholder="Pilih"
                      style={S.select}
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Ext Doc Number</label>
                    <input name="extDocNumber" style={S.input} value={values.extDocNumber} onChange={e => updateField('extDocNumber', e.target.value)} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Payment Method</label>
                    <SearchableSelect
                      name="paymentMethod"
                      value={values.paymentMethod}
                      onChange={selectedValue => updateField('paymentMethod', selectedValue)}
                      options={paymentMethodOptions}
                      placeholder="Pilih Metode"
                      style={S.select}
                    />
                  </div>
                </div>
                <div style={{ ...grid3Style, marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Payment Date</label>
                    <DateField name="paymentDate" value={values.paymentDate} onChange={e => updateField('paymentDate', e.target.value)} />
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

              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>checklist</span>
                  Checklist Documents
                </h3>
                <div style={{ ...S.checkRow, gap: isMobile ? '8px' : '10px' }}>
                  {CHECK_DOCS.map(doc => {
                    const checked = values.checkDocs.includes(doc)
                    return (
                      <div
                        key={doc}
                        style={{
                          ...S.checkItem,
                          ...(checked ? S.checkItemActive : {}),
                          width: isMobile ? '100%' : 'auto',
                          padding: isMobile ? '10px 12px' : '8px 14px',
                        }}
                        onClick={() => handleCheckDocToggle(doc)}
                      >
                        <span className="material-icons-round" style={{ fontSize: '16px' }}>
                          {checked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <input type="checkbox" name="checkDocs[]" value={doc} checked={checked} onChange={() => {}} style={{ display: 'none' }} />
                        {doc}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>table_rows</span>
                  Line Items
                </h3>
                {isMobile ? (
                  <div>
                    {values.items.map((item, idx) => (
                      <div key={idx} style={S.itemCard}>
                        <div style={S.itemCardHeader}>
                          <div style={S.itemCardTitle}>Item {idx + 1}</div>
                          <button type="button" style={S.btnDel} onClick={() => handleRemoveRow(idx)}>
                            <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                          </button>
                        </div>
                        <div style={grid2Style}>
                          <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                            <label style={S.label}>Memo</label>
                            <input name={`items[${idx}][memo]`} style={S.input} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi..." />
                          </div>
                          <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                            <label style={S.label}>Budget</label>
                            <SearchableSelect
                              name={`items[${idx}][budgetId]`}
                              value={item.budgetId}
                              onChange={selectedValue => updateItem(idx, 'budgetId', selectedValue)}
                              options={budgetSelectOptions}
                              placeholder="Pilih Budget"
                              style={S.select}
                            />
                          </div>
                          <div style={S.formGroup}>
                            <label style={S.label}>Qty</label>
                            <input type="number" name={`items[${idx}][qty]`} style={S.input} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                          </div>
                          <div style={S.formGroup}>
                            <label style={S.label}>Harga Satuan</label>
                            <input type="text" name={`items[${idx}][hargaSatuan]`} style={S.input} value={formatNumberInput(item.hargaSatuan)} onChange={e => updateItem(idx, 'hargaSatuan', e.target.value.replace(/\D/g, ''))} />
                          </div>
                        </div>
                        <div style={S.itemCardAmount}>
                          <div style={S.totalLabel}>Amount (IDR)</div>
                          <div style={{ ...S.totalValue, fontSize: '1rem', marginTop: '0.3rem' }}>Rp {formatCurrency(calculateRowAmount(item))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                            <td style={S.td}>
                              <input name={`items[${idx}][memo]`} style={S.tdInput} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi..." />
                            </td>
                            <td style={S.td}>
                              <SearchableSelect
                                name={`items[${idx}][budgetId]`}
                                value={item.budgetId}
                                onChange={selectedValue => updateItem(idx, 'budgetId', selectedValue)}
                                options={budgetSelectOptions}
                                placeholder="Pilih Budget"
                                style={S.tdSelect}
                                menuPosition="fixed"
                              />
                            </td>
                            <td style={S.td}>
                              <input type="number" name={`items[${idx}][qty]`} style={S.tdInput} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                            </td>
                            <td style={S.td}>
                              <input type="text" name={`items[${idx}][hargaSatuan]`} style={S.tdInput} value={formatNumberInput(item.hargaSatuan)} onChange={e => updateItem(idx, 'hargaSatuan', e.target.value.replace(/\D/g, ''))} />
                            </td>
                            <td style={S.td}>
                              <input
                                name={`items[${idx}][amount]`}
                                style={{ ...S.tdInput, background: '#f8fafc', color: '#475569', fontWeight: 600 }}
                                value={formatCurrency(calculateRowAmount(item))}
                                readOnly
                              />
                            </td>
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
                )}
                <div
                  style={{
                    ...S.totalRow,
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? '0.85rem' : '1rem',
                  }}
                >
                  <button type="button" style={{ ...S.btnAdd, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} onClick={handleAddRow}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>
                    Add Item
                  </button>
                  <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <span style={S.totalLabel}>Total Pembayaran</span>
                    <div style={S.totalValue}>Rp {formatCurrency(totalAmount)}</div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingBottom: '2rem', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...S.btnSecondary, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} onClick={() => setValues(buildInitialForm(FRP, searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'))} disabled={submitting}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                  Reset
                </button>
                <button type="submit" style={{ ...S.btnPrimary, opacity: submitting ? 0.7 : 1, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} disabled={submitting}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                  {submitting ? 'Menyimpan...' : 'Submit ke Approval'}
                </button>
              </div>
            </form>
          )}
    </main>
  )
}
