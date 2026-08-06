import React from 'react'

export const tabs = [
    { key: 'pending', label: 'Manager Approval', icon: 'hourglass_top' },
    { key: 'process', label: 'Division Process', icon: 'engineering' },
    { key: 'process-approval', label: 'Final Approval', icon: 'verified' },
    { key: 'approved', label: 'Done', icon: 'done_all' },
]

export default function TabsFilterApprovalRp({
    isMobile,
    tab,
    setTab,
    counts,
    tabDropdownOpen,
    setTabDropdownOpen,
    tabDropdownRef
}) {
    return (
        <div style={{ padding: isMobile ? '0 12px 8px 12px' : '0 24px 8px 24px', background: 'white' }}>
            {isMobile ? (
                <div ref={tabDropdownRef} style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setTabDropdownOpen(v => !v)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', transition: 'all 0.2s' }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="material-icons-round" style={{ fontSize: '20px', color: '#1f4e8c' }}>{tabs.find(t => t.key === tab)?.icon}</span>
                            {tabs.find(t => t.key === tab)?.label}
                            <span style={{ background: '#1f4e8c', color: 'white', borderRadius: '999px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', lineHeight: 1.6 }}>{counts?.[tab] ?? 0}</span>
                        </span>
                        <span className="material-icons-round" style={{ fontSize: '20px', color: '#64748b' }}>{tabDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {tabDropdownOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', zIndex: 50, overflow: 'hidden', padding: '6px' }}>
                            {tabs.map(item => {
                                const active = tab === item.key
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => { setTab(item.key); setTabDropdownOpen(false) }}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: 'none', borderRadius: '10px', background: active ? '#eff6ff' : 'white', color: active ? '#1f4e8c' : '#475569', fontWeight: active ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', textAlign: 'left', transition: 'all 0.2s' }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: '18px', flexShrink: 0, color: active ? '#1f4e8c' : '#94a3b8' }}>{item.icon}</span>
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        <span style={{ background: active ? '#1f4e8c' : '#f1f5f9', color: active ? 'white' : '#64748b', borderRadius: '999px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', lineHeight: 1.6 }}>{counts?.[item.key] ?? 0}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '6px', borderRadius: '16px', width: '100%', boxSizing: 'border-box', gap: '6px' }}>
                    {tabs.map(item => {
                        const count = counts?.[item.key] ?? 0
                        const active = tab === item.key
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setTab(item.key)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: active ? 'white' : 'transparent',
                                    color: active ? '#0f172a' : '#64748b',
                                    fontWeight: active ? 600 : 500,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: active ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (!active) {
                                        e.currentTarget.style.color = '#334155'
                                        e.currentTarget.style.background = '#e2e8f0'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!active) {
                                        e.currentTarget.style.color = '#64748b'
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: '20px', color: active ? '#1f4e8c' : '#94a3b8', transition: 'color 0.3s ease' }}>{item.icon}</span>
                                {item.label}
                                <span style={{
                                    background: active ? '#1f4e8c' : '#cbd5e1',
                                    color: active ? 'white' : '#475569',
                                    borderRadius: '999px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    marginLeft: '4px',
                                    transition: 'all 0.3s'
                                }}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
