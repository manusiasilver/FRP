import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }
const normalizeCompany = v => String(v || '').trim().toUpperCase()

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

function SearchableSelect({ name, value, onChange, options, placeholder = 'Pilih...', style, dropdownStyle, disabled = false, menuPosition = 'absolute' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const [menuRect, setMenuRect] = useState(null)

  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o, keywords: o } : { value: o.value, label: o.label, keywords: o.keywords || o.label || o.value })
  const selected = opts.find(o => o.value === value)
  const filtered = opts.filter(o => String(o.keywords || '').toLowerCase().includes(search.toLowerCase()))

  useEffect(() => { if (!open) setSearch('') }, [open])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open || menuPosition !== 'fixed' || !triggerRef.current) return undefined

    const updateMenuRect = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const renderUpward = spaceBelow < 320

      setMenuRect({
        top: renderUpward ? null : rect.bottom + 6,
        bottom: renderUpward ? window.innerHeight - rect.top + 6 : null,
        left: rect.left,
        width: rect.width,
      })
    }

    updateMenuRect()
    window.addEventListener('resize', updateMenuRect)
    window.addEventListener('scroll', updateMenuRect, true)

    return () => {
      window.removeEventListener('resize', updateMenuRect)
      window.removeEventListener('scroll', updateMenuRect, true)
    }
  }, [open, menuPosition])

  const menuStyle = menuPosition === 'fixed'
    ? {
        position: 'fixed',
        ...(menuRect?.top !== null ? { top: menuRect?.top || 0 } : { bottom: menuRect?.bottom || 0 }),
        left: menuRect?.left || 0,
        width: menuRect?.width || 0,
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
      }

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 40 : 1, width: '100%', minWidth: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          minHeight: style?.minHeight || '42px',
          boxShadow: style?.boxShadow || 'inset 0 1px 0 rgba(255,255,255,0.65)',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ display: 'block', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px', color: selected ? '#1e293b' : '#94a3b8' }}>{selected ? selected.label : placeholder}</span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div style={{ ...menuStyle, ...dropdownStyle, background: 'white', borderRadius: '12px', boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)', border: '1.5px solid #dbe5f0', overflow: 'hidden', zIndex: 200 }}>
          <div style={{ padding: '8px' }}><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." style={{ ...S.input, fontSize: '0.875rem', padding: '8px 10px' }} /></div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} style={{ width: '100%', border: 'none', background: 'white', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', color: '#94a3b8', cursor: 'pointer' }}>{placeholder}</button>
            {filtered.map(o => (<button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} style={{ width: '100%', border: 'none', borderTop: '1px solid #f8fafc', background: o.value === value ? '#eff6ff' : 'white', color: o.value === value ? '#1f4e8c' : '#1e293b', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: o.value === value ? 700 : 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>{o.label}</button>))}
            {filtered.length === 0 && <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>Tidak ditemukan</div>}
          </div>
        </div>
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

const S = {
  card: { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' },
  input: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' },
  inputReadonly: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#eef2f7', color: '#475569' },
  textarea: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: '72px', background: '#f8fafc', color: '#1e293b', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' },
  select: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', cursor: 'pointer', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tdInput: { width: '100%', minWidth: 0, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc' },
  tdSelect: { width: '100%', minWidth: 0, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', cursor: 'pointer' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.4rem', background: '#1f4e8c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', transition: 'background 0.2s' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.4rem', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' },
  btnAdd: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  btnDel: { display: 'inline-flex', alignItems: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' },
  totalLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  totalValue: { fontSize: '1.1rem', fontWeight: 800, color: '#1f4e8c' },
  itemCard: { padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fbfdff', marginBottom: '0.85rem', minWidth: 0, overflow: 'visible' },
  itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '0.9rem', flexWrap: 'wrap' },
  itemCardTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' },
  itemCardAmount: { marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid #e2e8f0' },
}

const today = new Date().toISOString().slice(0, 10)
const getDefaultRpItems = () => [{ budgetId: '', memo: '', linkPembelian: '', qty: '1', estimatedValue: '0' }]
const blankRp = { companyName: '', divisi: '', class: '', dibuatOleh: '', kategoriPembelian: '', deskripsi: '', diprosesOleh: '', tanggalDibutuhkan: today, vendorSuggestion: '', picPenerima: '', items: getDefaultRpItems() }

const buildInitialRp = data => {
  const base = {
    ...blankRp,
    items: getDefaultRpItems(),
    companyName: data?.selectedCompany || '',
    divisi: data?.selectedDivision || '',
    dibuatOleh: data?.user?.fullName || '',
  }

  if (!data?.editData) return base

  return {
    ...base,
    ...data.editData,
    tanggalDibutuhkan: data.editData.tanggalDibutuhkan || today,
    items: Array.isArray(data.editData.items)
      ? data.editData.items.map(item => ({
          budgetId: item.budgetId || '',
          memo: item.memo || '',
          linkPembelian: item.linkPembelian || '',
          qty: String(item.qty || '1'),
          estimatedValue: String(item.estimatedValue || '0'),
        }))
      : getDefaultRpItems(),
  }
}

export default function RpFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [values, setValues] = useState(blankRp)
  const { setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [processorDepts, setProcessorDepts] = useState([])
  const [vw, setVw] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth)

  useEffect(() => {
    const q = searchParams.toString() ? `?${searchParams.toString()}` : ''
    fetch(`/api/rp/form-data${q}`)
      .then(r => { if (!r.ok) { window.location.href = '/'; throw new Error() } return r.json() })
      .then(d => {
        setData(d)
        setUser(d?.user)
        setValues(buildInitialRp(d))

        fetch('/api/rp/processor-departments')
        .then(r => r.json())
        .then(depts => setProcessorDepts(depts))
        .catch(() => {})
      })
      .catch(e => setError(e.message || 'Gagal memuat'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { const h = () => setVw(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])

  const D = data || {}
  const isAdmin = D.user?.role === 'administrator'
  const isMobile = vw < MOBILE_BREAKPOINT
  const isTablet = vw >= MOBILE_BREAKPOINT && vw < TABLET_BREAKPOINT
  const selectMenuPosition = isMobile ? 'fixed' : 'absolute'
  const mobileDropdownStyle = isMobile ? { maxWidth: 'calc(100vw - 32px)' } : undefined

  const updateField = (f, v) => setValues(p => ({ ...p, [f]: v }))
  const updateItem = (i, f, v) => setValues(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) }))
  const addRow = () => setValues(p => ({ ...p, items: [...p.items, ...getDefaultRpItems()] }))
  const removeRow = i => setValues(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const resetValues = () => setValues(buildInitialRp(D))

  const departments = useMemo(() => {
    if (D.departments && D.departments.length > 0) {
      return [...new Set(D.departments
        .filter(d => !values.companyName || normalizeCompany(d.company) === normalizeCompany(values.companyName))
        .map(d => d.name)
        .filter(Boolean))]
        .sort()
    }
    if (D.processDivisions && D.processDivisions.length > 0) return D.processDivisions
    const emps = D.employees || []
    const divs = [...new Set(emps.flatMap(e => (e.companies || []).filter(a => !values.companyName || normalizeCompany(a.name) === normalizeCompany(values.companyName)).map(a => a.class)).filter(Boolean))]
    return divs.sort()
  }, [D.departments, D.processDivisions, D.employees, values.companyName])

  const classOptions = useMemo(() => {
    const budgets = D.budgets || []
    const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
    const currentDivisi = (values.divisi || '').trim().toUpperCase()
    const isFullAccess = fullAccessDivisions.includes(currentDivisi)

    const classes = [...new Set(budgets.filter(b => {
      if (isFullAccess) return true
      return !values.divisi || (b.department || '').toLowerCase() === values.divisi.toLowerCase()
    }).map(b => b.class).filter(Boolean))]
    return classes.sort()
  }, [D.budgets, values.divisi])

  const budgetOptions = useMemo(() => {
    const budgets = D.budgets || []
    return budgets.filter(b => {
      const matchCompany = !values.companyName || (b.company || '').toLowerCase().includes(values.companyName.toLowerCase())
      if (!matchCompany) return false

      const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
      const currentDivisi = (values.divisi || '').trim().toUpperCase()
      if (fullAccessDivisions.includes(currentDivisi)) {
        return true
      }

      const matchDiv = !values.divisi || (b.department || '').toLowerCase() === values.divisi.toLowerCase()
      return matchDiv
    })
  }, [D.budgets, values.divisi, values.companyName])

  const processDivOptions = useMemo(() => {
      if (processorDepts.length > 0) {
          return processorDepts.map(d => ({ value: d, label: d }))
      }
      // fallback kalau belum load
      return ['IT', 'HCGA'].map(d => ({ value: d, label: d }))
  }, [processorDepts])


  const companyOptions = useMemo(() => {
    const names = [
      ...(D.companies || []).map(company => company.name || company),
      ...(D.user?.allAssignments || []).map(assignment => assignment.name),
      ...(D.budgets || []).map(budget => budget.company),
    ].filter(Boolean)
    return [...new Set(names)].sort().map(name => ({ value: name, label: name }))
  }, [D.companies, D.user?.allAssignments, D.budgets])
  const divisionOptions = useMemo(() => departments.map(d => ({ value: d, label: d })), [departments])
  const rpClassOptions = useMemo(() => classOptions.map(c => ({ value: c, label: c })), [classOptions])
  const vendorOptions = useMemo(() => (D.vendors || []).map(v => ({ value: v.name, label: v.name })), [D.vendors])
  const kategoriOptions = ['Pengadaan Barang Baru', 'Pergantian Barang', 'Penambahan Barang'].map(k => ({ value: k, label: k }))
  const budgetSelectOpts = useMemo(() => budgetOptions.map(b => ({ value: b.id, label: `${b.id} - ${b.description}`, keywords: `${b.id} ${b.description}` })), [budgetOptions])
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

  const totalAmount = useMemo(() => values.items.reduce((s, it) => s + normalizeNumber(it.qty) * normalizeNumber(it.estimatedValue), 0), [values.items])

  const getBudgetRemaining = (budgetId) => {
    const b = (D.budgets || []).find(x => x.id === budgetId)
    return b ? b.remainingAmount : null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!values.class) {
      setSubmitError('Kolom Class wajib diisi.')
      return
    }
    setShowConfirm(true)
  }

  const executeSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true); setSubmitError(null)
    try {
      const processId = searchParams.get('process')
      if (processId) {
        const res = await fetch(`/api/rp/${processId}/process-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        const result = await res.json()
        if (result.success) {
          alert('Data berhasil diupdate oleh divisi pemroses!')
          navigate('/rp-approval')
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      } else {
        let payload = { ...values }
        if (searchParams.get('revisi')) {
          payload.rpId = values.id
        } else {
          const rpNoRes = await fetch(`/api/rp/next-number/${encodeURIComponent(values.divisi)}`)
          const rpNoData = await rpNoRes.json()
          payload.rpNo = rpNoData.rpNo
        }
        const res = await fetch('/api/rp/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const result = await res.json()
        if (result.success) {
          alert(`RP berhasil disimpan!\nNomor: ${result.rpNo}`)
          navigate('/rp-approval')
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      }
    } catch (err) { setSubmitError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <main className="dashboard-main">
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}
          {error && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>{error}</div>}
          {!loading && !error && (
            <form id="rpForm" onSubmit={handleSubmit}>
              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>info</span>
                  Informasi Request Purchase
                </h3>
                <div style={grid2Style}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Company Name</label>
                    {isAdmin && companyOptions.length > 0 ? (
                      <SearchableSelect
                        name="companyName"
                        value={values.companyName}
                        onChange={selectedValue => setValues(prev => ({ ...prev, companyName: selectedValue, divisi: '', class: '' }))}
                      options={companyOptions}
                      placeholder="Pilih Company"
                      style={S.select}
                      dropdownStyle={mobileDropdownStyle}
                      menuPosition={selectMenuPosition}
                    />
                    ) : (
                      <input style={S.inputReadonly} value={values.companyName} readOnly />
                    )}
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Tanggal Dibutuhkan</label>
                    <DateField name="tanggalDibutuhkan" value={values.tanggalDibutuhkan} onChange={e => updateField('tanggalDibutuhkan', e.target.value)} />
                  </div>
                </div>
                <div style={{ ...grid3Style, marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Divisi</label>
                    {isAdmin ? (
                      <SearchableSelect
                        name="divisi"
                        value={values.divisi}
                        onChange={selectedValue => setValues(prev => ({ ...prev, divisi: selectedValue, class: '' }))}
                        options={divisionOptions}
                        placeholder="Pilih Divisi"
                        style={S.select}
                        dropdownStyle={mobileDropdownStyle}
                        menuPosition={selectMenuPosition}
                      />
                    ) : (
                      <input style={S.inputReadonly} value={values.divisi} readOnly />
                    )}
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Class</label>
                    <SearchableSelect name="class" value={values.class} onChange={v => updateField('class', v)} options={rpClassOptions} placeholder="Pilih Class" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Dibuat Oleh</label>
                    <input style={S.inputReadonly} value={values.dibuatOleh} readOnly />
                  </div>
                </div>
                <div style={{ ...S.formGroup, marginTop: '1rem' }}>
                  <label style={S.label}>Deskripsi (Alasan Permintaan Barang & Nama Pengguna Barang)</label>
                  <textarea name="deskripsi" style={S.textarea} value={values.deskripsi} onChange={e => updateField('deskripsi', e.target.value)} placeholder="Jelaskan alasan permintaan barang..." />
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>store</span>
                  Vendor &amp; Proses
                </h3>
                <div style={grid3Style}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Kategori Pembelian</label>
                    <SearchableSelect name="kategoriPembelian" value={values.kategoriPembelian} onChange={v => updateField('kategoriPembelian', v)} options={kategoriOptions} placeholder="Pilih Kategori" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Diproses Oleh</label>
                    <SearchableSelect name="diprosesOleh" value={values.diprosesOleh} onChange={v => updateField('diprosesOleh', v)} options={processDivOptions} placeholder="Pilih Divisi Pemroses" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Vendor Suggestion</label>
                    <SearchableSelect name="vendorSuggestion" value={values.vendorSuggestion} onChange={v => updateField('vendorSuggestion', v)} options={vendorOptions} placeholder="Pilih Vendor" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                  </div>
                </div>
                <div style={{ ...grid2Style, marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>PIC Penerima</label>
                    <input name="picPenerima" style={S.input} value={values.picPenerima} onChange={e => updateField('picPenerima', e.target.value)} placeholder="Nama penerima barang" />
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={S.sectionTitle}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>table_rows</span>
                  Detail Item
                </h3>
                {isMobile ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {values.items.map((item, idx) => {
                      const remaining = getBudgetRemaining(item.budgetId)
                      const subtotal = normalizeNumber(item.qty) * normalizeNumber(item.estimatedValue)
                      return (
                        <div key={idx} style={S.itemCard}>
                          <div style={S.itemCardHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                              <div style={{ ...S.itemCardTitle, minWidth: 0 }}>Item Request</div>
                            </div>
                            <button type="button" style={S.btnDel} onClick={() => removeRow(idx)}>
                              <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
                            <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                              <label style={S.label}>Budget</label>
                              <SearchableSelect name={`items[${idx}][budgetId]`} value={item.budgetId} onChange={v => updateItem(idx, 'budgetId', v)} options={budgetSelectOpts} placeholder="Pilih Budget" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition="fixed" />
                            </div>
                            <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                              <label style={S.label}>Memo</label>
                              <input name={`items[${idx}][memo]`} style={S.input} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi item..." />
                            </div>
                            <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                              <label style={S.label}>Link Pembelian</label>
                              <input name={`items[${idx}][linkPembelian]`} style={S.input} value={item.linkPembelian} onChange={e => updateItem(idx, 'linkPembelian', e.target.value)} placeholder="https://..." />
                            </div>
                            <div style={S.formGroup}>
                              <label style={S.label}>Qty</label>
                              <input type="number" name={`items[${idx}][qty]`} style={S.input} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                            </div>
                            <div style={S.formGroup}>
                              <label style={S.label}>Estimated Value</label>
                              <input type="text" name={`items[${idx}][estimatedValue]`} style={S.input} value={formatNumberInput(item.estimatedValue)} onChange={e => updateItem(idx, 'estimatedValue', e.target.value.replace(/\D/g, ''))} />
                            </div>
                          </div>
                          <div style={{ ...S.itemCardAmount, display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                              <span style={S.totalLabel}>Budget Remaining</span>
                              <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: remaining !== null && remaining < 0 ? '#ef4444' : '#16a34a', overflowWrap: 'anywhere' }}>{remaining !== null ? `Rp ${formatCurrency(remaining)}` : '-'}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                              <span style={S.totalLabel}>Subtotal Estimated</span>
                              <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: '#1f4e8c', overflowWrap: 'anywhere' }}>Rp {formatCurrency(subtotal)}</strong>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={S.table}>
                      <thead><tr>
                        <th style={{ ...S.th, width: '4%' }}>No</th>
                        <th style={{ ...S.th, width: '22%' }}>Item Group (Budget)</th>
                        <th style={{ ...S.th, width: '16%' }}>Memo</th>
                        <th style={{ ...S.th, width: '18%' }}>Link Pembelian</th>
                        <th style={{ ...S.th, width: '6%' }}>Qty</th>
                        <th style={{ ...S.th, width: '14%' }}>Estimated Value</th>
                        <th style={{ ...S.th, width: '14%' }}>Budget Remaining</th>
                        <th style={{ ...S.th, width: '5%' }} />
                      </tr></thead>
                      <tbody>
                        {values.items.map((item, idx) => {
                          const remaining = getBudgetRemaining(item.budgetId)
                          return (
                            <tr key={idx}>
                              <td style={S.td}><span style={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</span></td>
                              <td style={S.td}><SearchableSelect name={`items[${idx}][budgetId]`} value={item.budgetId} onChange={v => updateItem(idx, 'budgetId', v)} options={budgetSelectOpts} placeholder="Pilih Budget" style={S.tdSelect} menuPosition="fixed" /></td>
                              <td style={S.td}><input name={`items[${idx}][memo]`} style={S.tdInput} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi item..." /></td>
                              <td style={S.td}><input name={`items[${idx}][linkPembelian]`} style={S.tdInput} value={item.linkPembelian} onChange={e => updateItem(idx, 'linkPembelian', e.target.value)} placeholder="https://..." /></td>
                              <td style={S.td}><input type="number" name={`items[${idx}][qty]`} style={S.tdInput} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></td>
                              <td style={S.td}><input type="text" name={`items[${idx}][estimatedValue]`} style={S.tdInput} value={formatNumberInput(item.estimatedValue)} onChange={e => updateItem(idx, 'estimatedValue', e.target.value.replace(/\D/g, ''))} /></td>
                              <td style={S.td}><input style={{ ...S.tdInput, background: '#f0fdf4', color: remaining !== null && remaining < 0 ? '#ef4444' : '#16a34a', fontWeight: 600 }} value={remaining !== null ? formatCurrency(remaining) : '-'} readOnly /></td>
                              <td style={S.td}><button type="button" style={S.btnDel} onClick={() => removeRow(idx)}><span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span></button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ ...S.totalRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '0.85rem' : '1rem' }}>
                  <button type="button" style={{ ...S.btnAdd, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} onClick={addRow}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>
                    Add Item
                  </button>
                  <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <span style={S.totalLabel}>Total Estimated Value</span>
                    <div style={S.totalValue}>Rp {formatCurrency(totalAmount)}</div>
                  </div>
                </div>
              </div>

              {submitError && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>{submitError}</div>}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingBottom: '2rem', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
                <button type="button" style={{ ...S.btnSecondary, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} onClick={resetValues} disabled={submitting}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                  Reset
                </button>
                <button type="submit" disabled={submitting} style={{ ...S.btnPrimary, opacity: submitting ? 0.7 : 1, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                  {submitting ? 'Mengirim...' : (searchParams.get('process') ? 'Update & Submit' : 'Submit Request Purchase')}
                </button>
              </div>
            </form>
          )}
      <DialogConfirm
        isOpen={showConfirm}
        eyebrow="Konfirmasi Submit"
        title="Kirim Request Purchase?"
        message={
          !!searchParams.get('process')
            ? 'Apakah Anda yakin ingin mengupdate dan mengirimkan data Request Purchase ini?'
            : 'Apakah Anda yakin ingin mengirimkan Request Purchase ini?'
        }
        confirmLabel="Ya, Kirim"
        icon="send"
        tone="primary"
        isLoading={submitting}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeSubmit}
      />
    </main>
    </>
  )
}
