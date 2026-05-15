import { useState, useEffect, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const COMPANIES = ['PT PILAR NIAGA MAKMUR', 'PT PILAR KARANG SAMUDERA', 'PT PILAR KARGO PERKASA']
const JOB_LEVELS = ['Staff', 'Manager', 'Direktur', 'Komisaris']
const VALID_TYPES = ['employees', 'vendors', 'departments', 'budgets', 'roles']

const blankAssignment = () => ({ name: COMPANIES[0], class: '', jobLevel: 'Staff' })

function getBlankForm(type) {
  if (type === 'employees') return { fullName: '', email: '', companies: [blankAssignment()] }
  if (type === 'vendors') return { name: '', bank: '', account: '' }
  if (type === 'departments') return { name: '', class: '', kodeFrp: '', manager: '' }
  if (type === 'budgets') return { id: '', department: '', company: COMPANIES[0], class: '', type: '', description: '', totalAmount: '' }
  if (type === 'roles') return { role: '', description: '' }
  return {}
}

const S = {
  card: { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' },
  addCard: { background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', padding: '1.5rem', marginBottom: '1.5rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  select: { width: '100%', padding: '0.65rem 0.9rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: 'white' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.25rem', background: '#1f4e8c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' },
  btnEdit: { background: '#e2e8f0', border: 'none', color: '#475569', cursor: 'pointer', padding: '5px 8px', borderRadius: '6px', marginRight: '4px', display: 'inline-flex', alignItems: 'center' },
  btnDel: { background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' },
  btnAdd: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' },
  btnRemove: { background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' },
  assignRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-end' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'white', padding: '2rem', borderRadius: '20px', width: '90%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' },
  badgeClass: { background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' },
  badgeCode: { background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: '1px solid #fde68a' },
}

function EmployeeFormFields({ form, onChange, onAssignmentsChange }) {
  const addAssignment = () => onAssignmentsChange([...form.companies, blankAssignment()])
  const removeAssignment = idx => onAssignmentsChange(form.companies.filter((_, i) => i !== idx))
  const updateAssignment = (idx, field, val) => onAssignmentsChange(form.companies.map((a, i) => i === idx ? { ...a, [field]: val } : a))
  return (
    <>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Nama Lengkap</label><input style={S.input} required value={form.fullName} onChange={e => onChange('fullName', e.target.value)} placeholder="Budi Santoso" /></div>
        <div style={S.formGroup}><label style={S.label}>Email</label><input type="email" style={S.input} value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="budi@piagam.id" /></div>
      </div>
      <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', background: 'white', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#475569' }}>Penugasan Perusahaan & Divisi</h4>
        {form.companies.map((a, idx) => (
          <div key={idx} style={S.assignRow}>
            <div style={{ flex: 1 }}><label style={S.label}>Company</label><select style={S.select} value={a.name} onChange={e => updateAssignment(idx, 'name', e.target.value)}>{COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={S.label}>Class</label><input style={S.input} required value={a.class} onChange={e => updateAssignment(idx, 'class', e.target.value)} placeholder="IT" /></div>
            <div style={{ flex: 1 }}><label style={S.label}>Job Level</label><select style={S.select} value={a.jobLevel} onChange={e => updateAssignment(idx, 'jobLevel', e.target.value)}>{JOB_LEVELS.map(j => <option key={j} value={j}>{j}</option>)}</select></div>
            <button type="button" style={S.btnRemove} onClick={() => removeAssignment(idx)} disabled={form.companies.length === 1}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></button>
          </div>
        ))}
        <button type="button" style={S.btnAdd} onClick={addAssignment}><span className="material-icons-round" style={{ fontSize: '16px' }}>add</span> Tambah Assignment</button>
      </div>
    </>
  )
}

function VendorFormFields({ form, onChange }) {
  return (
    <div style={S.grid3}>
      <div style={S.formGroup}><label style={S.label}>Nama Vendor / PT</label><input style={S.input} required value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="PT Contoh Maju" /></div>
      <div style={S.formGroup}><label style={S.label}>Nama Bank Tujuan</label><input style={S.input} required value={form.bank} onChange={e => onChange('bank', e.target.value)} placeholder="BCA a/n PT Contoh" /></div>
      <div style={S.formGroup}><label style={S.label}>Nomor Rekening</label><input style={S.input} required value={form.account} onChange={e => onChange('account', e.target.value)} placeholder="1234567890" /></div>
    </div>
  )
}

function DepartmentFormFields({ form, onChange, employeeList }) {
  return (
    <>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Nama Department</label><input style={S.input} required value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="FINANCE & ACCOUNTING" /></div>
        <div style={S.formGroup}><label style={S.label}>Class</label><input style={S.input} required value={form.class} onChange={e => onChange('class', e.target.value)} placeholder="FINANCE" /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Kode FRP (3 Huruf)</label><input style={S.input} required value={form.kodeFrp} onChange={e => onChange('kodeFrp', e.target.value)} placeholder="FIN" maxLength="3" /></div>
        <div style={S.formGroup}>
          <label style={S.label}>Manager / Head</label>
          <select style={S.select} required value={form.manager} onChange={e => onChange('manager', e.target.value)}>
            <option value="">Pilih Manager</option>
            {(employeeList || []).filter(e => e?.fullName).sort((a, b) => a.fullName.localeCompare(b.fullName)).map(emp => {
              const classes = Array.isArray(emp.companies) ? [...new Set(emp.companies.map(c => c.class).filter(Boolean))].join(', ') : (emp.class || '-')
              return <option key={emp.fullName} value={emp.fullName}>{emp.fullName} - {classes}</option>
            })}
          </select>
        </div>
      </div>
    </>
  )
}

function BudgetFormFields({ form, onChange }) {
  return (
    <>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Budget ID</label><input style={S.input} required value={form.id} onChange={e => onChange('id', e.target.value)} placeholder="FIN-001" /></div>
        <div style={S.formGroup}><label style={S.label}>Departemen</label><input style={S.input} required value={form.department} onChange={e => onChange('department', e.target.value)} placeholder="FINANCE" /></div>
        <div style={S.formGroup}><label style={S.label}>Company</label><select style={S.select} required value={form.company} onChange={e => onChange('company', e.target.value)}>{COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Class</label><input style={S.input} required value={form.class} onChange={e => onChange('class', e.target.value)} placeholder="Product" /></div>
        <div style={S.formGroup}><label style={S.label}>Type</label><input style={S.input} required value={form.type} onChange={e => onChange('type', e.target.value)} placeholder="Cost / Aktiva" /></div>
      </div>
      <div style={S.grid2}>
        <div style={S.formGroup}><label style={S.label}>Deskripsi</label><input style={S.input} required value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Biaya ATK" /></div>
        <div style={S.formGroup}><label style={S.label}>Total Limit (Amount) Setahun</label><input style={S.input} required value={form.totalAmount} onChange={e => onChange('totalAmount', e.target.value)} placeholder="10000000" /></div>
      </div>
    </>
  )
}

function RoleFormFields({ form, onChange }) {
  return (
    <div style={S.grid2}>
      <div style={S.formGroup}><label style={S.label}>Role Name</label><input style={S.input} required value={form.role} onChange={e => onChange('role', e.target.value)} placeholder="administrator" /></div>
      <div style={S.formGroup}><label style={S.label}>Description</label><input style={S.input} required value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Akses penuh" /></div>
    </div>
  )
}

function FormFields({ type, form, onChange, onAssignmentsChange, employeeList }) {
  if (type === 'employees') return <EmployeeFormFields form={form} onChange={onChange} onAssignmentsChange={onAssignmentsChange} />
  if (type === 'vendors') return <VendorFormFields form={form} onChange={onChange} />
  if (type === 'departments') return <DepartmentFormFields form={form} onChange={onChange} employeeList={employeeList} />
  if (type === 'budgets') return <BudgetFormFields form={form} onChange={onChange} />
  if (type === 'roles') return <RoleFormFields form={form} onChange={onChange} />
  return null
}

function TableRows({ type, listData, onEdit, onDelete, companyFilter }) {
  const filtered = companyFilter
    ? listData.filter(item => {
        if (type === 'employees') return item.companies?.some(c => c.name === companyFilter) || item.company === companyFilter
        if (type === 'budgets') return (item.company || COMPANIES[0]) === companyFilter
        return true
      })
    : listData

  if (filtered.length === 0) return <tr><td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Tidak ada data</td></tr>

  return filtered.map((item, idx) => (
    <tr key={item.originalIndex ?? idx} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
      <td style={S.td}>{idx + 1}</td>
      {type === 'employees' && <>
        <td style={S.td}>{item.fullName}</td>
        <td style={S.td}>{item.email || '-'}</td>
        <td style={S.td}>
          {Array.isArray(item.companies) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {item.companies.map((c, i) => (
                <div key={i} style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', borderLeft: '3px solid #1f4e8c', fontSize: '0.8rem' }}>
                  <strong>{c.name}</strong><br />
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{c.class} — {c.jobLevel}</span>
                </div>
              ))}
            </div>
          ) : item.company || 'N/A'}
        </td>
        <td style={S.td}>
          {Array.isArray(item.companies)
            ? [...new Set(item.companies.map(c => c.class))].map(cls => <span key={cls} style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', marginRight: '4px' }}>{cls}</span>)
            : <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{item.class}</span>}
        </td>
        <td style={S.td}>{Array.isArray(item.companies) ? item.companies.map(c => c.jobLevel).join(', ') : item.jobLevel}</td>
        <td style={S.td}><span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: item.role === 'administrator' ? '#bbf7d0' : '#fef08a', color: item.role === 'administrator' ? '#166534' : '#854d0e' }}>{item.role || 'user'}</span></td>
      </>}
      {type === 'vendors' && <>
        <td style={S.td}><strong>{item.name}</strong></td>
        <td style={S.td}>{item.bank}</td>
        <td style={{ ...S.td, fontFamily: 'monospace' }}>{item.account}</td>
      </>}
      {type === 'departments' && <>
        <td style={S.td}><strong>{item.name}</strong></td>
        <td style={S.td}><span style={S.badgeClass}>{item.class}</span></td>
        <td style={S.td}><span style={S.badgeCode}>{item.kodeFrp}</span></td>
        <td style={S.td}>{item.manager}</td>
      </>}
      {type === 'budgets' && <>
        <td style={S.td}><strong>{item.id}</strong></td>
        <td style={{ ...S.td, fontSize: '0.8rem', fontWeight: 600 }}>{item.company || COMPANIES[0]}</td>
        <td style={S.td}><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>{item.department}</span></td>
        <td style={S.td}>{item.class}</td>
        <td style={S.td}><span style={S.badgeCode}>{item.type}</span></td>
        <td style={{ ...S.td, fontSize: '0.85rem', color: '#64748b' }}>{item.description}</td>
        <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 'bold' }}>IDR {(item.totalAmount || 0).toLocaleString('id-ID')}</td>
      </>}
      {type === 'roles' && <>
        <td style={S.td}><strong>{item.role}</strong></td>
        <td style={S.td}>{item.description}</td>
      </>}
      <td style={S.td}>
        <button style={S.btnEdit} onClick={() => onEdit(item)}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></button>
        <button style={S.btnDel} onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></button>
      </td>
    </tr>
  ))
}

function TableHeadRow({ type }) {
  const cols = {
    employees: ['No', 'Nama Lengkap', 'Email', 'Company', 'Divisi', 'Jabatan', 'Role', 'Aksi'],
    vendors: ['No', 'Nama Vendor', 'Bank', 'No Rekening', 'Aksi'],
    departments: ['No', 'Nama Dept', 'Class', 'Kode FRP', 'Manager', 'Aksi'],
    budgets: ['No', 'Budget ID', 'Company', 'Dept', 'Class', 'Type', 'Deskripsi', 'Total Amount', 'Aksi'],
    roles: ['No', 'Role', 'Deskripsi', 'Aksi'],
  }
  return <thead><tr>{(cols[type] || []).map(col => <th key={col} style={S.th}>{col}</th>)}</tr></thead>
}

export default function AdminPage() {
  const { type } = useParams()

  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [addForm, setAddForm] = useState(getBlankForm(type))
  const [editItem, setEditItem] = useState(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(() => {
    fetch(`/api/data/admin?type=${type}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error() } return r.json() })
      .then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [type])

  useEffect(() => { loadData() }, [loadData])

  const updateAddForm = (field, val) => setAddForm(f => ({ ...f, [field]: val }))
  const updateAddAssignments = companies => setAddForm(f => ({ ...f, companies }))
  const updateEditForm = (field, val) => setEditItem(f => ({ ...f, [field]: val }))
  const updateEditAssignments = companies => setEditItem(f => ({ ...f, companies }))

  const handleAdd = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/${type}/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) })
      const d = await res.json()
      if (d.success) { setAddForm(getBlankForm(type)); loadData() }
    } finally { setSaving(false) }
  }

  const handleDelete = async index => {
    if (!confirm('Yakin ingin menghapus baris ini?')) return
    const res = await fetch(`/api/admin/${type}/delete/${index}`, { method: 'POST' })
    const d = await res.json()
    if (d.success) loadData()
  }

  const handleEdit = item => {
    const copy = JSON.parse(JSON.stringify(item))
    if (type === 'employees' && !Array.isArray(copy.companies)) copy.companies = [blankAssignment()]
    setEditItem(copy)
  }

  const handleEditSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/${type}/edit/${editItem.originalIndex}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) })
      const d = await res.json()
      if (d.success) { setEditItem(null); loadData() }
    } finally { setSaving(false) }
  }

  const showFilter = type === 'budgets' || type === 'employees'
  const typeName = type.charAt(0).toUpperCase() + type.slice(1)
  const user = data?.user || {}

  return (
    <>
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <Sidebar collapsed={sidebarCollapsed} userName={user.fullName || 'Admin'} userRole={user.selectedJobLevel || user.role || 'Administrator'} userIsAdmin={user.role === 'administrator'} allAssignments={user.allAssignments || []} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
        <div className="dashboard-stage">
          <Header title="Form Request Payment" />
          <main className="dashboard-main">
            {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}
            {!loading && <div style={S.card}>
              <div style={S.addCard}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontSize: '1rem' }}>
                  <span className="material-icons-round">add_circle</span> Tambah Data Baru
                </h3>
                <form onSubmit={handleAdd}>
                  <FormFields type={type} form={addForm} onChange={updateAddForm} onAssignmentsChange={updateAddAssignments} employeeList={data?.employeeList} />
                  <button type="submit" style={S.btnPrimary} disabled={saving}>
                    <span className="material-icons-round">save</span> {saving ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>Daftar {typeName}</h3>
                {showFilter && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Filter PT:</label>
                    <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontFamily: 'inherit' }}>
                      <option value="">Semua Perusahaan</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <TableHeadRow type={type} />
                  <tbody>
                    <TableRows type={type} listData={data?.listData || []} onEdit={handleEdit} onDelete={handleDelete} companyFilter={companyFilter} />
                  </tbody>
                </table>
              </div>
            </div>}
          </main>
        </div>
      </div>

      {editItem && (
        <div style={S.overlay} onClick={() => setEditItem(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <span className="material-icons-round">edit</span> Edit Data
              </h3>
              <button style={S.closeBtn} onClick={() => setEditItem(null)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleEditSave}>
              <FormFields type={type} form={editItem} onChange={updateEditForm} onAssignmentsChange={updateEditAssignments} employeeList={data?.employeeList} />
              <button type="submit" style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', padding: '0.9rem', marginTop: '1rem' }} disabled={saving}>
                <span className="material-icons-round">save</span> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
