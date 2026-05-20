import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const COMPANIES = ['PT PILAR NIAGA MAKMUR', 'PT PILAR KARANG SAMUDERA', 'PT PILAR KARGO PERKASA']
const JOB_LEVELS = ['Staff', 'Manager', 'Direktur', 'Komisaris']
const VALID_TYPES = ['employees', 'vendors', 'departments', 'budgets', 'roles']
const PAGE_META = {
  employees: { title: 'Master Karyawan', noun: 'Karyawan', icon: 'people', accent: '#2563eb', description: 'Kelola data karyawan, assignment perusahaan, dan jabatan dalam satu tempat.' },
  vendors: { title: 'Master Vendor', noun: 'Vendor', icon: 'store', accent: '#0f766e', description: 'Rapikan data vendor dan informasi rekening tujuan pembayaran.' },
  departments: { title: 'Master Departemen', noun: 'Departemen', icon: 'account_tree', accent: '#7c3aed', description: 'Atur departemen, class, kode FRP, dan penanggung jawab divisi.' },
  budgets: { title: 'Master Anggaran', noun: 'Anggaran', icon: 'savings', accent: '#b45309', description: 'Kelola budget ID, company, departemen, dan limit anggaran tahunan.' },
  roles: { title: 'Master Role', noun: 'Role', icon: 'manage_accounts', accent: '#be123c', description: 'Susun peran dan deskripsi akses untuk pengguna sistem.' },
}

const blankAssignment = () => ({ name: COMPANIES[0], class: '', jobLevel: 'Staff' })

function getBlankForm(type) {
  if (type === 'employees') return { fullName: '', email: '', companies: [blankAssignment()] }
  if (type === 'vendors') return { name: '', bank: '', account: '' }
  if (type === 'departments') return { name: '', class: '', kodeFrp: '', company: COMPANIES[0], manager: '' }
  if (type === 'budgets') return { id: '', department: '', company: COMPANIES[0], class: '', type: '', description: '', totalAmount: '' }
  if (type === 'roles') return { role: '', description: '' }
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
      borderRadius: '18px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
      padding: isMobile ? '1rem' : '1.35rem',
      marginBottom: '1rem',
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 0 1rem',
      fontSize: '0.98rem',
      fontWeight: 700,
      color: '#1e293b',
    },
    sectionSubtitle: {
      margin: '0.2rem 0 0',
      color: '#64748b',
      fontSize: '0.84rem',
      lineHeight: 1.5,
    },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.95rem' },
    label: {
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      color: '#64748b',
      letterSpacing: '0.05em',
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
    textarea: {
      ...{
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
      },
      resize: 'vertical',
      minHeight: '96px',
    },
    grid2: { display: 'grid', gridTemplateColumns: getGridColumns(2, isMobile, isTablet), gap: '1rem' },
    grid3: { display: 'grid', gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: '1rem' },
    btnPrimary: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '7px',
      padding: '0.72rem 1.35rem',
      borderRadius: '12px',
      border: 'none',
      background: accent,
      color: 'white',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '0.9rem',
      boxShadow: `0 16px 24px ${accent}22`,
    },
    btnSecondary: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '0.72rem 1rem',
      borderRadius: '12px',
      border: '1.5px solid #dbe5f0',
      background: '#f8fafc',
      color: '#475569',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '0.88rem',
    },
    btnEdit: {
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      color: '#1d4ed8',
      cursor: 'pointer',
      padding: '6px 10px',
      borderRadius: '9px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnDel: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      cursor: 'pointer',
      padding: '6px 10px',
      borderRadius: '9px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnAdd: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      background: '#e0f2fe',
      color: '#0369a1',
      border: '1px solid #bae6fd',
      borderRadius: '10px',
      padding: '0.65rem 0.95rem',
      fontSize: '0.85rem',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontWeight: 700,
    },
    btnRemove: {
      background: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      borderRadius: '10px',
      padding: '9px',
      cursor: 'pointer',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '42px',
    },
    assignCard: {
      border: '1px solid #dbe5f0',
      borderRadius: '14px',
      background: '#fbfdff',
      padding: isMobile ? '0.9rem' : '1rem',
      marginBottom: '0.85rem',
    },
    listShell: {
      background: 'white',
      borderRadius: '18px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 18px 40px rgba(15,23,42,0.06)',
      overflow: 'hidden',
    },
    toolbar: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: '0.9rem',
      padding: isMobile ? '1rem' : '1rem 1.1rem',
      borderBottom: '1px solid #e2e8f0',
      background: '#fbfdff',
    },
    filterWrap: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: '10px',
    },
    tableWrap: { overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 410px)' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '760px' },
    th: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      padding: '10px 14px',
      textAlign: 'left',
      boxShadow: '0 2px 0 #e2e8f0',
      background: '#f8fafc',
      fontWeight: 700,
      color: '#475569',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    td: {
      padding: '12px 14px',
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
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'center',
      padding: isMobile ? 0 : '1rem',
    },
    modal: {
      background: 'white',
      width: isMobile ? '100%' : 'min(920px, 92vw)',
      height: isMobile ? '100%' : 'auto',
      maxHeight: isMobile ? '100%' : '90vh',
      overflowY: 'auto',
      borderRadius: isMobile ? 0 : '24px',
      padding: isMobile ? '1rem' : '1.4rem',
      boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #e2e8f0',
    },
    closeBtn: {
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '999px',
      width: '38px',
      height: '38px',
      cursor: 'pointer',
      color: '#64748b',
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
    },
  }
}

function SectionHeading({ icon, title, subtitle, accent }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '0.98rem', color: '#1e293b' }}>
        <span className="material-icons-round" style={{ color: accent, fontSize: '20px' }}>{icon}</span>
        {title}
      </h3>
      {subtitle ? <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5 }}>{subtitle}</p> : null}
    </div>
  )
}

function EmployeeFormFields({ form, onChange, onAssignmentsChange, companyNames, styles }) {
  const addAssignment = () => onAssignmentsChange([...form.companies, { name: companyNames[0] || COMPANIES[0], class: '', jobLevel: 'Staff' }])
  const removeAssignment = idx => onAssignmentsChange(form.companies.filter((_, i) => i !== idx))
  const updateAssignment = (idx, field, val) => onAssignmentsChange(form.companies.map((a, i) => i === idx ? { ...a, [field]: val } : a))

  return (
    <>
      <div style={styles.grid2}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nama Lengkap</label>
          <input style={styles.input} required value={form.fullName} onChange={e => onChange('fullName', e.target.value)} placeholder="Budi Santoso" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input type="email" style={styles.input} value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="budi@piagam.id" />
        </div>
      </div>
      <div style={{ border: '1px solid #dbe5f0', borderRadius: '16px', background: '#f8fbff', padding: '1rem', marginBottom: '1rem' }}>
        <SectionHeading icon="apartment" title="Penugasan Perusahaan & Divisi" subtitle="Satu karyawan bisa punya lebih dari satu assignment." accent="#2563eb" />
        {form.companies.map((assignment, idx) => (
          <div key={idx} style={styles.assignCard}>
            <div style={styles.grid3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company</label>
                <select style={styles.select} value={assignment.name} onChange={e => updateAssignment(idx, 'name', e.target.value)}>
                  {companyNames.map(company => <option key={company} value={company}>{company}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Class</label>
                <input style={styles.input} required value={assignment.class} onChange={e => updateAssignment(idx, 'class', e.target.value)} placeholder="IT" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Job Level</label>
                <select style={styles.select} value={assignment.jobLevel} onChange={e => updateAssignment(idx, 'jobLevel', e.target.value)}>
                  {JOB_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={styles.btnRemove} onClick={() => removeAssignment(idx)} disabled={form.companies.length === 1}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
              </button>
            </div>
          </div>
        ))}
        <button type="button" style={styles.btnAdd} onClick={addAssignment}>
          <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>
          Tambah Assignment
        </button>
      </div>
    </>
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
        <input style={styles.input} required value={form.account} onChange={e => onChange('account', e.target.value)} placeholder="1234567890" />
      </div>
    </div>
  )
}

function DepartmentFormFields({ form, onChange, employeeList, companyNames, styles }) {
  return (
    <>
      <div style={styles.grid3}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nama Department</label>
          <input style={styles.input} required value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="FINANCE & ACCOUNTING" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Class</label>
          <input style={styles.input} required value={form.class} onChange={e => onChange('class', e.target.value)} placeholder="FINANCE" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Company</label>
          <select style={styles.select} required value={form.company || companyNames[0] || COMPANIES[0]} onChange={e => onChange('company', e.target.value)}>
            {companyNames.map(company => <option key={company} value={company}>{company}</option>)}
          </select>
        </div>
      </div>
      <div style={styles.grid2}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Kode FRP (3 Huruf)</label>
          <input style={styles.input} required value={form.kodeFrp} onChange={e => onChange('kodeFrp', e.target.value)} placeholder="FIN" maxLength="3" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Manager / Head</label>
          <select style={styles.select} required value={form.manager} onChange={e => onChange('manager', e.target.value)}>
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

function BudgetFormFields({ form, onChange, companyNames, styles }) {
  return (
    <>
      <div style={styles.grid3}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Budget ID</label>
          <input style={styles.input} required value={form.id} onChange={e => onChange('id', e.target.value)} placeholder="FIN-001" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Departemen</label>
          <input style={styles.input} required value={form.department} onChange={e => onChange('department', e.target.value)} placeholder="FINANCE" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Company</label>
          <select style={styles.select} required value={form.company} onChange={e => onChange('company', e.target.value)}>
            {companyNames.map(company => <option key={company} value={company}>{company}</option>)}
          </select>
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

function RoleFormFields({ form, onChange, styles }) {
  return (
    <div style={styles.grid2}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Role Name</label>
        <input style={styles.input} required value={form.role} onChange={e => onChange('role', e.target.value)} placeholder="administrator" />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Description</label>
        <input style={styles.input} required value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Akses penuh" />
      </div>
    </div>
  )
}

function FormFields({ type, form, onChange, onAssignmentsChange, employeeList, companyNames = COMPANIES, styles }) {
  if (type === 'employees') return <EmployeeFormFields form={form} onChange={onChange} onAssignmentsChange={onAssignmentsChange} companyNames={companyNames} styles={styles} />
  if (type === 'vendors') return <VendorFormFields form={form} onChange={onChange} styles={styles} />
  if (type === 'departments') return <DepartmentFormFields form={form} onChange={onChange} employeeList={employeeList} companyNames={companyNames} styles={styles} />
  if (type === 'budgets') return <BudgetFormFields form={form} onChange={onChange} companyNames={companyNames} styles={styles} />
  if (type === 'roles') return <RoleFormFields form={form} onChange={onChange} styles={styles} />
  return null
}

function renderCompanies(item, styles) {
  if (!Array.isArray(item.companies)) return item.company || 'N/A'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {item.companies.map((company, index) => (
        <div key={index} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 9px', borderRadius: '10px' }}>
          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>{company.name}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{company.class} - {company.jobLevel}</div>
        </div>
      ))}
    </div>
  )
}

function TableRows({ type, listData, onEdit, onDelete, companyFilter, companyNames = COMPANIES, styles }) {
  const defaultCompany = companyNames[0] || COMPANIES[0]
  const filtered = companyFilter
    ? listData.filter(item => {
        if (type === 'employees') return item.companies?.some(c => c.name === companyFilter) || item.company === companyFilter
        if (type === 'departments') return (item.company || defaultCompany) === companyFilter
        if (type === 'budgets') return (item.company || defaultCompany) === companyFilter
        return true
      })
    : listData

  if (filtered.length === 0) return <tr><td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Tidak ada data</td></tr>

  return filtered.map((item, idx) => (
    <tr key={item.originalIndex ?? idx} onMouseEnter={e => { e.currentTarget.style.background = '#f8fbff' }} onMouseLeave={e => { e.currentTarget.style.background = '' }}>
      <td style={styles.td}>{idx + 1}</td>
      {type === 'employees' && <>
        <td style={styles.td}>
          <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.fullName}</div>
        </td>
        <td style={styles.td}>{item.email || '-'}</td>
        <td style={styles.td}>{renderCompanies(item, styles)}</td>
        <td style={styles.td}>
          {Array.isArray(item.companies)
            ? [...new Set(item.companies.map(c => c.class).filter(Boolean))].map(cls => <span key={cls} style={{ ...styles.badge, ...styles.badgeSoft, marginRight: '6px', marginBottom: '6px' }}>{cls}</span>)
            : <span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.class}</span>}
        </td>
        <td style={styles.td}>{Array.isArray(item.companies) ? item.companies.map(c => c.jobLevel).join(', ') : item.jobLevel}</td>
        <td style={styles.td}>
          <span style={{ ...styles.badge, background: item.role === 'administrator' ? '#dcfce7' : '#fef3c7', color: item.role === 'administrator' ? '#166534' : '#92400e' }}>
            {item.role || 'user'}
          </span>
        </td>
      </>}
      {type === 'vendors' && <>
        <td style={styles.td}><strong style={{ color: '#1e293b' }}>{item.name}</strong></td>
        <td style={styles.td}>{item.bank}</td>
        <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace' }}>{item.account}</td>
      </>}
      {type === 'departments' && <>
        <td style={styles.td}><strong style={{ color: '#1e293b' }}>{item.name}</strong></td>
        <td style={{ ...styles.td, fontSize: '0.82rem', fontWeight: 700 }}>{item.company || defaultCompany}</td>
        <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeClass }}>{item.class}</span></td>
        <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeCode }}>{item.kodeFrp}</span></td>
        <td style={styles.td}>{item.manager}</td>
      </>}
      {type === 'budgets' && <>
        <td style={styles.td}><strong style={{ color: '#1e293b' }}>{item.id}</strong></td>
        <td style={{ ...styles.td, fontSize: '0.82rem', fontWeight: 700 }}>{item.company || defaultCompany}</td>
        <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.department}</span></td>
        <td style={styles.td}>{item.class}</td>
        <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeCode }}>{item.type}</span></td>
        <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>{item.description}</td>
        <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{formatCurrency(item.totalAmount || 0)}</td>
      </>}
      {type === 'roles' && <>
        <td style={styles.td}><strong style={{ color: '#1e293b' }}>{item.role}</strong></td>
        <td style={styles.td}>{item.description}</td>
      </>}
      <td style={styles.td}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={styles.btnEdit} onClick={() => onEdit(item)}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></button>
          <button style={styles.btnDel} onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></button>
        </div>
      </td>
    </tr>
  ))
}

function MobileList({ type, listData, onEdit, onDelete, companyFilter, companyNames = COMPANIES, styles }) {
  const defaultCompany = companyNames[0] || COMPANIES[0]
  const filtered = companyFilter
    ? listData.filter(item => {
        if (type === 'employees') return item.companies?.some(c => c.name === companyFilter) || item.company === companyFilter
        if (type === 'departments') return (item.company || defaultCompany) === companyFilter
        if (type === 'budgets') return (item.company || defaultCompany) === companyFilter
        return true
      })
    : listData

  if (filtered.length === 0) {
    return <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data</div>
  }

  return filtered.map((item, idx) => (
    <div key={item.originalIndex ?? idx} style={styles.mobileItemCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          {type === 'employees' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.fullName}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem', wordBreak: 'break-word' }}>{item.email || '-'}</div>
          </>}
          {type === 'vendors' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.name}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.bank}</div>
          </>}
          {type === 'departments' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.name}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.company || defaultCompany}</div>
            <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ ...styles.badge, ...styles.badgeClass }}>{item.class}</span>
              <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.kodeFrp}</span>
            </div>
          </>}
          {type === 'budgets' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.id}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.company || defaultCompany}</div>
          </>}
          {type === 'roles' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.role}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem', wordBreak: 'break-word' }}>{item.description}</div>
          </>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button style={styles.btnEdit} onClick={() => onEdit(item)}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></button>
          <button style={styles.btnDel} onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></button>
        </div>
      </div>

      <div style={styles.mobileMetaGrid}>
        {type === 'employees' && <>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Assignment</div>
            {renderCompanies(item, styles)}
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Divisi</div>
            <div>{Array.isArray(item.companies) ? [...new Set(item.companies.map(c => c.class).filter(Boolean))].join(', ') : (item.class || '-')}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Role</div>
            <span style={{ ...styles.badge, background: item.role === 'administrator' ? '#dcfce7' : '#fef3c7', color: item.role === 'administrator' ? '#166534' : '#92400e' }}>{item.role || 'user'}</span>
          </div>
        </>}
        {type === 'vendors' && <>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Rekening</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{item.account}</div>
          </div>
        </>}
        {type === 'departments' && <>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Manager</div>
            <div>{item.manager}</div>
          </div>
        </>}
        {type === 'budgets' && <>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Dept</div>
            <span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.department}</span>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Type</div>
            <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.type}</span>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Limit Tahunan</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.totalAmount || 0)}</div>
          </div>
        </>}
      </div>
    </div>
  ))
}

function TableHeadRow({ type, styles }) {
  const cols = {
    employees: ['No', 'Nama Lengkap', 'Email', 'Company', 'Divisi', 'Jabatan', 'Role', 'Aksi'],
    vendors: ['No', 'Nama Vendor', 'Bank', 'No Rekening', 'Aksi'],
    departments: ['No', 'Nama Dept', 'Company', 'Class', 'Kode FRP', 'Manager', 'Aksi'],
    budgets: ['No', 'Budget ID', 'Company', 'Dept', 'Class', 'Type', 'Deskripsi', 'Total Amount', 'Aksi'],
    roles: ['No', 'Role', 'Deskripsi', 'Aksi'],
  }
  return <thead><tr>{(cols[type] || []).map(col => <th key={col} style={styles.th}>{col}</th>)}</tr></thead>
}

export default function AdminPage() {
  const { type } = useParams()

  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const [data, setData] = useState(null)
  const { setUser } = useUser()
  const [addForm, setAddForm] = useState(() => getBlankForm(type))
  const [editItem, setEditItem] = useState(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [renderedType, setRenderedType] = useState(type)

  // Synchronous state reset — runs before browser paint, no stale-data flash
  if (renderedType !== type) {
    setRenderedType(type)
    setAddForm(getBlankForm(type))
    setEditItem(null)
    setCompanyFilter('')
    setData(null)
  }

  const loading = data === null

  const meta = PAGE_META[type]
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT
  const styles = buildStyles(isMobile, isTablet, meta.accent)

  const loadData = useCallback(() => {
    fetch(`/api/data/admin?type=${type}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error() } return r.json() })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(() => {})
  }, [type])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      if (d.success) {
        setAddForm(getBlankForm(type))
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
    if (type === 'employees' && !Array.isArray(copy.companies)) copy.companies = [blankAssignment()]
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

  const showFilter = type === 'budgets' || type === 'employees' || type === 'departments'
  const user = data?.user || {}
  const listData = data?.listData || []
  const companyNames = useMemo(() => {
    const names = (data?.companies || []).map(company => company.name || company).filter(Boolean)
    return names.length ? names : COMPANIES
  }, [data?.companies])
  const defaultCompany = companyNames[0] || COMPANIES[0]
  const filteredCount = useMemo(() => {
    if (!companyFilter) return listData.length
    if (type === 'employees') return listData.filter(item => item.companies?.some(c => c.name === companyFilter) || item.company === companyFilter).length
    if (type === 'departments') return listData.filter(item => (item.company || defaultCompany) === companyFilter).length
    if (type === 'budgets') return listData.filter(item => (item.company || defaultCompany) === companyFilter).length
    return listData.length
  }, [companyFilter, defaultCompany, listData, type])

  return (
    <>
      <main className="dashboard-main">
            {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}

            {!loading && <>
              <section style={styles.card}>
                <SectionHeading icon="add_circle" title={`Tambah ${meta.noun} Baru`} subtitle={`Form input ${meta.noun.toLowerCase()} mengikuti gaya halaman Form dan Approved agar lebih konsisten.`} accent={meta.accent} />
                <form onSubmit={handleAdd}>
                  <FormFields type={type} form={addForm} onChange={updateAddForm} onAssignmentsChange={updateAddAssignments} employeeList={data?.employeeList} companyNames={companyNames} styles={styles} />
                  <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                    <button type="submit" style={{ ...styles.btnPrimary, width: isMobile ? '100%' : 'auto', opacity: saving ? 0.7 : 1 }} disabled={saving}>
                      <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
                      {saving ? 'Menyimpan...' : 'Simpan Data'}
                    </button>
                  </div>
                </form>
              </section>

              <section style={styles.listShell}>
                <div style={styles.toolbar}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>Daftar {meta.noun}</h3>
                    <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.84rem' }}>Lihat, filter, edit, dan hapus data {meta.noun.toLowerCase()} dari satu tampilan.</p>
                  </div>
                  {showFilter && (
                    <div style={styles.filterWrap}>
                      <div style={{ minWidth: isMobile ? '100%' : '230px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Filter PT</label>
                        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} style={styles.select}>
                          <option value="">Semua Perusahaan</option>
                          {companyNames.map(company => <option key={company} value={company}>{company}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {isMobile ? (
                  <MobileList type={type} listData={listData} onEdit={handleEdit} onDelete={handleDelete} companyFilter={companyFilter} companyNames={companyNames} styles={styles} />
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <TableHeadRow type={type} styles={styles} />
                      <tbody>
                        <TableRows type={type} listData={listData} onEdit={handleEdit} onDelete={handleDelete} companyFilter={companyFilter} companyNames={companyNames} styles={styles} />
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>}
      </main>

      {editItem && (
        <div style={styles.modalOverlay} onClick={() => setEditItem(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <span className="material-icons-round" style={{ color: meta.accent }}>edit</span>
                  Edit {meta.noun}
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.84rem' }}>Perbarui data tanpa keluar dari halaman master.</p>
              </div>
              <button style={styles.closeBtn} onClick={() => setEditItem(null)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleEditSave}>
              <FormFields type={type} form={editItem} onChange={updateEditForm} onAssignmentsChange={updateEditAssignments} employeeList={data?.employeeList} companyNames={companyNames} styles={styles} />
              <button type="submit" style={{ ...styles.btnPrimary, width: '100%', marginTop: '0.75rem', opacity: saving ? 0.7 : 1 }} disabled={saving}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
