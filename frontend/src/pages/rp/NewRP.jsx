import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsRp from '../../components/table/DataTableItemsRp.jsx'
import ButtonAddItemsFrp from '../../components/button/ButtonAddItemsFrp.jsx'
import { rpService } from '../../services/rp/new-rp'
import '../../styles/frp/new-frp.css'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }
const normalizeCompany = v => String(v || '').trim().toUpperCase()

const getDisplayName = (user) => {
  return user?.name || user?.fullName || user?.username || user?.displayName || ''
}

const buildCompanySelectOptions = (user, fallbackCompanies = [], isAdmin = false) => {
  const optionMap = new Map()
  const source = isAdmin ? fallbackCompanies : (Array.isArray(user?.companies) ? user.companies : [])

  const addCompany = raw => {
    if (!raw) return

    const name = String(raw.name || raw.companyName || raw.company || raw.label || raw.value || '').trim()
    if (!name || optionMap.has(name)) return

    const code = raw.code || raw.companyCode || ''
    optionMap.set(name, {
      value: name,
      label: name,
      keywords: `${name} ${code}`.trim(),
      isPrimary: raw.is_primary ?? raw.isPrimary ?? 0,
    })
  }

  source.forEach(addCompany)

  if (optionMap.size === 0 && user?.selectedCompany) {
    addCompany({
      name: user.selectedCompany,
      code: user.selectedCompanyCode,
      is_primary: 1,
    })
  }

  return [...optionMap.values()].sort((a, b) => {
    if (!isAdmin && Number(b.isPrimary || 0) !== Number(a.isPrimary || 0)) {
      return Number(b.isPrimary || 0) - Number(a.isPrimary || 0)
    }

    return a.label.localeCompare(b.label, 'id')
  })
}


function FloatingGroup({ label, children, style, className }) {
  return (
    <div
      className={`frp-float-group${className ? ' ' + className : ''}`}
      style={style}
    >
      {children}
      <span className="frp-float-label">{label}</span>
    </div>
  )
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
    <div style={{ position: 'relative', display: 'block', lineHeight: 0 }} onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        name={name}
        className="frp-input"
        placeholder=" "
        style={{
          paddingRight: '2.8rem',
          cursor: 'pointer',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          appearance: 'none',
          lineHeight: 'normal',
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
          right: '6px',
          transform: 'translateY(-50%)',
          width: '26px',
          height: '26px',
          borderRadius: '8px',
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
        <span className="material-icons-round" style={{ fontSize: '16px' }}>calendar_month</span>
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

const today = new Date().toISOString().slice(0, 10)
const getDefaultRpItems = () => [{ budgetId: '', memo: '', linkPembelian: '', qty: '1', estimatedValue: '0' }]
const blankRp = { companyName: '', divisi: '', class: '', dibuatOleh: '', kategoriPembelian: '', deskripsi: '', diprosesOleh: '', tanggalDibutuhkan: today, vendorSuggestion: '', picPenerima: '', items: getDefaultRpItems() }

const getDepartmentValue = dept => String(dept?.originalIndex ?? dept?.id ?? '')

const findDepartmentByValue = (departments, currentValue) => {
  if (!Array.isArray(departments) || departments.length === 0) return null

  const normalizedValue = normalizeCompany(currentValue)
  return departments.find(d =>
    getDepartmentValue(d) === String(currentValue) ||
    normalizeCompany(d.name) === normalizedValue ||
    normalizeCompany(d.class) === normalizedValue
  ) || null
}

const buildInitialRp = data => {
  let initialCompany = data?.selectedCompany || data?.user?.selectedCompany || data?.user?.companyName || data?.user?.company || '';
  if (data?.companies && initialCompany) {
    const searchCompany = normalizeCompany(initialCompany);
    const comp = data.companies.find(c => String(c.id) === String(initialCompany) || normalizeCompany(c.code) === searchCompany || normalizeCompany(c.name) === searchCompany);
    if (comp) initialCompany = comp.name;
  }

  const base = {
    ...blankRp,
    items: getDefaultRpItems(),
    companyName: initialCompany,
    dibuatOleh: getDisplayName(data?.user),
  }

  let initialDivisi = '';
  let initialClass = '';
  if (data?.departments && data.departments.length > 0) {
    const userDiv = normalizeCompany(data.selectedDivision || '');
    const matched = data.departments.find(d => normalizeCompany(d.class) === userDiv || normalizeCompany(d.name) === userDiv);
    if (matched) {
      initialDivisi = getDepartmentValue(matched);
      initialClass = matched.class || '';
    }
  } else {
    initialDivisi = data?.selectedDivision || '';
    initialClass = data?.selectedDivision || '';
  }
  base.divisi = initialDivisi;
  base.class = initialClass;

  if (!data?.editData) return base

  let editDivisi = base.divisi;
  let editClass = base.class;
  if (data?.departments && data.departments.length > 0) {
    const dName = normalizeCompany(data.editData.departmentName || data.editData.divisi || '');
    const dClass = normalizeCompany(data.editData.departmentClass || data.editData.class || '');
    const matched = data.departments.find(d => normalizeCompany(d.name) === dName && (!dClass || normalizeCompany(d.class) === dClass));
    if (matched) {
      editDivisi = getDepartmentValue(matched);
      editClass = matched.class || '';
    }
    else if (data.editData.departmentId) editDivisi = data.editData.departmentId;
  } else {
    editDivisi = data.editData.departmentName || data.editData.divisi || base.divisi;
    editClass =
      data.editData.class ||
      data.editData.classClass ||
      data.editData.departmentClass ||
      data.editData.department_class ||
      data.editData.className ||
      base.class ||
      '';
  }

  return {
    ...base,
    ...data.editData,
    divisi: editDivisi,
    class: editClass || data.editData.class || data.editData.departmentClass || data.editData.department_class || '',
    tanggalDibutuhkan: data.editData.tanggalDibutuhkan || data.editData.requiredDate || today,
    deskripsi: data.editData.deskripsi || data.editData.description || '',
    picPenerima: data.editData.picPenerima || data.editData.receiverPic || '',
    kategoriPembelian: data.editData.kategoriPembelian || data.editData.purchaseCategory || '',
    diprosesOleh: data.editData.diprosesOleh || data.editData.processedByDepartment || '',
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

const resolveDivisionValue = (departments, currentValue) => {
  if (!Array.isArray(departments) || departments.length === 0) {
    return currentValue || ''
  }

  const normalizedValue = normalizeCompany(currentValue)
  const matched = departments.find(d =>
    String(d.originalIndex) === String(currentValue) ||
    normalizeCompany(d.name) === normalizedValue ||
    normalizeCompany(d.class) === normalizedValue
  )

  if (!matched) {
    return currentValue || ''
  }

  return matched.originalIndex !== undefined ? matched.originalIndex : (matched.id ?? currentValue ?? '')
}

const getDivisionDisplayValue = (departments, currentValue, source = {}) => {
  const sourceName =
    source.departmentName ||
    source.department_name ||
    source.divisi ||
    source.name ||
    ''
  const sourceClass =
    source.departmentClass ||
    source.department_class ||
    source.classClass ||
    source.class ||
    ''

  if (sourceName || sourceClass) {
    if (sourceName && sourceClass && normalizeCompany(sourceName) !== normalizeCompany(sourceClass)) {
      return `${sourceName} - ${sourceClass}`
    }
    return sourceName || sourceClass
  }

  const matched = Array.isArray(departments)
    ? departments.find(d => String(d.originalIndex) === String(currentValue))
    : null

  return matched?.label || currentValue || ''
}

export default function NewRP({
  embedded = false,
  embeddedProcessId = null,
  embeddedRequest = null,
  onCloseEmbedded = null,
  onEmbeddedSuccess = null,
} = {}) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [values, setValues] = useState(blankRp)
  const { user: sessionUser, setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, title: '', message: '', subMessage: '', rpNo: '' })
  const [vw, setVw] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth)

  usePageLoadingDialog(loading, {
    title: 'Memuat Form RP',
    message: 'Sistem sedang menyiapkan data Request Purchase Anda.',
  })

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (embeddedProcessId) params.set('process', embeddedProcessId)
    const q = params.toString() ? `?${params.toString()}` : ''

    rpService.getFormData(q)
      .then(d => {
        setData(d)
        setUser(d?.user, { replaceSelection: true })
        const initial = buildInitialRp(d)
        setValues(initial)
        previousCompanyRef.current = initial.companyName || ''
        companySyncInitializedRef.current = true
      })
      .catch(e => {
        if (e?.response?.status === 401 || e?.status === 401) window.location.href = '/'
        setError(e.message || 'Gagal memuat')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { const h = () => setVw(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])

  const D = data || {}
  const activeUser = sessionUser || D.user || {}
  const isAdmin = activeUser?.role === 'administrator'
  const isMobile = vw < MOBILE_BREAKPOINT
  const isTablet = vw >= MOBILE_BREAKPOINT && vw < TABLET_BREAKPOINT
  const selectMenuPosition = isMobile ? 'fixed' : 'fixed'
  const mobileDropdownStyle = isMobile ? { maxWidth: 'calc(100vw - 32px)' } : undefined

  const updateField = (f, v) => setValues(p => ({ ...p, [f]: v }))
  const updateItem = (i, f, v) => setValues(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) }))
  const addRow = () => setValues(p => ({ ...p, items: [...p.items, ...getDefaultRpItems()] }))
  const removeRow = i => setValues(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const resetValues = () => setValues(buildInitialRp(D))
  const previousCompanyRef = useRef(values.companyName)
  const companySyncInitializedRef = useRef(false)

  // Backend already returns departments filtered to user's scope — just filter by selected company
  const departments = useMemo(() => {
    const matchedDepartments = (D.departments || []).filter(
      d => !values.companyName || normalizeCompany(d.company) === normalizeCompany(values.companyName)
    )

    return matchedDepartments.length > 0 ? matchedDepartments : (D.departments || [])
  }, [D.departments, values.companyName])

  useEffect(() => {
    if (!activeUser) return

    setValues(prev => {
      const nextCompany = prev.companyName || activeUser.selectedCompany || ''
      const nextDivision = activeUser.selectedDivision || prev.divisi || ''
      const matchedDept = departments.find(d =>
        String(d.originalIndex) === String(nextDivision) ||
        normalizeCompany(d.name) === normalizeCompany(activeUser.selectedDivision || '') ||
        normalizeCompany(d.class) === normalizeCompany(activeUser.selectedDivision || ''),
      )
      const nextClass = matchedDept?.class || prev.class || activeUser.selectedDivision || ''
      const nextCreatedBy = getDisplayName(activeUser) || prev.dibuatOleh

      if (
        prev.companyName === nextCompany &&
        prev.divisi === nextDivision &&
        prev.class === nextClass &&
        prev.dibuatOleh === nextCreatedBy
      ) {
        return prev
      }

      return {
        ...prev,
        companyName: nextCompany,
        divisi: nextDivision,
        class: nextClass,
        dibuatOleh: nextCreatedBy,
      }
    })
  }, [activeUser, departments])

  useEffect(() => {
    const previousCompany = previousCompanyRef.current
    const currentCompany = values.companyName || ''

    if (!companySyncInitializedRef.current) return
    if (previousCompany === currentCompany) return

    previousCompanyRef.current = currentCompany

    setValues(prev => {
      const nextDept = currentCompany ? getDefaultDepartmentForCompany(currentCompany) : null
      const nextDivisi = nextDept ? getDepartmentValue(nextDept) : ''
      const nextClass = nextDept?.class || ''
      if (prev.divisi === nextDivisi && prev.class === nextClass) return prev

      return {
        ...prev,
        divisi: nextDivisi,
        class: nextClass,
      }
    })
  }, [values.companyName, departments])

  useEffect(() => {
    if (departments.length === 0) return

    setValues(prev => {
      const nextDivisi = resolveDivisionValue(departments, prev.divisi)
      const matchedDept = findDepartmentByValue(departments, nextDivisi)
      const nextClass = matchedDept?.class || prev.class || ''
      if (nextDivisi === prev.divisi && nextClass === prev.class) return prev
      return {
        ...prev,
        divisi: nextDivisi,
        class: nextClass,
      }
    })
  }, [departments])

  const getDefaultDepartmentForCompany = useCallback((companyName) => {
    return (D.departments || []).find(
      d => !companyName || normalizeCompany(d.company) === normalizeCompany(companyName)
    ) || (D.departments || [])[0] || null
  }, [D.departments])

  // Backend returns only budgets accessible to this user.
  // Frontend filters to selected company, then to selected division (unless that division has cross-budget access).
  const budgetOptions = useMemo(() => {
    const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi))
    const targetCompany = normalizeCompany(values.companyName)
    const allBudgets = D.budgets || []
    const companyBudgets = targetCompany
      ? allBudgets.filter(b => normalizeCompany(b.company) === targetCompany)
      : allBudgets
    const scopedBudgets = targetCompany && companyBudgets.length > 0 ? companyBudgets : allBudgets

    return scopedBudgets.filter(b => {
      if (selectedDept?.canCrossBudget) return true   // HCGA/IT/etc. can use any budget
      if (!selectedDept) return true                  // no division selected yet — show all accessible
      const bClass = (b.class      || '').trim().toUpperCase()
      const bDept  = (b.department || '').trim().toUpperCase()
      const selCls = (selectedDept.class || '').trim().toUpperCase()
      return bClass === selCls || bDept === selCls
    })
  }, [D.budgets, departments, values.divisi, values.companyName])

  // Companies and divisions — backend already shaped and scoped
  const companyOptions = useMemo(
    () => buildCompanySelectOptions(activeUser, D.companies || [], isAdmin),
    [D.companies, activeUser, isAdmin],
  )
  const divisionOptions = departments.map(d => ({ value: getDepartmentValue(d), label: d.label }))
  const processDivOptions = (D.processorDepts || []).map(d => ({ value: d, label: d }))
  const canChangeCompany = isAdmin || companyOptions.length > 1
  const canChangeDivision = isAdmin || divisionOptions.length > 1
  const vendorOptions = useMemo(() => (D.vendors || []).map(v => ({ value: v.name, label: v.name })), [D.vendors])
  const kategoriOptions = ['Pengadaan Barang Baru', 'Pergantian Barang', 'Penambahan Barang'].map(k => ({ value: k, label: k }))
  const budgetSelectOpts = useMemo(() => budgetOptions.map(b => ({ value: b.id, label: `${b.id} - ${b.description}`, keywords: `${b.id} ${b.description}` })), [budgetOptions])

  const totalAmount = useMemo(() => values.items.reduce((s, it) => s + normalizeNumber(it.qty) * normalizeNumber(it.estimatedValue), 0), [values.items])
  const processId = embeddedProcessId || searchParams.get('process')
  const embeddedDivisionSource = embeddedRequest || D.editData || {}
  const sectionSurfaceStyle = embedded
    ? { padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }
    : undefined
  const sectionHeaderStyle = embedded
    ? { flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }
    : { flexWrap: 'wrap', gap: '10px' }

  const getBudgetRemaining = (budgetId) => {
    const b = (D.budgets || []).find(x => x.id === budgetId)
    return b ? b.remainingAmount : null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    
    if (!values.companyName) {
      setSubmitError('Kolom Company Name wajib diisi.')
      return
    }
    if (!values.tanggalDibutuhkan) {
      setSubmitError('Kolom Date Required wajib diisi.')
      return
    }
    if (!values.deskripsi || values.deskripsi.trim() === '') {
      setSubmitError('Kolom Description wajib diisi.')
      return
    }
    if (!values.kategoriPembelian) {
      setSubmitError('Kolom Category Payment wajib diisi.')
      return
    }
    if (!values.diprosesOleh) {
      setSubmitError('Kolom Division to Process wajib diisi.')
      return
    }
    if (!values.vendorSuggestion) {
      setSubmitError('Kolom Vendor Suggestion wajib diisi.')
      return
    }
    if (!values.picPenerima || values.picPenerima.trim() === '') {
      setSubmitError('Kolom PIC wajib diisi.')
      return
    }

    const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));
    const deptClass = values.class || selectedDept?.class || selectedDept?.name;
    
    if (!deptClass) {
      setSubmitError('Kolom Class wajib diisi. Silakan pilih Divisi & Class yang valid.')
      return
    }
    setShowConfirm(true)
  }

  const executeSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true); setSubmitError(null)
    try {
      let payload = { 
        ...values,
        companyName: values.companyName || activeUser?.selectedCompany || '',
        purchaseCategory: values.kategoriPembelian,
        description: values.deskripsi,
        processedByDepartment: values.diprosesOleh,
        requiredDate: values.tanggalDibutuhkan,
        vendorSuggestion: values.vendorSuggestion,
        receiverPic: values.picPenerima,
      }
      const selectedDept = findDepartmentByValue(departments, values.divisi);
      const activeSelectedDept = findDepartmentByValue(departments, activeUser?.selectedDivision);
      payload.divisi = selectedDept?.name || activeSelectedDept?.name || values.divisi || activeUser?.selectedDivision || '';
      payload.class = values.class || selectedDept?.class || activeSelectedDept?.class || selectedDept?.name || activeSelectedDept?.name || '';
      payload.classId = selectedDept?.id || selectedDept?.department_id || activeSelectedDept?.id || activeSelectedDept?.department_id || undefined;
      payload.className = selectedDept?.name || activeSelectedDept?.name || payload.divisi;
      payload.classClass = payload.class;
      payload.classCode = selectedDept?.code || selectedDept?.department_code || activeSelectedDept?.code || activeSelectedDept?.department_code || undefined;

      if (processId) {
        const result = await rpService.processUpdate(processId, payload)
        if (result.success) {
          onEmbeddedSuccess?.()
          setSuccessDialog({
            isOpen: true,
            title: 'Update Berhasil!',
            message: 'Data berhasil diupdate oleh divisi pemroses.',
            subMessage: 'Anda akan dialihkan kembali ke halaman Approval RP.',
            rpNo: ''
          })
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      } else {
        if (searchParams.get('revisi')) {
          payload.rpId = values.id
        } else {
          const rpNoData = await rpService.getNextRpNo(payload.divisi)
          payload.rpNo = rpNoData.rpNo
        }
        const result = await rpService.saveRp(payload)
        if (result.success) {
          setSuccessDialog({ isOpen: true, title: 'Berhasil!', message: 'Request Purchase Anda telah berhasil disimpan.', subMessage: 'Anda akan dialihkan kembali ke halaman Approval RP.', rpNo: result.rpNo })
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      }
    } catch (err) { setSubmitError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <main
        className="dashboard-main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: embedded ? 'auto' : '100%',
          overflow: embedded ? 'visible' : 'hidden',
          padding: embedded ? '0' : '16px',
          background: 'transparent',
        }}
      >
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <form
            id="rpForm"
            onSubmit={handleSubmit}
            className={embedded ? 'frp-shell frp-shell--embedded' : 'frp-shell'}
            style={embedded ? { height: 'auto', minHeight: 0 } : undefined}
          >
            {values.id && <input type="hidden" name="rpId" value={values.id} />}

            <div className="frp-top-panel">
              {/* Informasi Request Purchase */}
              <div className={embedded ? '' : 'frp-card'} style={sectionSurfaceStyle}>
                <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>info</span>
                  Informasi Request Purchase
                </h3>
                <div className="frp-grid-2">
                  <FloatingGroup label="Company Name">
                    {canChangeCompany ? (
                      <SearchableSelect
                        name="companyName"
                        value={values.companyName}
                        onChange={selectedValue => {
                          const nextDept = getDefaultDepartmentForCompany(selectedValue)
                          setValues(prev => ({
                            ...prev,
                            companyName: selectedValue,
                            divisi: nextDept ? getDepartmentValue(nextDept) : '',
                            class: nextDept?.class || '',
                          }))
                        }}
                        options={companyOptions}
                        placeholder="Select company..."
                        className="frp-select"
                        menuPosition="fixed"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={values.companyName} readOnly />
                    )}
                  </FloatingGroup>
                  <FloatingGroup label="date required">
                    <DateField name="tanggalDibutuhkan" value={values.tanggalDibutuhkan} onChange={e => updateField('tanggalDibutuhkan', e.target.value)} />
                  </FloatingGroup>
                </div>
                <div className="frp-grid-2" style={{ marginTop: "20px" }}>
                  <FloatingGroup label="Division & Class">
                    {canChangeDivision ? (
                      <SearchableSelect
                        name="divisi"
                        value={values.divisi}
                        onChange={selectedValue => {
                          const selectedDept = findDepartmentByValue(departments, selectedValue)
                          setValues(prev => ({
                            ...prev,
                            divisi: selectedValue,
                            class: selectedDept?.class || '',
                          }))
                        }}
                        options={divisionOptions}
                        placeholder="Select divisi..."
                        className="frp-select"
                        menuPosition="fixed"
                      />
                    ) : (
                      <input
                        className="frp-input-readonly"
                        value={getDivisionDisplayValue(departments, values.divisi, embeddedDivisionSource)}
                        readOnly
                      />
                    )}
                  </FloatingGroup>
                  <FloatingGroup label="Request By">
                    <input className="frp-input-readonly" value={values.dibuatOleh} readOnly />
                  </FloatingGroup>
                </div>
                <FloatingGroup label="Description" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <textarea
                    name="deskripsi"
                    className="frp-textarea"
                    value={values.deskripsi}
                    onChange={e => updateField('deskripsi', e.target.value)}
                    placeholder="Notes..."
                    style={{ height: '100%' }}
                  />
                </FloatingGroup>
              </div>

              {/* Vendor & Proses */}
              <div className={embedded ? '' : 'frp-card'} style={sectionSurfaceStyle}>
                <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>store</span>
                  Vendor &amp; Proses
                </h3>
                <div style={{ marginBottom: '20px' }}>
                  <FloatingGroup label="Vendor Suggestion">
                    <SearchableSelect
                      name="vendorSuggestion"
                      value={values.vendorSuggestion}
                      onChange={v => updateField('vendorSuggestion', v)}
                      options={vendorOptions}
                      placeholder="Search or input vendor..."
                      className="frp-select"
                      menuPosition="fixed"
                      allowCustomInput
                      customInputLabel="Vendor Manual"
                      customInputButtonLabel="Pakai nama ini"
                    />
                  </FloatingGroup>
                </div>
                <div className="frp-grid-3">
                  <FloatingGroup label="category payment">
                    <SearchableSelect
                      name="kategoriPembelian"
                      value={values.kategoriPembelian}
                      onChange={v => updateField('kategoriPembelian', v)}
                      options={kategoriOptions}
                      placeholder="Select Category"
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="division to process">
                    <SearchableSelect
                      name="diprosesOleh"
                      value={values.diprosesOleh}
                      onChange={v => updateField('diprosesOleh', v)}
                      options={processDivOptions}
                      placeholder="Select Processing Division"
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="PIC">
                    <input
                      name="picPenerima"
                      className="frp-input"
                      value={values.picPenerima}
                      onChange={e => updateField('picPenerima', e.target.value)}
                      placeholder="Recipient's name"
                    />
                  </FloatingGroup>
                </div>
              </div>
            </div>

            <div className="frp-bottom-panel">
              <div className={embedded ? 'frp-card--scroll' : 'frp-card frp-card--scroll'} style={sectionSurfaceStyle}>
                <div className="frp-card-header" style={sectionHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className="frp-section-title">
                      <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>list_alt</span>
                      Detail Items
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ButtonAddItemsFrp onClick={addRow} value="Add Item" />
                  </div>
                </div>

                <div className="frp-items-scrollable">
                  <DataTableItemsRp
                    items={values.items}
                    isMobile={isMobile}
                    embedded={embedded}
                    budgetSelectOpts={budgetSelectOpts}
                    updateItem={updateItem}
                    removeRow={removeRow}
                    addRow={addRow}
                    getBudgetRemaining={getBudgetRemaining}
                    totalAmount={totalAmount}
                    mobileDropdownStyle={mobileDropdownStyle}
                  />
                </div>

                {submitError && (
                  <div className="frp-error-banner" style={{ marginTop: '10px' }}>
                    {submitError}
                  </div>
                )}

                <div className="frp-footer" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '10px', marginBottom: isMobile ? '10px' : 0 }}>
                    <span className="frp-total-label" style={{ fontSize: '0.85rem', margin: 0 }}>Total Amount:</span>
                    <div className="frp-total-value" style={{ fontSize: '1.2rem', margin: 0 }}>Rp {formatCurrency(totalAmount)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                    <button type="button" className="frp-btn-secondary" onClick={resetValues} disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>
                      Reset
                    </button>
                    <button type="submit" className="frp-btn-primary" disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                      {submitting ? 'Menyimpan...' : (processId ? 'Update & Submit' : 'Submit Request Purchase')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
        <DialogConfirm
          isOpen={showConfirm}
          eyebrow="Konfirmasi Submit"
          title="Kirim Request Purchase?"
          message={
            processId
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
        <DialogSuccesAction
          isOpen={successDialog.isOpen}
          title={successDialog.title}
          message={successDialog.message}
          subMessage={successDialog.subMessage}
          rpNo={successDialog.rpNo}
          onConfirm={() => {
            setSuccessDialog(prev => ({ ...prev, isOpen: false }))
            if (embedded) {
              onCloseEmbedded?.()
            } else {
              navigate('/rp-approval')
            }
          }}
          buttonText={embedded ? 'Tutup' : 'Approval'}
        />
      </main>
    </>
  )
}
