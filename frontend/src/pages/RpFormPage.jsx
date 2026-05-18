import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const MOBILE = 768, TABLET = 1024
const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }

function SearchableSelect({ name, value, onChange, options, placeholder = 'Pilih...', style, disabled = false, menuPosition = 'absolute' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const [menuRect, setMenuRect] = useState(null)

  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o, keywords: o } : { value: o.value, label: o.label, keywords: o.keywords || o.label })
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
        top: renderUpward ? null : rect.bottom + 4,
        bottom: renderUpward ? window.innerHeight - rect.top + 4 : null,
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

  const menuStyle = menuPosition === 'fixed' && menuRect
    ? {
        position: 'fixed',
        ...(menuRect.top !== null ? { top: menuRect.top } : { bottom: menuRect.bottom }),
        left: menuRect.left,
        width: menuRect.width,
        zIndex: 9999,
      }
    : {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 50,
      }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button ref={triggerRef} type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', cursor: disabled ? 'default' : 'pointer' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? '#1e293b' : '#94a3b8' }}>{selected ? selected.label : placeholder}</span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8' }}>expand_more</span>
      </button>
      {open && (
        <div style={{ ...menuStyle, background: 'white', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', marginTop: '4px', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px' }}><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} /></div>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} style={{ width: '100%', border: 'none', background: 'white', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', color: '#94a3b8', cursor: 'pointer' }}>{placeholder}</button>
            {filtered.map(o => (<button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} style={{ width: '100%', border: 'none', borderTop: '1px solid #f8fafc', background: o.value === value ? '#eff6ff' : 'white', color: o.value === value ? '#1f4e8c' : '#1e293b', textAlign: 'left', padding: '10px 12px', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: o.value === value ? 700 : 500, whiteSpace: 'normal', wordBreak: 'break-word' }}>{o.label}</button>))}
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
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b' },
  inputReadonly: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#eef2f7', color: '#475569' },
  textarea: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: '72px', background: '#f8fafc', color: '#1e293b' },
  select: { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tdInput: { width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc' },
  tdSelect: { width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', cursor: 'pointer' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.4rem', background: '#1f4e8c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' },
  btnAdd: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  btnDel: { display: 'inline-flex', alignItems: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' },
  totalLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  totalValue: { fontSize: '1.1rem', fontWeight: 800, color: '#1f4e8c' },
}

const today = new Date().toISOString().slice(0, 10)
const blankRp = { companyName: '', divisi: '', class: '', dibuatOleh: '', kategoriPembelian: '', deskripsi: '', diprosesOleh: '', tanggalDibutuhkan: today, vendorSuggestion: '', picPenerima: '', items: [{ budgetId: '', memo: '', linkPembelian: '', qty: '1', estimatedValue: '0' }] }

export default function RpFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [values, setValues] = useState(blankRp)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [vw, setVw] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth)

  useEffect(() => {
    const q = searchParams.toString() ? `?${searchParams.toString()}` : ''
    fetch(`/api/rp/form-data${q}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error() } return r.json() })
      .then(d => {
        setData(d)
        const base = { ...blankRp, companyName: d.selectedCompany || '', divisi: d.selectedDivision || '', dibuatOleh: d.user?.fullName || '' }
        if (d.editData) {
          setValues({ ...base, ...d.editData })
        } else {
          setValues(base)
        }
      })
      .catch(e => setError(e.message || 'Gagal memuat'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { const h = () => setVw(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])

  const D = data || {}
  const isAdmin = D.user?.role === 'administrator'
  const isMobile = vw < MOBILE

  const updateField = (f, v) => setValues(p => ({ ...p, [f]: v }))
  const updateItem = (i, f, v) => setValues(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) }))
  const addRow = () => setValues(p => ({ ...p, items: [...p.items, { budgetId: '', memo: '', linkPembelian: '', qty: '1', estimatedValue: '0' }] }))
  const removeRow = i => setValues(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))

  const departments = useMemo(() => {
    const emps = D.employees || []
    const divs = [...new Set(emps.flatMap(e => (e.companies || []).filter(a => !values.companyName || a.name === values.companyName).map(a => a.class)).filter(Boolean))]
    return divs.sort()
  }, [D.employees, values.companyName])

  const classOptions = useMemo(() => {
    const budgets = D.budgets || []
    const classes = [...new Set(budgets.filter(b => !values.divisi || (b.department || '').toLowerCase() === values.divisi.toLowerCase()).map(b => b.class).filter(Boolean))]
    return classes.sort()
  }, [D.budgets, values.divisi])

  const budgetOptions = useMemo(() => {
    const budgets = D.budgets || []
    return budgets.filter(b => {
      const matchDiv = !values.divisi || (b.department || '').toLowerCase() === values.divisi.toLowerCase()
      const matchCompany = !values.companyName || (b.company || '').toLowerCase().includes(values.companyName.toLowerCase())
      return matchDiv && matchCompany
    })
  }, [D.budgets, values.divisi, values.companyName])

  const processDivOptions = useMemo(() => ['IT', 'HCGA', 'Product'].map(d => ({ value: d, label: d })), [])
  const vendorOptions = useMemo(() => (D.vendors || []).map(v => ({ value: v.name, label: v.name })), [D.vendors])
  const kategoriOptions = ['Pengadaan Barang Baru', 'Pergantian Barang', 'Penambahan Barang'].map(k => ({ value: k, label: k }))
  const budgetSelectOpts = useMemo(() => budgetOptions.map(b => ({ value: b.id, label: `${b.id} - ${b.description}`, keywords: `${b.id} ${b.description}` })), [budgetOptions])

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

    // Confirmation dialog before submit
    const isProcess = !!searchParams.get('process')
    const confirmMsg = isProcess
      ? 'Apakah Anda yakin ingin mengupdate dan mengirimkan data Request Purchase ini?'
      : 'Apakah Anda yakin ingin mengirimkan Request Purchase ini?'
    if (!window.confirm(confirmMsg)) {
      return
    }

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
        const rpNoRes = await fetch(`/api/rp/next-number/${encodeURIComponent(values.divisi)}`)
        const rpNoData = await rpNoRes.json()
        const payload = { ...values, rpNo: rpNoData.rpNo }
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

  const gridStyle = (cols) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${cols}, 1fr)`, gap: isMobile ? '0.85rem' : '1rem' })

  const handleSidebarToggle = () => { if (window.innerWidth <= 1024) { setMobileMenuOpen(c => !c); return }; setSidebarCollapsed(c => !c) }

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileMenuOpen} userName={D.user?.fullName} userRole={D.user?.selectedJobLevel || D.user?.role} userIsAdmin={isAdmin} allAssignments={D.user?.allAssignments || []} onToggleCollapse={handleSidebarToggle} onCloseMobile={() => setMobileMenuOpen(false)} />
      <div className="dashboard-stage">
        <Header title="Request Purchase (RP)" onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="dashboard-main">
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}
          {error && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>{error}</div>}
          {!loading && !error && (
            <form onSubmit={handleSubmit}>
              <div style={S.card}>
                <h3 style={S.sectionTitle}><span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>shopping_cart</span>Informasi Request Purchase</h3>
                <div style={gridStyle(3)}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Divisi</label>
                    {isAdmin ? <SearchableSelect name="divisi" value={values.divisi} onChange={v => updateField('divisi', v)} options={departments.map(d => ({ value: d, label: d }))} placeholder="Pilih Divisi" style={S.select} /> : <input style={S.inputReadonly} value={values.divisi} readOnly />}
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Class</label>
                    <SearchableSelect name="class" value={values.class} onChange={v => updateField('class', v)} options={classOptions.map(c => ({ value: c, label: c }))} placeholder="Pilih Class" style={S.select} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Dibuat Oleh</label>
                    <input style={S.inputReadonly} value={values.dibuatOleh} readOnly />
                  </div>
                </div>
                <div style={{ ...gridStyle(2), marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Kategori Pembelian</label>
                    <SearchableSelect name="kategoriPembelian" value={values.kategoriPembelian} onChange={v => updateField('kategoriPembelian', v)} options={kategoriOptions} placeholder="Pilih Kategori" style={S.select} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Diproses Oleh</label>
                    <SearchableSelect name="diprosesOleh" value={values.diprosesOleh} onChange={v => updateField('diprosesOleh', v)} options={processDivOptions} placeholder="Pilih Divisi Pemroses" style={S.select} />
                  </div>
                </div>
                <div style={{ ...S.formGroup, marginTop: '1rem' }}>
                  <label style={S.label}>Deskripsi (Alasan Permintaan Barang & Nama Pengguna Barang)</label>
                  <textarea name="deskripsi" style={S.textarea} value={values.deskripsi} onChange={e => updateField('deskripsi', e.target.value)} placeholder="Jelaskan alasan permintaan barang..." />
                </div>
                <div style={{ ...gridStyle(3), marginTop: '1rem' }}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Tanggal Dibutuhkan</label>
                    <input type="date" name="tanggalDibutuhkan" style={S.input} value={values.tanggalDibutuhkan} onChange={e => updateField('tanggalDibutuhkan', e.target.value)} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Vendor Suggestion</label>
                    <SearchableSelect name="vendorSuggestion" value={values.vendorSuggestion} onChange={v => updateField('vendorSuggestion', v)} options={vendorOptions} placeholder="Pilih Vendor" style={S.select} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>PIC Penerima</label>
                    <input name="picPenerima" style={S.input} value={values.picPenerima} onChange={e => updateField('picPenerima', e.target.value)} placeholder="Nama penerima barang" />
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <h3 style={S.sectionTitle}><span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>table_rows</span>Detail Item</h3>
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
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" style={S.btnAdd} onClick={addRow}><span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>Tambah Item</button>
                </div>
                <div style={S.totalRow}>
                  <div style={S.totalLabel}>Total Estimated Value</div>
                  <div style={S.totalValue}>Rp {formatCurrency(totalAmount)}</div>
                </div>
              </div>

              {submitError && <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '10px', color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>{submitError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={submitting} style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                  {submitting ? 'Mengirim...' : (searchParams.get('process') ? 'Update & Submit' : 'Submit Request Purchase')}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  )
}
