import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const formatCurrency = v => new Intl.NumberFormat('id-ID').format(Math.round(Number(String(v).replace(/[^0-9.-]/g,''))||0))
const STATUS_COLORS = { PENDING_MANAGER:'#f59e0b', PENDING_PROCESS:'#3b82f6', PENDING_PROCESS_APPROVAL:'#8b5cf6', APPROVED:'#10b981', REJECTED:'#ef4444', CREATED_FRP:'#0284c7' }
const STATUS_LABELS = { PENDING_MANAGER:'Menunggu Manager', PENDING_PROCESS:'Menunggu Proses', PENDING_PROCESS_APPROVAL:'Menunggu Approval Proses', APPROVED:'Approved', REJECTED:'Rejected', CREATED_FRP:'Created FRP' }

export default function RpApprovalPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isApprovedView = pathname === '/rp-approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState(isApprovedView ? 'approved' : 'pending')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = (view) => {
    setLoading(true)
    fetch(`/api/data/rp-approval?view=${view || tab}`)
      .then(r => { if(!r.ok){window.location.href='/login';throw new Error()} return r.json() })
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData(tab) }, [tab])

  const doAction = async (id, action, body = {}) => {
    if(!confirm(`Yakin ingin ${action}?`)) return
    setActionLoading(true)
    try {
      const r = await fetch(`/api/rp/${id}/${action}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const d = await r.json()
      if(d.success) { setSelected(null); loadData(tab) }
      else alert(d.error||'Gagal')
    } catch(e) { alert(e.message) }
    finally { setActionLoading(false) }
  }

  const D = data || {}
  const reqs = D.requests || []
  const user = D.user || {}
  const isAdmin = user.role === 'administrator'
  const canApprove = D.canApprove

  const tabs = [
    { key:'pending', label:'Manager Approval', icon:'hourglass_top' },
    { key:'process', label:'Proses Divisi', icon:'engineering' },
    { key:'process-approval', label:'Approval Proses', icon:'verified' },
    { key:'approved', label:'Selesai', icon:'done_all' },
  ]

  const handleSidebarToggle = () => { if(window.innerWidth<=1024){setMobileMenuOpen(c=>!c);return}; setSidebarCollapsed(c=>!c) }

  const renderDetail = () => {
    if(!selected) return null
    const rp = selected
    const items = rp.items || []
    const total = items.reduce((s,it) => s + (Number(String(it.qty||0).replace(/\D/g,''))||0) * (Number(String(it.estimatedValue||0).replace(/\D/g,''))||0), 0)

    return (
      <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={() => setSelected(null)}>
        <div style={{ background:'white', borderRadius:'20px', maxWidth:'900px', width:'100%', maxHeight:'90vh', overflow:'auto', padding:'2rem' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <h2 style={{ margin:0, fontSize:'1.25rem', fontWeight:800, color:'#1e293b' }}>{rp.rpNo || 'Draft'}</h2>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:700, color:'white', background:STATUS_COLORS[rp.status]||'#94a3b8' }}>{STATUS_LABELS[rp.status]||rp.status}</span>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><span className="material-icons-round">close</span></button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
            {[['Divisi',rp.divisi],['Class',rp.class],['Dibuat Oleh',rp.dibuatOleh],['Kategori',rp.kategoriPembelian],['Diproses Oleh',rp.diprosesOleh],['Tanggal Dibutuhkan',rp.tanggalDibutuhkan],['Vendor',rp.vendorSuggestion],['PIC Penerima',rp.picPenerima],['Company',rp.companyName]].map(([l,v],i) => (
              <div key={i} style={{ padding:'12px', background:'#f8fafc', borderRadius:'10px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:'4px' }}>{l}</div>
                <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#1e293b' }}>{v||'-'}</div>
              </div>
            ))}
          </div>

          {rp.deskripsi && <div style={{ padding:'12px', background:'#fffbeb', borderRadius:'10px', marginBottom:'1.5rem' }}><div style={{ fontSize:'11px', fontWeight:700, color:'#92400e', marginBottom:'4px' }}>DESKRIPSI</div><div style={{ fontSize:'0.9rem', color:'#78350f' }}>{rp.deskripsi}</div></div>}

          {rp.processChanges && rp.processChanges.length > 0 && (
            <div style={{ padding:'12px', background:'#fef3c7', borderRadius:'10px', marginBottom:'1.5rem', border:'1px solid #fbbf24' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#92400e', marginBottom:'8px' }}>PERUBAHAN OLEH DIVISI PEMROSES</div>
              {rp.processChanges.map((ch,i) => (
                <div key={i} style={{ display:'flex', gap:'8px', fontSize:'0.85rem', marginBottom:'4px' }}>
                  <span style={{ fontWeight:600, color:'#78350f' }}>{ch.field}:</span>
                  <span style={{ color:'#ef4444', textDecoration:'line-through' }}>{ch.oldValue||'(kosong)'}</span>
                  <span style={{ color:'#64748b' }}>→</span>
                  <span style={{ color:'#16a34a', fontWeight:600 }}>{ch.newValue||'(kosong)'}</span>
                </div>
              ))}
              <div style={{ fontSize:'0.8rem', color:'#92400e', marginTop:'6px' }}>Diubah oleh: {rp.processUpdatedBy} ({new Date(rp.processUpdatedAt).toLocaleDateString('id-ID')})</div>
            </div>
          )}

          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'1rem' }}>
            <thead><tr>
              {['No','Item Group','Memo','Link','Qty','Est. Value'].map(h => <th key={h} style={{ padding:'8px 10px', textAlign:'left', borderBottom:'2px solid #e2e8f0', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map((it,i) => (
                <tr key={i}>
                  <td style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9' }}>{i+1}</td>
                  <td style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9', fontWeight:600 }}>{it.budgetId}</td>
                  <td style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9' }}>{it.memo}</td>
                  <td style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9' }}>{it.linkPembelian ? <a href={it.linkPembelian} target="_blank" rel="noreferrer" style={{ color:'#2563eb' }}>Link</a> : '-'}</td>
                  <td style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9' }}>{it.qty}</td>
                  <td style={{ padding:'8px 10px', borderBottom:'1px solid #f1f5f9', fontWeight:600 }}>Rp {formatCurrency(it.estimatedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign:'right', fontWeight:800, color:'#1f4e8c', fontSize:'1.1rem' }}>Total: Rp {formatCurrency(total)}</div>

          {!actionLoading && (
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'1.5rem', flexWrap:'wrap' }}>
              <button onClick={() => window.open(`/api/rp/${rp.id}/preview`, '_blank')} style={{ padding:'10px 20px', background:'#f8fafc', color:'#475569', border:'1px solid #cbd5e1', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Preview</button>
              <button onClick={() => window.open(`/api/rp/${rp.id}/pdf`, '_blank')} style={{ padding:'10px 20px', background:'#f1f5f9', color:'#1e293b', border:'1px solid #cbd5e1', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Print PDF</button>
              
              {rp.status === 'APPROVED' && (isAdmin || user.selectedDivision === 'IT' || user.selectedDivision === 'Product') && (
                <button onClick={() => navigate(`/frp?fromRp=${rp.id}`)} style={{ padding:'10px 20px', background:'#2563eb', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Ke FRP</button>
              )}
              
              {rp.status === 'PENDING_MANAGER' && (isAdmin || (['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel) && user.selectedDivision === rp.divisi)) && (
                <>
                  <button onClick={() => doAction(rp.id,'manager-approve')} style={{ padding:'10px 20px', background:'#10b981', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Approve</button>
                  <button onClick={() => doAction(rp.id,'manager-reject')} style={{ padding:'10px 20px', background:'#ef4444', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Reject</button>
                </>
              )}
              
              {rp.status === 'PENDING_PROCESS' && (isAdmin || (['IT', 'HCGA', 'Product'].includes(user.selectedDivision) && user.selectedDivision === rp.diprosesOleh)) && (
                <>
                  <button onClick={() => navigate(`/rp?process=${rp.id}`)} style={{ padding:'10px 20px', background:'#eab308', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Check Data</button>
                  <button onClick={() => doAction(rp.id,'process-reject')} style={{ padding:'10px 20px', background:'#ef4444', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Reject</button>
                </>
              )}
              
              {rp.status === 'PENDING_PROCESS_APPROVAL' && (isAdmin || (['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel) && ['IT', 'HCGA', 'Product'].includes(user.selectedDivision) && user.selectedDivision === rp.diprosesOleh)) && (
                <>
                  <button onClick={() => doAction(rp.id,'process-manager-approve')} style={{ padding:'10px 20px', background:'#10b981', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Final Approve</button>
                  <button onClick={() => doAction(rp.id,'process-manager-reject')} style={{ padding:'10px 20px', background:'#ef4444', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Reject</button>
                </>
              )}
              
              {isAdmin && rp.status !== 'PENDING_MANAGER' && (
                <button onClick={() => doAction(rp.id,'revert')} style={{ padding:'10px 20px', background:'#f59e0b', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Revert</button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard-shell${sidebarCollapsed?' dashboard-shell--sidebar-collapsed':''}`}>
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileMenuOpen} userName={user.fullName} userRole={user.selectedJobLevel||user.role} userIsAdmin={isAdmin} allAssignments={user.allAssignments||[]} onToggleCollapse={handleSidebarToggle} onCloseMobile={() => setMobileMenuOpen(false)} />
      <div className="dashboard-stage">
        <Header title="RP Approval" onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="dashboard-main">
          <div style={{ display:'flex', gap:'8px', marginBottom:'1.5rem', flexWrap:'wrap' }}>
            {tabs.map(t => {
              const count = D.counts?.[t.key] ?? 0;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'10px', border: tab===t.key?'2px solid #1f4e8c':'1.5px solid #e2e8f0', background: tab===t.key?'#eff6ff':'white', color: tab===t.key?'#1f4e8c':'#64748b', fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem' }}>
                  <span className="material-icons-round" style={{ fontSize:'18px' }}>{t.icon}</span>
                  {t.label} ({count})
                </button>
              )
            })}
          </div>

          {loading ? <div style={{ padding:'2rem', color:'#64748b' }}>Memuat...</div> : reqs.length === 0 ? (
            <div style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>
              <span className="material-icons-round" style={{ fontSize:'48px', marginBottom:'1rem', display:'block' }}>inbox</span>
              Tidak ada data
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', background:'white', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <thead><tr>
                  {['No RP','Divisi','Dibuat Oleh','Kategori','Diproses Oleh','Status',''].map(h => <th key={h} style={{ padding:'12px', textAlign:'left', background:'#f8fafc', borderBottom:'2px solid #e2e8f0', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {reqs.map(rp => (
                    <tr key={rp.id} style={{ cursor:'pointer' }} onClick={() => setSelected(rp)}>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9', fontWeight:700, color:'#1f4e8c' }}>{rp.rpNo||'-'}</td>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9' }}>{rp.divisi}</td>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9' }}>{rp.dibuatOleh}</td>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9' }}>{rp.kategoriPembelian}</td>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9' }}>{rp.diprosesOleh}</td>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9' }}><span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700, color:'white', background:STATUS_COLORS[rp.status]||'#94a3b8' }}>{STATUS_LABELS[rp.status]||rp.status}</span></td>
                      <td style={{ padding:'12px', borderBottom:'1px solid #f1f5f9' }}><span className="material-icons-round" style={{ color:'#94a3b8', fontSize:'20px' }}>visibility</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
      {renderDetail()}
    </div>
  )
}
