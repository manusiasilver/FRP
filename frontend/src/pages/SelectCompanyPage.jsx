import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const S = {
  card: { background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '560px', textAlign: 'center', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  iconBox: { width: '64px', height: '64px', background: '#e0e7ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', margin: '0 auto 2rem' },
  h1: { fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.75rem' },
  subtitle: { color: '#64748b', margin: '0 0 1.75rem', fontSize: '0.95rem' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1.5px solid #e2e8f0', borderRadius: '18px', background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%', fontSize: '1rem', fontWeight: 600, color: '#334155', transition: 'all 0.2s', marginBottom: '1rem' },
}

export default function SelectCompanyPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/data/select-company')
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error() } return r.json() })
      .then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSelect = async (company) => {
    await fetch('/api/auth/select-company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company }) })
    window.location.href = '/select-division'
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Memuat...</div>

  const user = data?.user || {}

  return (
    <>
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <Sidebar collapsed={sidebarCollapsed} userName={user.fullName} userRole={user.selectedJobLevel || user.role} userIsAdmin={user.role === 'administrator'} allAssignments={user.allAssignments || []} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
        <div className="dashboard-stage">
          <Header title="Form Request Payment" />
          <main className="dashboard-main" style={{ display: 'grid', placeItems: 'center' }}>
            <div style={S.card}>
              <div style={S.iconBox}><span className="material-icons-round">business</span></div>
              <h1 style={S.h1}>Pilih Perusahaan</h1>
              <p style={S.subtitle}>Pilih perusahaan tempat Anda bertugas</p>
              {(data?.companies || []).map((company, idx) => (
                <button key={company} style={{ ...S.btn, ...(hoveredIdx === idx ? { borderColor: '#4f46e5', background: '#f5f3ff', color: '#4f46e5' } : {}) }} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)} onClick={() => handleSelect(company)}>
                  <span>{company}</span>
                  <span className="material-icons-round" style={{ color: hoveredIdx === idx ? '#4f46e5' : '#cbd5e1' }}>chevron_right</span>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
