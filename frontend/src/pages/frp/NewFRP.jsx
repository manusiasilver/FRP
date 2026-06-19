import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { usePageLoadingDialog } from '../../contexts/PageLoadingContext'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsFrp from '../../components/table/DataTableItemsFrp.jsx'
import ButtonAddItemsFrp from '../../components/button/ButtonAddItemsFrp.jsx'
import { frpService } from '../../services/frp/new-frp'
import DialogValidationNewFRP from '../../components/Dialog/DialogValidationNewFRP.jsx'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction.jsx'
import '../../styles/frp/new-frp.css';

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const today = new Date().toISOString().split('T')[0]

const normalizeNumber = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))

const formatDecimalInput = v => {
  if (v === undefined || v === null || v === '') return ''
  const clean = String(v).replace(/[^0-9.]/g, '')
  if (!clean) return ''
  const [intPart, ...decimalParts] = clean.split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (decimalParts.length === 0) return formattedInt
  return `${formattedInt}.${decimalParts.join('').replace(/\./g, '')}`
}

const normalizeCompany = v => String(v || '').trim().toUpperCase()
const getBudgetRemainingValue = budget => {
  if (!budget) return 0
  if (budget.budget_remaining !== undefined) return Number(budget.budget_remaining || 0)
  if (budget.sisa_budget !== undefined) return Number(budget.sisa_budget || 0)
  if (budget.sisaBudget !== undefined) return Number(budget.sisaBudget || 0)
  if (budget.remainingAmount !== undefined) return Number(budget.remainingAmount || 0)
  return 0
}

const getDisplayName = (user) => {
  return user?.name || user?.fullName || user?.username || user?.displayName || ''
}

const getEmployeeAssignments = e => {
  if (Array.isArray(e?.companies) && e.companies.length > 0) return e.companies
  if (e?.class) return [{ name: e.company || '', class: e.class, jobLevel: e.jobLevel || '' }]
  return []
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

const getDefaultItems = () => [{ memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }]

const blankForm = {
  companyName: '',
  tanggalFrp: today,
  divisi: '',
  kelas: '',
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
  attachFile: null,
  keteranganFrp: '',
  checkDocs: ['Form Request Payment'],
  items: getDefaultItems(),
  id: '',
  rpReference: '',
  fromRpId: '',
}

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

const buildInitialForm = (data, isDuplicate = false) => {
  let initialCompany = data.selectedCompany || data.user?.selectedCompany || data.user?.companyName || data.user?.company || '';
  if (data.companies && initialCompany) {
    const searchCompany = normalizeCompany(initialCompany);
    const comp = data.companies.find(c => String(c.id) === String(initialCompany) || normalizeCompany(c.code) === searchCompany || normalizeCompany(c.name) === searchCompany);
    if (comp) initialCompany = comp.name;
  }

  const base = {
    ...blankForm,
    companyName: initialCompany,
    dimintaOleh: getDisplayName(data.user),
    id: isDuplicate ? '' : (data.editData?.id || ''),
  }

  let initialDivisi = '';
  let initialKelas = '';
  if (data.departments && data.departments.length > 0) {
    const userDiv = normalizeCompany(data.selectedDivision || '');
    const matched = data.departments.find(d => normalizeCompany(d.class) === userDiv || normalizeCompany(d.name) === userDiv);
    if (matched) {
      initialDivisi = getDepartmentValue(matched);
      initialKelas = matched.class || '';
    }
  } else {
    initialDivisi = data.selectedDivision || '';
  }
  base.divisi = initialDivisi;
  base.kelas = initialKelas;

  if (!data.editData) return base

  let editDivisi = base.divisi;
  let editKelas = base.kelas;
  if (data.departments && data.departments.length > 0) {
    const dName = normalizeCompany(data.editData.departmentName || data.editData.department_name || '');
    const dClass = normalizeCompany(data.editData.departmentClass || data.editData.department_class || '');
    const matched = data.departments.find(d => normalizeCompany(d.name) === dName && (!dClass || normalizeCompany(d.class) === dClass));
    if (matched) {
      editDivisi = getDepartmentValue(matched);
      editKelas = matched.class || '';
    }
    else if (data.editData.department_id) editDivisi = data.editData.department_id;
  } else {
    editDivisi = data.editData.departmentName || data.editData.department_name || base.divisi;
  }

  return {
    ...base,
    ...data.editData,
    divisi: editDivisi,
    kelas: editKelas || data.editData.kelas || data.editData.departmentClass || data.editData.department_class || '',
    tanggalFrp: isDuplicate ? today : (data.editData.tanggalFrp || data.editData.frpDate || today),
    id: isDuplicate ? '' : (data.editData.id || ''),
    rpReference: isDuplicate ? '' : (data.editData.rpReference || ''),
    fromRpId: isDuplicate ? '' : (data.editData.fromRpId || ''),
    status: isDuplicate ? '' : (data.editData.status || ''),
    frpNo: isDuplicate ? '' : (data.editData.frpNo || ''),
    paymentDate: data.editData.paymentDate || today,
    keteranganFrp: data.editData.keteranganFrp || data.editData.frpDescription || '',
    bankTujuan: data.editData.bankTujuan || data.editData.destinationBank || '',
    rekBankTujuan: data.editData.rekBankTujuan || data.editData.destinationBankAccount || '',
    extDocType: data.editData.extDocType || data.editData.externalDocumentType || '',
    extDocNumber: data.editData.extDocNumber || data.editData.externalDocumentNumber || '',
    kurs: String(data.editData.kurs || data.editData.exchangeRate || '1'),
    checkDocs: Array.isArray(data.editData.checkDocs) ? data.editData.checkDocs : base.checkDocs,
    items: Array.isArray(data.editData.items)
      ? data.editData.items.map(i => ({
        memo: i.memo || '',
        budgetId: i.budgetId || '',
        qty: String(i.qty || '1'),
        hargaSatuan: String(i.hargaSatuan || i.price || i.harga || '0'),
      }))
      : getDefaultItems(),
  }
}

const resolveDepartmentValue = (departments, currentValue) => {
  if (!departments?.length) return currentValue || ''
  const norm = normalizeCompany(currentValue)
  const matched = departments.find(d =>
    String(d.originalIndex) === String(currentValue) ||
    normalizeCompany(d.name) === norm ||
    normalizeCompany(d.class) === norm
  )
  return matched ? String(matched.originalIndex ?? matched.id ?? currentValue ?? '') : (currentValue || '')
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
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

export default function NewFRP() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [frpData, setFrpData] = useState(null)
  const [values, setValues] = useState(blankForm)
  const { user: sessionUser, setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, title: '', message: '', subMessage: '', frpNo: '' })

  usePageLoadingDialog(loading, {
    title: 'Memuat Form FRP',
    message: 'Sistem sedang menyiapkan data form FRP Anda.',
  })

  useEffect(() => {
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    frpService.getFormData(query)
      .then(async data => {
        setFrpData(data)
      setUser(data?.user, { replaceSelection: true })
        const isDuplicate = searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'
        const initial = buildInitialForm(data, isDuplicate)
        previousCompanyRef.current = initial.companyName || ''
        companySyncInitializedRef.current = true

        const fromRpId = searchParams.get('fromRp')
        if (fromRpId) {
          try {
            const rpJson = await frpService.getRpData(fromRpId)
            if (rpJson && rpJson.data) {
              const rp = rpJson.data
              const rpDescription = rp.description || rp.deskripsi || ''
              const rpTarget = rp.vendorSuggestion || rp.vendor || rp.ke || ''

              // Map items from RP to FRP format
              const mappedItems = Array.isArray(rp.items) ? rp.items.map(it => {
                const qtyVal = Number(it.qty) || 1
                const estVal = Number(it.estimatedValue) || 0
                return {
                  memo: it.memo || '',
                  budgetId: it.budgetId || '',
                  qty: String(qtyVal),
                  hargaSatuan: formatDecimalInput(estVal),
                  amount: qtyVal * estVal,
                }
              }) : getDefaultItems()

              const rpAttachLink = Array.isArray(rp.items) ? (rp.items.find(it => it.linkPembelian)?.linkPembelian || '') : ''

              const dName = normalizeCompany(rp.departmentName || rp.divisi || '');
              const dClass = normalizeCompany(rp.departmentClass || '');
              let editDiv = initial.divisi;
              if (data.departments && data.departments.length > 0) {
                 const matched = data.departments.find(d => normalizeCompany(d.name) === dName && (!dClass || normalizeCompany(d.class) === dClass));
                 if (matched) editDiv = matched.originalIndex !== undefined ? matched.originalIndex : matched.id;
                 else if (rp.departmentId) editDiv = rp.departmentId;
              } else {
                 editDiv = rp.departmentName || rp.divisi || initial.divisi;
              }

              setValues({
                ...initial,
                companyName: rp.companyName || initial.companyName,
                divisi: editDiv,
                dimintaOleh: rp.dibuatOleh || initial.dimintaOleh,
                keteranganFrp: rpDescription,
                vendor: rpTarget,
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
      .catch(err => {
        if (err.status === 401 || err.status === 403) {
          window.location.href = '/'
        }
        setError(err.message || 'Gagal memuat data')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const FRP = frpData || {}
  const activeUser = sessionUser || FRP.user || {}
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  // Backend sudah filter berdasarkan user scope — frontend hanya filter by company
  const departments = useMemo(() => {
    const target = normalizeCompany(values.companyName)
    const allDepartments = (FRP.departments || [])
      .map(d => ({ ...d, label: d.class ? `${d.name} - ${d.class}` : d.name }))
    const matchedDepartments = allDepartments.filter(d => !target || normalizeCompany(d.company) === target)

    return (matchedDepartments.length > 0 ? matchedDepartments : allDepartments)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [FRP.departments, values.companyName])

  useEffect(() => {
    if (!activeUser) return

    setValues(prev => {
      const nextCompany = prev.companyName || activeUser.selectedCompany || ''
      const nextDivision = activeUser.selectedDivision || prev.divisi || ''
      const matchedDivision = departments.find(d =>
        String(d.originalIndex) === String(nextDivision) ||
        normalizeCompany(d.name) === normalizeCompany(activeUser.selectedDivision || '') ||
        normalizeCompany(d.class) === normalizeCompany(activeUser.selectedDivision || ''),
      )
      const nextClass = matchedDivision?.class || prev.kelas || activeUser.selectedDivision || ''
      const nextRequestBy = getDisplayName(activeUser) || prev.dimintaOleh

      if (
        prev.companyName === nextCompany &&
        prev.divisi === nextDivision &&
        prev.kelas === nextClass &&
        prev.dimintaOleh === nextRequestBy
      ) {
        return prev
      }

      return {
        ...prev,
        companyName: nextCompany,
        divisi: nextDivision,
        kelas: nextClass,
        dimintaOleh: nextRequestBy,
      }
    })
  }, [activeUser, departments])

  const previousCompanyRef = useRef(values.companyName)
  const companySyncInitializedRef = useRef(false)

  useEffect(() => {
    if (departments.length === 0) return

    setValues(prev => {
      const nextDivisi = resolveDepartmentValue(departments, prev.divisi)
      const matchedDept = findDepartmentByValue(departments, nextDivisi)
      const nextKelas = matchedDept?.class || prev.kelas || ''
      if (nextDivisi === prev.divisi && nextKelas === prev.kelas) return prev
      return { ...prev, divisi: nextDivisi, kelas: nextKelas }
    })
  }, [departments])

  useEffect(() => {
    const previousCompany = previousCompanyRef.current
    const currentCompany = values.companyName || ''

    if (!companySyncInitializedRef.current) return

    if (previousCompany === currentCompany) return

    previousCompanyRef.current = currentCompany

    setValues(prev => {
      const nextDept = currentCompany ? getDefaultDepartmentForCompany(currentCompany) : null
      const nextDivisi = nextDept ? getDepartmentValue(nextDept) : ''
      const nextKelas = nextDept?.class || ''
      if (prev.divisi === nextDivisi && prev.kelas === nextKelas) return prev
      return { ...prev, divisi: nextDivisi, kelas: nextKelas }
    })
  }, [values.companyName, departments])

  const getDefaultDepartmentForCompany = (companyName) => {
    const target = normalizeCompany(companyName)
    return (FRP.departments || []).find(d => !target || normalizeCompany(d.company) === target) ||
      (FRP.departments || [])[0] ||
      null
  }

  const divisionSelectOptions = useMemo(
    () => departments.map(d => ({ value: getDepartmentValue(d), label: d.label })),
    [departments],
  )
  const canChangeDivision = activeUser?.role === 'administrator' || divisionSelectOptions.length > 1

  // Backend sudah scoping employees — filter by company + class saja
  const filteredEmployees = useMemo(() => {
    const source = FRP.employees || []
    if (!source.length) {
      return [{ fullName: getDisplayName(activeUser), companies: [{ name: activeUser?.selectedCompany || '', class: activeUser?.selectedDivision || '' }] }]
    }
    const targetCompany = normalizeCompany(values.companyName)
    const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi))
    const targetClass = normalizeCompany(selectedDept?.class || '')
    return source.filter(e =>
      getEmployeeAssignments(e).some(a => {
        const matchCompany = !targetCompany || normalizeCompany(a.name) === targetCompany || normalizeCompany(a.code) === targetCompany
        const matchClass = !targetClass || normalizeCompany(a.class) === targetClass
        return matchCompany && matchClass
      })
    )
  }, [FRP.employees, activeUser, departments, values.companyName, values.divisi])

  // Backend sudah filter budget berdasarkan scope user
  // Frontend hanya filter by company + selected department
  const budgetOptions = useMemo(() => {
    const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi))
    const targetCompany = normalizeCompany(values.companyName)
    const allBudgets = FRP.budgets || []
    const companyBudgets = targetCompany
      ? allBudgets.filter(b => normalizeCompany(b.company) === targetCompany)
      : allBudgets
    const scopedBudgets = targetCompany && companyBudgets.length > 0 ? companyBudgets : allBudgets

    return scopedBudgets.filter(b => {
      if (!selectedDept) return true
      const bDeptId = String(b.department_id ?? b.departmentId ?? '')
      const dId = String(selectedDept.originalIndex ?? selectedDept.id ?? '')
      if (bDeptId && dId && bDeptId === dId) return true
      return normalizeCompany(b.department) === normalizeCompany(selectedDept.name)
    })
  }, [FRP.budgets, departments, values.companyName, values.divisi])

  const calculateRowAmount = item =>
    normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)

  const getBudgetAmount = budgetId => {
    const b = (frpData?.budgets || []).find(x => x.id === budgetId)
    return getBudgetRemainingValue(b)
  }

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

  const isAdmin = activeUser?.role === 'administrator'
  const companySelectOptions = useMemo(
    () => buildCompanySelectOptions(activeUser, FRP.companies || [], isAdmin),
    [FRP.companies, activeUser, isAdmin],
  )
  const visibleCompanyField = isAdmin || companySelectOptions.length > 1
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

  const handlePreSubmit = async e => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)

    try {
      // Cek ke database terlebih dahulu untuk mendapatkan sisa budget ter-update
      const resBudgets = await fetch('/api/frp/budgets')
      if (!resBudgets.ok) {
        throw new Error('Gagal memeriksa budget terbaru dari database. Silakan coba lagi.')
      }
      const latestBudgets = await resBudgets.json()

      // Ambil data FRP lama jika sedang revisi
      const isRevision = !!values.id
      let oldItems = []
      if (isRevision && frpData?.editData?.items) {
        oldItems = frpData.editData.items
      }

      const requestedByBudget = values.items.reduce((acc, item) => {
        if (!item.budgetId) return acc
        const current = acc[item.budgetId] || { totalAmount: 0, maxUnitPrice: 0 }
        const rowAmount = calculateRowAmount(item)
        const unitPriceIdr = normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)
        acc[item.budgetId] = {
          totalAmount: current.totalAmount + rowAmount,
          maxUnitPrice: Math.max(current.maxUnitPrice, unitPriceIdr),
        }
        return acc
      }, {})

      // Validasi limit budget per budgetId agar multi-item dengan budget yang sama ikut terhitung
      for (const [budgetId, requested] of Object.entries(requestedByBudget)) {
        const dbBudget = latestBudgets.find(b => b.id === budgetId)
        if (!dbBudget) {
          setSubmitError(`Budget ID ${budgetId} tidak ditemukan di database.`)
          setSubmitting(false)
          return
        }

        const dbRemaining = getBudgetRemainingValue(dbBudget)

        let revertedAmount = 0
        if (isRevision) {
          const matchedOld = oldItems.filter(oi => oi.budgetId === budgetId)
          revertedAmount = matchedOld.reduce((sum, oi) => sum + (parseFloat(oi.amount) || 0), 0)
        }

        const availableBudget = dbRemaining + revertedAmount

        if (requested.maxUnitPrice > availableBudget) {
          setSubmitError(`Harga Satuan untuk budget ${budgetId} (Rp ${formatCurrency(requested.maxUnitPrice)}) melebihi batas sisa budget di database (Rp ${formatCurrency(availableBudget)}).`)
          setSubmitting(false)
          return
        }

        if (requested.totalAmount > availableBudget) {
          setSubmitError(`Total Amount gabungan pada budget ${budgetId} (Rp ${formatCurrency(requested.totalAmount)}) melebihi batas sisa budget di database (Rp ${formatCurrency(availableBudget)}).`)
          setSubmitting(false)
          return
        }
      }

      setIsConfirmOpen(true)
    } catch (err) {
      setSubmitError(err.message || 'Koneksi gagal, coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const processSubmit = async () => {
    setIsConfirmOpen(false)
    setSubmitting(true)
    try {
      const selectedDept = findDepartmentByValue(departments, values.divisi);
      const activeSelectedDept = findDepartmentByValue(departments, activeUser?.selectedDivision);
      const selectedClass = values.kelas || selectedDept?.class || activeSelectedDept?.class || '';

      const payload = {
        frpId: values.id || undefined,
        fromRpId: values.fromRpId || undefined,
        
        companyName: values.companyName || activeUser?.selectedCompany || '',
        divisi: selectedDept?.name || activeSelectedDept?.name || values.divisi || activeUser?.selectedDivision || '',
        kelas: selectedClass,
        departmentId: selectedDept?.id || selectedDept?.department_id || activeSelectedDept?.id || activeSelectedDept?.department_id || undefined,
        departmentName: selectedDept?.name || activeSelectedDept?.name || undefined,
        departmentClass: selectedClass || undefined,
        departmentCode: selectedDept?.code || selectedDept?.department_code || activeSelectedDept?.code || activeSelectedDept?.department_code || undefined,
        dimintaOleh: values.dimintaOleh,
        rpReference: values.rpReference,
        attachLink: values.attachLink,

        frpDate: values.tanggalFrp,
        currency: values.currency,
        exchangeRate: String(values.kurs),
        frpDescription: values.keteranganFrp,
        vendor: values.vendor,
        internalPoNumber: values.internalPoNumber,
        externalDocumentType: values.extDocType,
        externalDocumentNumber: values.extDocNumber,
        paymentMethod: values.paymentMethod,
        paymentDate: values.paymentDate,
        destinationBank: values.bankTujuan,
        destinationBankAccount: values.rekBankTujuan,
        checkDocs: values.checkDocs,
        items: values.items.map(item => ({
          budgetId: item.budgetId || null,
          memo: item.memo || '',
          qty: normalizeNumber(item.qty),
          price: normalizeNumber(item.hargaSatuan),
          amount: calculateRowAmount(item),
        })),
      }

      const d = await frpService.saveFrp(payload)

      if (d.success) {
        if (values.attachFile) {
          try {
            await frpService.uploadAttachment(d.id, values.attachFile)
          } catch (uploadErr) {
            console.error('Failed to upload attachment:', uploadErr)
          }
        }
        setSuccessDialog({
          isOpen: true,
          title: 'Berhasil!',
          message: 'FRP Anda telah berhasil disimpan.',
          subMessage: 'Anda akan dialihkan kembali ke halaman Approval FRP.',
          frpNo: d.frpNo || d.data?.frpNo || values.frpNo || d.id || values.id || '',
        })
      } else {
        setSubmitError(d.error || 'Gagal menyimpan, coba lagi.')
      }
    } catch (err) {
      setSubmitError(err.message || 'Koneksi gagal, coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      className="dashboard-main"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflowY: isMobile ? 'auto' : 'hidden',
        overflowX: 'hidden',
        padding: isMobile ? '12px' : '16px',
      }}
    >
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>
          {error}
        </div>
      )}
      {!loading && !error && (
        <form id="frpForm" onSubmit={handlePreSubmit} className="frp-shell">
          {values.id && <input type="hidden" name="frpId" value={values.id} />}

          {values.rpReference && (
            <div className="frp-ref-banner">
              <span className="material-icons-round" style={{ fontSize: '18px' }}>info</span>
              Membuat FRP dari referensi Request Purchase No: <strong>{values.rpReference}</strong>
            </div>
          )}

          <div className="frp-top-panel">
            {/* Informasi FRP */}
            <div className="frp-card">
              <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>info</span>
                Informasi FRP
              </h3>
              <div className="frp-grid-2">
                <FloatingGroup label="Company Name">
                  {visibleCompanyField ? (
                    <SearchableSelect
                      name="companyName"
                      value={values.companyName}
                      onChange={selectedValue => {
                        const nextDept = getDefaultDepartmentForCompany(selectedValue)
                        setValues(prev => ({
                          ...prev,
                          companyName: selectedValue,
                          divisi: nextDept ? getDepartmentValue(nextDept) : '',
                          kelas: nextDept?.class || '',
                        }))
                      }}
                      options={companySelectOptions}
                      placeholder="Select company..."
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  ) : (
                    <input className="frp-input-readonly" value={values.companyName} readOnly />
                  )}
                </FloatingGroup>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <FloatingGroup label="Currency" style={{ flex: 1, minWidth: 0 }}>
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
                      placeholder="Select currency..."
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="Rate" style={{ width: '120px', flexShrink: 0 }}>
                    <input
                      name="kurs"
                      className="frp-input"
                      placeholder="0"
                      style={{ width: '100%', background: values.currency === 'IDR' ? '#f8fafc' : undefined, color: values.currency === 'IDR' ? '#94a3b8' : undefined }}
                      value={formatDecimalInput(values.kurs)}
                      onChange={e => updateField('kurs', e.target.value.replace(/[^0-9.]/g, ''))}
                      readOnly={values.currency === 'IDR'}
                    />
                  </FloatingGroup>
                </div>
              </div>
              <div className="frp-grid-3" style={{ marginTop: "20px", gridTemplateColumns: (!isMobile && !isTablet) ? 'minmax(0, 1.8fr) minmax(0, 1.2fr) 170px' : undefined }}>
                <FloatingGroup label="Division & Class">
                  <input className="frp-input-readonly" value={departments.find(d => String(d.originalIndex) === String(values.divisi))?.label || values.kelas || values.divisi} readOnly />
                </FloatingGroup>
                <FloatingGroup label="Request by">
                  <input className="frp-input-readonly" value={values.dimintaOleh} readOnly />
                </FloatingGroup>
                <FloatingGroup label="FRP Date">
                  <DateField name="tanggalFrp" value={values.tanggalFrp} onChange={e => updateField('tanggalFrp', e.target.value)} />
                </FloatingGroup>
              </div>
              <FloatingGroup label="Description" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <textarea
                  name="keteranganFrp"
                  className="frp-textarea"
                  value={values.keteranganFrp}
                  onChange={e => updateField('keteranganFrp', e.target.value)}
                  placeholder="Write a description..."
                  style={{ height: '100%' }}
                />
              </FloatingGroup>
            </div>

            {/* Vendor & Pembayaran */}
            <div className="frp-card">
              <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>store</span>
                Vendor &amp; Pembayaran
              </h3>
              <div className="frp-grid-2">
                <FloatingGroup label="Vendor">
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
                    placeholder="Select vendor..."
                    className="frp-select"
                    menuPosition="fixed"
                  />
                </FloatingGroup>
                <FloatingGroup label="Internal PO Number">
                  <input name="internalPoNumber" className="frp-input" placeholder="Internal PO Number..." value={values.internalPoNumber} onChange={e => updateField('internalPoNumber', e.target.value)} />
                </FloatingGroup>
              </div>
              <div className="frp-grid-3" style={{ marginTop: "20px" }}>
                <FloatingGroup label="Ext Doc Type">
                  <SearchableSelect
                    name="extDocType"
                    value={values.extDocType}
                    onChange={selectedValue => updateField('extDocType', selectedValue)}
                    options={extDocTypeOptions}
                    placeholder="Select tipe..."
                    className="frp-select"
                    menuPosition="fixed"
                  />
                </FloatingGroup>
                <FloatingGroup label="Ext Doc Number">
                  <input name="extDocNumber" className="frp-input" placeholder="Document Number..." value={values.extDocNumber} onChange={e => updateField('extDocNumber', e.target.value)} />
                </FloatingGroup>
                <FloatingGroup label="Payment Method">
                  <SearchableSelect
                    name="paymentMethod"
                    value={values.paymentMethod}
                    onChange={selectedValue => updateField('paymentMethod', selectedValue)}
                    options={paymentMethodOptions}
                    placeholder="Pilih metode..."
                    className="frp-select"
                    menuPosition="fixed"
                  />
                </FloatingGroup>
              </div>
              <div className="frp-grid-3" style={{ marginTop: "20px" }}>
                <FloatingGroup label="Payment Date">
                  <DateField name="paymentDate" value={values.paymentDate} onChange={e => updateField('paymentDate', e.target.value)} />
                </FloatingGroup>
                <FloatingGroup label="destination bank">
                  <input name="bankTujuan" className="frp-input" placeholder="Bank Name..." value={values.bankTujuan || ''} onChange={e => updateField('bankTujuan', e.target.value)} />
                </FloatingGroup>
                <FloatingGroup label="destination bank account">
                  <input name="rekBankTujuan" className="frp-input" placeholder="Account number..." value={values.rekBankTujuan || ''} onChange={e => updateField('rekBankTujuan', e.target.value)} />
                </FloatingGroup>
              </div>
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachment</label>
                <div 
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: values.attachFile ? 'space-between' : 'center',
                    gap: '12px'
                  }}
                  onClick={() => document.getElementById('frp-file-upload').click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      updateField('attachFile', e.dataTransfer.files[0]);
                    }
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#94a3b8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <input 
                    id="frp-file-upload"
                    type="file" 
                    name="attachFile" 
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        updateField('attachFile', e.target.files[0])
                      }
                    }} 
                  />
                  {values.attachFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <span className="material-icons-round" style={{ fontSize: '28px', color: '#10b981' }}>description</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{values.attachFile.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{(values.attachFile.size / 1024).toFixed(2)} KB</span>
                      </div>
                      <button 
                        type="button" 
                        className="frp-btn-del"
                        onClick={(e) => { e.stopPropagation(); updateField('attachFile', null); document.getElementById('frp-file-upload').value = ''; }}
                        style={{ flexShrink: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Hapus File"
                      >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-icons-round" style={{ fontSize: '28px', color: '#94a3b8' }}>cloud_upload</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                          <span style={{ color: '#2563eb', fontWeight: '600' }}>Click for upload</span> or drag & drop
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Max. 10MB (Documents/Images)</span>
                      </div>
                    </div>
                  )}
                </div>
                {values.attachLink && typeof values.attachLink === 'string' && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px', color: '#2563eb' }}>attachment</span>
                    <a href={`/api/frp/${values.id}/attachment`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                      Lihat Attachment Tersimpan
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="frp-bottom-panel">
            <div className="frp-card frp-card--scroll">
              <div className="frp-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 className="frp-section-title">
                    <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>list_alt</span>
                    Detail Items
                  </h3>
                  <div className="frp-check-row">
                    {CHECK_DOCS.map(doc => {
                      const checked = values.checkDocs.includes(doc)
                      return (
                        <div
                          key={doc}
                          className={`frp-check-item ${checked ? 'frp-check-item-active' : ''}`}
                          onClick={() => handleCheckDocToggle(doc)}
                        >
                          <span className="material-icons-round" style={{ fontSize: '14px' }}>
                            {checked ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <input type="checkbox" name="checkDocs[]" value={doc} checked={checked} onChange={() => { }} style={{ display: 'none' }} />
                          {doc}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ButtonAddItemsFrp onClick={handleAddRow} value="Add Item" />
                </div>
              </div>
              
              <div className="frp-items-scrollable">
                <DataTableItemsFrp
                  items={values.items}
                  isMobile={isMobile}
                  budgetSelectOptions={budgetSelectOptions}
                  updateItem={updateItem}
                  handleAddRow={handleAddRow}
                  handleRemoveRow={handleRemoveRow}
                  getBudgetAmount={getBudgetAmount}
                  totalAmount={totalAmount}
                  calculateRowAmount={calculateRowAmount}
                  budgets={frpData?.budgets || []}
                  kurs={values.kurs}
                  currency={values.currency}
                />
              </div>

              {submitError && (
                <div className="frp-error-banner" style={{ marginTop: '10px' }}>
                  {submitError}
                </div>
              )}

              <div className="frp-footer" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '10px', marginBottom: isMobile ? '10px' : 0 }}>
                  <span className="frp-total-label" style={{ fontSize: '0.85rem', margin: 0 }}>Total Payment:</span>
                  <div className="frp-total-value" style={{ fontSize: '1.2rem', margin: 0 }}>Rp {formatCurrency(totalAmount)}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                  <button type="button" className="frp-btn-secondary" onClick={() => setValues(buildInitialForm(FRP, searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'))} disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>
                    Reset
                  </button>
                  <button type="submit" className="frp-btn-primary" disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                    {submitting ? 'Menyimpan...' : 'Submit ke Approval'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      <DialogValidationNewFRP
        isOpen={isConfirmOpen}
        isLoading={submitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={processSubmit}
        frpNo={values.frpNo || values.id}
        dimintaOleh={values.dimintaOleh || getDisplayName(activeUser)}
      />
      <DialogSuccesAction
        isOpen={successDialog.isOpen}
        title={successDialog.title}
        message={successDialog.message}
        subMessage={successDialog.subMessage}
        rpNo={successDialog.frpNo}
        referenceLabel="Nomor FRP"
        onConfirm={() => {
          setSuccessDialog(prev => ({ ...prev, isOpen: false }))
          navigate('/approval')
        }}
        buttonText="Approval"
      />
    </main>
  )
}
