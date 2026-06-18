import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Navigate } from 'react-router-dom'
import { usePageLoadingDialog } from '../contexts/PageLoadingContext'
import { useUser } from '../contexts/UserContext'
import { XClose } from '../components/template/TemplateIcons.jsx'
import SearchableSelect from '../components/template/SearchableSelect.jsx'
import CreateButton from '../components/button/CreateButton.jsx'
import ButtonCreateBudgets from '../components/button/ButtonCreateBudgets.jsx'
import DataTableBudgets from '../components/table/DataTableBudgets.jsx'
import DialogCreateBudgets from '../components/Dialog/DialogCreateBudgets.jsx'
import Vendor from './vendor/Vendor.jsx'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const COMPANIES = ['PT PILAR NIAGA MAKMUR', 'PT PILAR KARANG SAMUDERA', 'PT PILAR KARGO PERKASA']
const JOB_LEVELS = ['Staff', 'Manager', 'Direktur', 'Komisaris']
const VALID_TYPES = ['vendors', 'budgets']
const PAGE_META = {
  vendors: { title: 'Master Vendor', noun: 'Vendor', icon: 'store', accent: '#0f766e', description: 'Rapikan data vendor dan informasi rekening tujuan pembayaran.' },
  budgets: { title: 'Master Anggaran', noun: 'Anggaran', icon: 'savings', accent: '#b45309', description: 'Kelola budget ID, company, departemen, dan limit anggaran tahunan.' },
}

function getBlankForm(type, defaultCompany = '') {
  if (type === 'vendors') return { name: '', bank: '', no_rekening: '' }
  if (type === 'budgets') return { id: '', department: '', company: defaultCompany, class: '', type: '', description: '', totalAmount: '' }
  return {}
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

const formatCurrency = value => {
  const normalized = Number(String(value || 0).replace(/[^0-9.-]/g, ''))
  return `IDR ${Number.isNaN(normalized) ? 0 : normalized.toLocaleString('id-ID')}`
}

function buildStyles(isMobile, isTablet, accent) {
  return {
    card: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: isMobile ? '1rem' : '1.5rem',
      marginBottom: isMobile ? '1rem' : '1.5rem',
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
    sectionSubtitle: {
      margin: '0.2rem 0 0',
      color: '#64748b',
      fontSize: '0.84rem',
      lineHeight: 1.5,
    },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' },
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
      transition: 'border-color 0.2s, background 0.2s',
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
      background: '#f8fafc',
      color: '#1e293b',
      resize: 'vertical',
      minHeight: '96px',
    },
    grid2: { display: 'grid', gridTemplateColumns: getGridColumns(2, isMobile, isTablet), gap: isMobile ? '0.85rem' : '1rem' },
    grid3: { display: 'grid', gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: isMobile ? '0.85rem' : '1rem' },
    assignCard: {
      border: '1px solid #dbe5f0',
      borderRadius: '14px',
      background: '#fbfdff',
      padding: isMobile ? '0.9rem' : '1rem',
      marginBottom: '0.85rem',
    },
    listShell: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    toolbar: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: '0.9rem',
      padding: isMobile ? '12px' : '14px 18px',
      borderBottom: '1px solid #e2e8f0',
      background: '#f8fafc',
    },
    filterWrap: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'flex-end',
      gap: '10px',
    },
    tableContain: { display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 360px)' },
    scrollBody: { flex: 1, overflowY: 'auto', overflowX: 'hidden' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' },
    th: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      padding: '10px 14px',
      textAlign: 'left',
      borderBottom: '2px solid #e2e8f0',
      boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)',
      background: '#f8fafc',
      fontWeight: 700,
      color: '#475569',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '11px 14px',
      textAlign: 'left',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '0.9rem',
      verticalAlign: 'top',
      color: '#334155',
    },
    mobileItemCard: {
      padding: '1rem',
      borderBottom: '1px solid #eef2f7',
      background: 'white',
    },
    mobileMetaGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.8rem',
      marginTop: '0.95rem',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    },
    badgeSoft: { background: '#e2e8f0', color: '#334155' },
    badgeCode: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
    badgeClass: { background: '#e0f2fe', color: '#0369a1' },
  }
}

function SectionHeading({ icon, title, subtitle, accent }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
        <span className="material-icons-round" style={{ color: accent, fontSize: '20px' }}>{icon}</span>
        {title}
      </h3>
      {subtitle ? <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5 }}>{subtitle}</p> : null}
    </div>
  )
}



function VendorFormFields({ form, onChange, styles }) {
  return (
    <div style={styles.grid3}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Nama Vendor / PT</label>
        <input style={styles.input} required value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="PT Contoh Maju" />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Nama Bank Tujuan</label>
        <input style={styles.input} required value={form.bank} onChange={e => onChange('bank', e.target.value)} placeholder="BCA a/n PT Contoh" />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Nomor Rekening</label>
        <input style={styles.input} required value={form.no_rekening} onChange={e => onChange('no_rekening', e.target.value)} placeholder="1234567890" />
      </div>
    </div>
  )
}



function BudgetFormFields({ form, onChange, companyNames, departments = [], styles }) {
  const departmentOptions = useMemo(() => {
    const normalizeCompany = v => String(v || '').trim().toUpperCase()
    const currentCompany = form.company || ''
    const filtered = (departments || [])
      .filter(d => !currentCompany || normalizeCompany(d.company) === normalizeCompany(currentCompany))
      .map(d => d.name)
      .filter(Boolean)
    return [...new Set(filtered)].sort()
  }, [departments, form.company])

  return (
    <>
      <div style={styles.grid3}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Budget ID</label>
          <input style={styles.input} required value={form.id} onChange={e => onChange('id', e.target.value)} placeholder="FIN-001" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Divisi</label>
          <SearchableSelect
            style={styles.select}
            value={form.department}
            onChange={val => onChange('department', val)}
            options={departmentOptions}
            placeholder="Pilih Divisi"
            menuPosition="fixed"
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Company</label>
          <SearchableSelect
            style={styles.select}
            value={form.company}
            onChange={val => onChange('company', val)}
            options={companyNames}
            placeholder="Pilih Company"
            menuPosition="fixed"
          />
        </div>
      </div>
      <div style={styles.grid2}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Class</label>
          <input style={styles.input} required value={form.class} onChange={e => onChange('class', e.target.value)} placeholder="Product" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Type</label>
          <input style={styles.input} required value={form.type} onChange={e => onChange('type', e.target.value)} placeholder="Cost / Aktiva" />
        </div>
      </div>
      <div style={styles.grid2}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Deskripsi</label>
          <textarea style={styles.textarea} required value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Biaya ATK" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Total Limit (Amount) Setahun</label>
          <input style={styles.input} required value={form.totalAmount} onChange={e => onChange('totalAmount', e.target.value)} placeholder="10000000" />
        </div>
      </div>
    </>
  )
}



function FormFields({ type, form, onChange, companyNames = COMPANIES, departments = [], styles }) {
  if (type === 'vendors') return <VendorFormFields form={form} onChange={onChange} styles={styles} />
  if (type === 'budgets') return <BudgetFormFields form={form} onChange={onChange} companyNames={companyNames} departments={departments} styles={styles} />
  return null
}

export default function AdminPage() {
  const { type } = useParams()

  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const [data, setData] = useState(null)
  const { setUser } = useUser()
  const [addForm, setAddForm] = useState(() => getBlankForm(type))
  const [editItem, setEditItem] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [renderedType, setRenderedType] = useState(type)

  const companyNames = useMemo(() => {
    const names = (data?.companies || []).map(company => company.name || company).filter(Boolean)
    return names.length ? names : COMPANIES
  }, [data?.companies])

  // Synchronous state reset — runs before browser paint, no stale-data flash
  if (renderedType !== type) {
    setRenderedType(type)
    setAddForm(getBlankForm(type, companyNames[0] || ''))
    setEditItem(null)
    setIsCreateOpen(false)
    setCompanyFilter('')
    setSearch('')
    setData(null)
  }

  const loading = data === null

  const meta = PAGE_META[type]
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT
  const styles = buildStyles(isMobile, isTablet, meta.accent)

  usePageLoadingDialog(loading, {
    title: `Memuat ${meta.title}`,
    message: `Sistem sedang menyiapkan data ${meta.noun.toLowerCase()}.`,
  })

  const loadData = useCallback(() => {
    fetch(`/api/data/admin?type=${type}`)
      .then(r => { if (!r.ok) { window.location.href = '/'; throw new Error() } return r.json() })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(() => { })
  }, [type])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!editItem) return
    const handleKeyDown = e => { if (e.key === 'Escape') setEditItem(null) }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editItem])

  const updateAddForm = (field, val) => setAddForm(f => ({ ...f, [field]: val }))
  const updateEditForm = (field, val) => setEditItem(f => ({ ...f, [field]: val }))

  const handleAdd = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/${type}/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) })
      const d = await res.json()
      if (d.success) {
        setAddForm(getBlankForm(type))
        setIsCreateOpen(false)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async index => {
    if (!confirm('Yakin ingin menghapus baris ini?')) return
    const res = await fetch(`/api/admin/${type}/delete/${index}`, { method: 'POST' })
    const d = await res.json()
    if (d.success) loadData()
  }

  const handleEdit = item => {
    const copy = JSON.parse(JSON.stringify(item))
    setEditItem(copy)
  }

  const handleEditSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/${type}/edit/${editItem.originalIndex}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) })
      const d = await res.json()
      if (d.success) {
        setEditItem(null)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const showFilter = type === 'budgets'
  const listData = data?.listData || []

  return (
    <>
      <main className="dashboard-main">
        {!loading && <>
          {type === 'budgets' ? (
            <>
              <section style={styles.listShell}>
                <div style={styles.toolbar}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>Daftar {meta.noun}</h3>
                    <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.84rem' }}>Lihat, filter, edit, dan hapus data {meta.noun.toLowerCase()} dari satu tampilan.</p>
                  </div>
                  <div style={styles.filterWrap}>
                    <div style={{ minWidth: isMobile ? '100%' : '220px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Cari</label>
                      <div style={{ position: 'relative' }}>
                        <span className="material-icons-round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px', pointerEvents: 'none' }}>search</span>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Cari ${meta.noun.toLowerCase()}...`}
                          style={{ ...styles.select, paddingLeft: '36px', cursor: 'text' }} />
                      </div>
                    </div>
                    {showFilter && (
                      <>
                        <div style={{ minWidth: isMobile ? '100%' : '220px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Filter PT</label>
                          <SearchableSelect
                            style={styles.select}
                            value={companyFilter}
                            onChange={val => setCompanyFilter(val)}
                            options={companyNames}
                            placeholder="Semua Perusahaan"
                            menuPosition="fixed"
                          />
                        </div>
                        <ButtonCreateBudgets
                          label="Anggaran"
                          value="Tambah Anggaran"
                          icon={<span className="material-icons-round" style={{ fontSize: '20px' }}>add_circle</span>}
                          onClick={() => setIsCreateOpen(true)}
                        />
                      </>
                    )}
                  </div>
                </div>

                <DataTableBudgets
                  listData={listData}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  companyFilter={companyFilter}
                  search={search}
                  companyNames={companyNames}
                  isMobile={isMobile}
                />
              </section>
            </>
          ) : (
            <Vendor
              listData={listData}
              onEdit={handleEdit}
              onDelete={handleDelete}
              saving={saving}
              addForm={addForm}
              updateAddForm={updateAddForm}
              handleAdd={handleAdd}
              search={search}
              setSearch={setSearch}
            />
          )}
        </>}
      </main>

      {editItem && createPortal(
        <div className="dashboard-popup-overlay" role="presentation" onClick={() => setEditItem(null)}>
          <div className="dashboard-popup" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ width: 'min(92vw, 920px)', maxWidth: 'none', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-popup__header">
              <div>
                <p className="dashboard-popup__eyebrow">Edit Data</p>
                <h2 className="dashboard-popup__title">Edit {meta.noun}</h2>
              </div>
              <button type="button" className="dashboard-popup__close" aria-label="Tutup dialog" onClick={() => setEditItem(null)}>
                <XClose size={18} />
              </button>
            </div>
            <div className="dashboard-popup__body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
              <form onSubmit={handleEditSave}>
                <FormFields type={type} form={editItem} onChange={updateEditForm} companyNames={companyNames} departments={data?.departments || []} styles={styles} />
                <CreateButton type="submit" variant="accordion" tone="primary" disabled={saving} style={{ width: '100%', marginTop: '0.75rem', opacity: saving ? 0.7 : 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </CreateButton>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {type === 'budgets' && (
        <DialogCreateBudgets
          isOpen={isCreateOpen}
          eyebrow="Master Anggaran"
          title="Tambah Anggaran Baru"
          onClose={() => setIsCreateOpen(false)}
        >
          <form onSubmit={handleAdd}>
            <FormFields type={type} form={addForm} onChange={updateAddForm} companyNames={companyNames} departments={data?.departments || []} styles={styles} />
            <CreateButton type="submit" variant="accordion" tone="primary" disabled={saving} style={{ width: '100%', marginTop: '0.75rem', opacity: saving ? 0.7 : 1 }}>
              <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
              {saving ? 'Menyimpan...' : 'Simpan Data'}
            </CreateButton>
          </form>
        </DialogCreateBudgets>
      )}
    </>
  )
}
