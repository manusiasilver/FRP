import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart } from '@mui/x-charts/PieChart'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import CardBox from '../components/cardbox/CardBox'
import CardBigBox from '../components/cardbox/CardBigBox'
import RevenueLastUpdate from '../components/RevenueLastUpdate'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

function formatRupiah(n) {
  const v = Math.round(n || 0)
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} Jt`
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function formatRupiahFull(n) {
  return 'IDR ' + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

const STATUS_STYLE = {
  PENDING:  { bg: '#fef08a', color: '#854d0e' },
  APPROVED: { bg: '#bbf7d0', color: '#166534' },
  REJECTED: { bg: '#fecaca', color: '#991b1b' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetch('/api/data/dashboard')
      .then(r => {
        if (r.status === 403) { navigate('/'); return null }
        if (!r.ok) { navigate('/login'); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT
  const user = data?.user || {}

  const handleSidebarToggle = () => {
    if (window.innerWidth <= 1024) { setMobileMenuOpen(c => !c); return }
    setSidebarCollapsed(c => !c)
  }

  // Chart data
  const donutData = data ? [
    { label: 'Pending',  value: data.stats.pending,  color: '#f59e0b' },
    { label: 'Approved', value: data.stats.approved, color: '#10b981' },
    { label: 'Rejected', value: data.stats.rejected, color: '#ef4444' },
  ].filter(d => d.value > 0) : []

  const COMPANY_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#be123c', '#d97706']

  const companyPieData = data?.byCompany
    ?.map((co, i) => ({
      label: co.name.replace(/^PT\s+/i, '').split(' ').slice(0, 2).join(' '),
      value: co.approvedAmount,
      color: COMPANY_COLORS[i] || '#64748b',
    }))
    .filter(d => d.value > 0) ?? []

  const DIVISI_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#ef4444', '#f59e0b', '#0891b2', '#be123c', '#d97706', '#059669', '#dc2626']

  const divisiPieData = data?.byDivisi
    ?.map((div, i) => ({
      label: div.name,
      value: div.total,
      approvedAmount: div.approvedAmount,
      color: DIVISI_COLORS[i % DIVISI_COLORS.length],
    }))
    .filter(d => d.value > 0) ?? []

  const statGridCols    = isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr' : 'repeat(4, 1fr)'
  const chartGridCols   = isMobile ? '1fr' : '1fr 1.6fr'
  const companyGridCols = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)'

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        userName={user.fullName || 'User'}
        userRole={user.selectedJobLevel || user.role || 'Staff'}
        userIsAdmin={user.role === 'administrator'}
        allAssignments={user.allAssignments || []}
        onToggleCollapse={handleSidebarToggle}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="dashboard-stage">
        <Header title="Dashboard" onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', gap: '10px' }}>
              <span className="material-icons-round" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>refresh</span>
              Memuat data...
            </div>
          ) : !data ? (
            <div style={{ padding: '2rem', color: '#ef4444' }}>Gagal memuat data dashboard.</div>
          ) : (
            <>
              {/* ── Stat Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: statGridCols, gap: '14px' }}>
                {[
                  { label: 'Total FRP',  value: data.stats.total,    detail: `${data.stats.pending} pending · ${data.stats.approved} approved`, color: '#2563eb', icon: 'receipt_long' },
                  { label: 'Pending',    value: data.stats.pending,   detail: `IDR ${formatRupiah(data.stats.pendingAmount)}`,                    color: '#f59e0b', icon: 'pending_actions' },
                  { label: 'Approved',   value: data.stats.approved,  detail: `IDR ${formatRupiah(data.stats.approvedAmount)}`,                   color: '#10b981', icon: 'check_circle' },
                  { label: 'Rejected',   value: data.stats.rejected,  detail: `IDR ${formatRupiah(data.stats.rejectedAmount)}`,                   color: '#ef4444', icon: 'cancel' },
                ].map(card => (
                  <div key={card.label} style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '24px', padding: '20px 22px', border: '1px solid rgba(26,42,87,0.08)', boxShadow: '0 4px 20px rgba(15,23,42,0.06)', backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', fontFamily: '"IBM Plex Mono", monospace', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{card.label}</p>
                      <span className="material-icons-round" style={{ fontSize: '18px', color: card.color, opacity: 0.8 }}>{card.icon}</span>
                    </div>
                    <div style={{ height: '2px', borderRadius: '999px', background: card.color, marginBottom: '14px', width: '100%' }} />
                    <strong style={{ display: 'block', fontSize: '2rem', lineHeight: 1, color: '#163a6b', fontWeight: 800 }}>{card.value}</strong>
                    <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b', fontFamily: '"IBM Plex Mono", monospace' }}>{card.detail}</p>
                  </div>
                ))}
              </div>

              {/* ── Charts Row ── */}
              <div style={{ display: 'grid', gridTemplateColumns: chartGridCols, gap: '16px', alignItems: 'stretch' }}>

                {/* Donut — status distribution */}
                <CardBigBox eyebrow="Distribusi Status" title="Status FRP">
                  {donutData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
                      <PieChart
                        series={[{
                          innerRadius: isMobile ? 40 : 55,
                          outerRadius: isMobile ? 70 : 95,
                          paddingAngle: 4,
                          data: donutData,
                        }]}
                        width={isMobile ? 160 : 220}
                        height={isMobile ? 160 : 220}
                        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        hideLegend
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {donutData.map(d => (
                          <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{d.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{d.value}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {data.stats.total > 0 ? `${Math.round(d.value / data.stats.total * 100)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '13px' }}>Belum ada data</div>
                  )}
                </CardBigBox>

                {/* Pie — approved amount per company */}
                <CardBigBox eyebrow="Distribusi Pembayaran" title="Approved per Perusahaan">
                  {companyPieData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
                      <PieChart
                        series={[{
                          innerRadius: 0,
                          outerRadius: isMobile ? 75 : 100,
                          paddingAngle: 3,
                          data: companyPieData,
                        }]}
                        width={isMobile ? 200 : 240}
                        height={isMobile ? 170 : 220}
                        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        hideLegend
                      />
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {companyPieData.map((co, i) => {
                          const total = companyPieData.reduce((s, d) => s + d.value, 0) || 1
                          const pct = Math.round(co.value / total * 100)
                          return (
                            <div key={co.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: co.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>PT {co.label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{pct}%</span>
                                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{formatRupiah(co.value)}</span>
                                </div>
                              </div>
                              <div style={{ height: '5px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '999px', background: co.color, width: `${pct}%`, transition: 'width 0.7s ease' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '13px' }}>Belum ada data</div>
                  )}
                </CardBigBox>
              </div>

              {/* ── Divisi Pie Chart ── */}
              {divisiPieData.length > 0 && (
                <CardBigBox eyebrow="Distribusi FRP" title="Per Divisi">
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: '24px', paddingTop: '8px' }}>
                    <PieChart
                      series={[{
                        innerRadius: 0,
                        outerRadius: isMobile ? 75 : 100,
                        paddingAngle: 3,
                        data: divisiPieData,
                      }]}
                      width={isMobile ? 200 : 260}
                      height={isMobile ? 180 : 240}
                      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      hideLegend
                    />
                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(() => {
                        const grandTotal = divisiPieData.reduce((s, d) => s + d.value, 0) || 1
                        return divisiPieData.map(div => {
                          const pct = Math.round(div.value / grandTotal * 100)
                          return (
                            <div key={div.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: div.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{div.label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{pct}%</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{div.value} FRP</span>
                                </div>
                              </div>
                              <div style={{ height: '5px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', marginBottom: div.approvedAmount > 0 ? '3px' : '0' }}>
                                <div style={{ height: '100%', borderRadius: '999px', background: div.color, width: `${pct}%`, transition: 'width 0.7s ease' }} />
                              </div>
                              {div.approvedAmount > 0 && (
                                <div style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', color: '#166534', fontWeight: 600 }}>{formatRupiah(div.approvedAmount)}</div>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </CardBigBox>
              )}

              {/* ── Company Breakdown ── */}
              <CardBigBox eyebrow="Per Perusahaan" title="Ringkasan Perusahaan">
                <div style={{ display: 'grid', gridTemplateColumns: companyGridCols, gap: '14px', marginTop: '4px' }}>
                  {data.byCompany.map(co => {
                    const shortName = co.name.replace(/^PT\s+/i, '')
                    const total = co.total || 1
                    return (
                      <div key={co.name} style={{ border: '1px solid rgba(26,42,87,0.1)', borderRadius: '16px', padding: '16px', background: 'linear-gradient(180deg,#f8fafc,#fff)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '2px' }}>PT</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#163a6b', marginBottom: '14px', lineHeight: 1.3 }}>{shortName}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                          {[
                            { label: 'Pending',  val: co.pending,  bg: '#fefce8', color: '#854d0e' },
                            { label: 'Approved', val: co.approved, bg: '#f0fdf4', color: '#166534' },
                            { label: 'Rejected', val: co.rejected, bg: '#fff1f2', color: '#991b1b' },
                          ].map(({ label, val, bg, color }) => (
                            <div key={label} style={{ background: bg, borderRadius: '10px', padding: '8px 6px', textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                              <div style={{ fontSize: '9px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '3px' }}>{label}</div>
                            </div>
                          ))}
                        </div>
                        {/* Progress bar approved */}
                        <div style={{ height: '5px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#10b981,#34d399)', width: `${Math.round(co.approved / total * 100)}%`, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                          <span style={{ fontWeight: 600 }}>Approved {Math.round(co.approved / total * 100)}%</span>
                          <span style={{ fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>{formatRupiahFull(co.approvedAmount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardBigBox>

              {/* ── Per Divisi ── */}
              {data.byDivisi?.length > 0 && (
                <CardBigBox eyebrow="Jumlah per Divisi" title="Breakdown Divisi">
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {data.byDivisi.map((div, i) => {
                      const maxAmt = data.byDivisi[0]?.approvedAmount || 1
                      const pct = maxAmt > 0 ? Math.round(div.approvedAmount / maxAmt * 100) : 0
                      const approvalRate = div.total > 0 ? Math.round(div.approved / div.total * 100) : 0
                      return (
                        <div key={div.name} style={{ border: '1px solid rgba(26,42,87,0.08)', borderRadius: '14px', padding: '14px 16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#163a6b', fontSize: '14px', letterSpacing: '0.02em' }}>{div.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{div.total} FRP · {approvalRate}% approved</div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: '#fefce8', color: '#854d0e' }}>{div.pending}</span>
                              <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: '#f0fdf4', color: '#166534' }}>{div.approved}</span>
                              <span style={{ padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: '#fff1f2', color: '#991b1b' }}>{div.rejected}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Approved</span>
                              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{formatRupiahFull(div.approvedAmount)}</span>
                            </div>
                            <div style={{ height: '7px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#10b981,#34d399)', width: `${pct}%`, transition: 'width 0.7s ease' }} />
                            </div>
                          </div>
                          {div.pendingAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Pending</span>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#ca8a04' }}>{formatRupiahFull(div.pendingAmount)}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardBigBox>
              )}

              {/* ── Top Vendors ── */}
              {data.topVendors?.length > 0 && (
                <CardBigBox eyebrow="Approved Terbesar" title="Top Vendor">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    {data.topVendors.map((v, i) => {
                      const maxAmt = data.topVendors[0]?.amount || 1
                      const pct = Math.round(v.amount / maxAmt * 100)
                      return (
                        <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{v.name}</span>
                              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#166534', flexShrink: 0 }}>{formatRupiahFull(v.amount)}</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#2563eb,#60a5fa)', width: `${pct}%`, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardBigBox>
              )}

              {/* ── Recent Requests ── */}
              <CardBigBox
                eyebrow="Aktivitas Terbaru"
                title="10 FRP Terakhir"
                headerAction={<RevenueLastUpdate />}
              >
                {isMobile ? (
                  <div style={{ maxHeight: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', paddingRight: '2px' }}>
                    {data.recent.map(r => {
                      const ss = STATUS_STYLE[r.status] || {}
                      return (
                        <div key={r.id} style={{ border: '1px solid rgba(26,42,87,0.08)', borderRadius: '14px', padding: '12px 14px', background: 'linear-gradient(180deg,#f8fafc,#fff)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '13px' }}>{r.frpNo}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{formatDate(r.tanggalFrp)}</div>
                            </div>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: ss.bg, color: ss.color }}>{r.status}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '12px', marginBottom: '6px' }}>
                            <div><span style={{ color: '#94a3b8' }}>Pemohon: </span><span style={{ color: '#334155', fontWeight: 500 }}>{r.dimintaOleh || '-'}</span></div>
                            <div><span style={{ color: '#94a3b8' }}>Divisi: </span><span style={{ color: '#334155', fontWeight: 500 }}>{r.divisi || '-'}</span></div>
                            <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#94a3b8' }}>Vendor: </span><span style={{ color: '#334155', fontWeight: 500 }}>{r.vendor || '-'}</span></div>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{formatRupiahFull(r.totalAmount)}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {/* Sticky thead */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '13%' }} />
                          <col style={{ width: '16%' }} /><col style={{ width: '8%' }} /><col style={{ width: '15%' }} />
                          <col style={{ width: '14%' }} /><col style={{ width: '10%' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['No FRP', 'Tanggal', 'Pemohon', 'Vendor', 'Divisi', 'Perusahaan', 'Total', 'Status'].map(h => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                      </table>
                    </div>
                    {/* Scrollable tbody — shows 5 rows */}
                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '212px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '13%' }} />
                          <col style={{ width: '16%' }} /><col style={{ width: '8%' }} /><col style={{ width: '15%' }} />
                          <col style={{ width: '14%' }} /><col style={{ width: '10%' }} />
                        </colgroup>
                        <tbody>
                          {data.recent.map((r, idx) => {
                            const ss = STATUS_STYLE[r.status] || {}
                            const rowBg = idx % 2 === 0 ? 'white' : '#fafbfc'
                            return (
                              <tr key={r.id} style={{ background: rowBg }}
                                onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                                onMouseLeave={e => e.currentTarget.style.background = rowBg}
                              >
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.frpNo}</td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(r.tanggalFrp)}</td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.dimintaOleh || '-'}</td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.vendor || '-'}</td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                  <span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', fontWeight: 700 }}>{r.divisi || '-'}</span>
                                </td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.companyName || '-'}</td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', fontSize: '12px' }}>{formatRupiahFull(r.totalAmount)}</td>
                                <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: ss.bg, color: ss.color }}>{r.status}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardBigBox>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
