import React from 'react'

const RP_STATUS_META = {
  waiting_manager: { label: 'Menunggu Manager', background: '#fef3c7', color: '#92400e' },
  division_review: { label: 'Menunggu Proses', background: '#dbeafe', color: '#1d4ed8' },
  final_approved: { label: 'Approval Proses', background: '#ede9fe', color: '#6d28d9' },
  approved: { label: 'Approved', background: '#bbf7d0', color: '#166534' },
  REJECTED: { label: 'Rejected', background: '#fecaca', color: '#991b1b' },
  CREATED_FRP: { label: 'Created FRP', background: '#cffafe', color: '#0e7490' },
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${Math.round(value || 0).toLocaleString('id-ID')}`
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages - 1, totalPages]
  if (currentPage >= totalPages - 2) return [1, 2, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
}

export default function DataTableReport({
  filtered,
  paginated,
  isMobile,
  reportType,
  statusColors,
  rangeStart,
  rangeEnd,
  rowsPerPage,
  setRowsPerPage,
  safePage,
  setCurrentPage,
  totalPages,
  desktopWidths,
  desktopHeaders,
  totalAmount,
  loading
}) {
  if (loading && filtered.length === 0) {
    return <div style={{ flex: 1, minHeight: 0, background: 'white' }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(2px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '10px 20px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#1e40af', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>hourglass_empty</span>
            Memuat data...
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
          <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>search_off</span>
          <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Tidak ada data sesuai filter</h3>
        </div>
      ) : isMobile ? (
        <>
          <div style={{ minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paginated.map((r, i) => {
              const ss = statusColors[r.status] || {}
              return (
                <div key={(r.frpNo || r.rpNo) + i} style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{r.frpNo || r.rpNo}</span>
                    {reportType === 'rp' ? (
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, ...((RP_STATUS_META[r.status] || { background: '#e2e8f0', color: '#475569' })) }}>{RP_STATUS_META[r.status]?.label || r.status}</span>
                    ) : (
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, ...ss }}>{r.status}</span>
                    )}
                  </div>
                  {reportType === 'rp' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                      {[
                        { label: 'Tanggal', value: formatDate(r.createdAt || r.tanggalDibutuhkan) },
                        { label: 'Pemohon', value: r.dibuatOleh || '-' },
                        { label: 'Divisi', value: r.divisi || '-' },
                        { label: 'Kategori', value: r.kategoriPembelian || '-' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Diproses Oleh</div>
                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{r.diprosesOleh || '-'}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Total</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>{formatCurrency(r.totalAmount)}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                      {[
                        { label: 'Tanggal', value: formatDate(r.tanggalFrp) },
                        { label: 'Pemohon', value: r.dimintaOleh || '-' },
                        { label: 'Vendor', value: r.vendor || '-' },
                        { label: 'Divisi', value: r.divisi || '-' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Perusahaan</div>
                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{r.companyName || '-'}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Total</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>{formatCurrency(r.totalAmount)}</div>
                      </div>
                      {r.approvedBy && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Disetujui Oleh</div>
                          <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>{r.approvedBy}</div>
                        </div>
                      )}
                      {r.attachLink && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Attach Link</div>
                          <div style={{ fontSize: '13px' }}><a href={r.attachLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Buka Link</a></div>
                        </div>
                      )}

                      {r.approvedAt && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Approved</div>
                          <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{formatDate(r.approvedAt)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Mobile Pagination */}
          <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}–{rangeEnd} dari {filtered.length}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Prev</button>
              
              {/* Numbered Pagination Mobile */}
              {getPaginationItems(safePage, totalPages).map((item, index) =>
                typeof item === 'number' ? (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    style={{
                      border: item === safePage ? '1px solid #2563eb' : '1px solid #dbe5f0',
                      background: item === safePage ? '#eff6ff' : 'white',
                      color: item === safePage ? '#1d4ed8' : '#475569',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: item === safePage ? 600 : 400,
                      minWidth: '32px'
                    }}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={index} style={{ color: '#94a3b8', padding: '0 4px', fontSize: '12px' }}>...</span>
                )
              )}

              <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Next</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Sticky thead */}
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
              <colgroup>{desktopWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <thead>
                <tr>
                  {desktopHeaders.map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
            {/* Scrollable tbody */}
            <div style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                <colgroup>{desktopWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <tbody>
                  {paginated.map((r, idx) => {
                    const absIdx = (safePage - 1) * rowsPerPage + idx
                    const rowBg = absIdx % 2 === 0 ? 'white' : '#fafbfc'
                    const td = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
                    if (reportType === 'rp') {
                      const rpMeta = RP_STATUS_META[r.status] || { label: r.status, background: '#e2e8f0', color: '#475569' }
                      const dateVal = r.createdAt || r.tanggalDibutuhkan
                      return (
                        <tr key={r.id + idx} style={{ background: rowBg }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                          onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                          <td style={td}>
                            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rpNo || '-'}</div>
                          </td>
                          <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(dateVal)}</td>
                          <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '13px' }}>{r.dibuatOleh || '-'}</td>
                          <td style={td}><span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>{r.divisi || '-'}</span></td>
                          <td style={{ ...td, fontSize: '12px', color: '#475569', whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.diprosesOleh || '-'}</td>
                          <td style={{ ...td, fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kategoriPembelian || '-'}</td>
                          <td style={{ ...td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{formatCurrency(r.totalAmount)}</td>
                          <td style={td}><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', background: rpMeta.background, color: rpMeta.color, whiteSpace: 'nowrap' }}>{rpMeta.label}</span></td>
                        </tr>
                      )
                    }
                    const ss = statusColors[r.status] || {}
                    return (
                      <tr key={r.frpNo + idx} style={{ background: rowBg }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                        <td style={td}>
                          <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.82rem', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.frpNo}</div>
                        </td>
                        <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(r.tanggalFrp)}</td>
                        <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '3px' }}>{r.dimintaOleh || '-'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{r.vendor || '-'}</div>
                        </td>
                        <td style={td}><span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600 }}>{r.divisi || '-'}</span></td>
                        <td style={{ ...td, fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.companyName || '-'}</td>
                        <td style={{ ...td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', wordBreak: 'break-word' }}>{formatCurrency(r.totalAmount)}</td>
                        <td style={td}><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', ...ss }}>{r.status}</span></td>
                        <td style={{ ...td, fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.approvedBy || '-'}</td>
                        <td style={{ ...td, fontSize: '12px', color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.attachLink ? <a href={r.attachLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 600 }}>Link</a> : '-'}
                        </td>
                        <td style={{ ...td, fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>{r.approvedAt ? formatDate(r.approvedAt) : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Desktop Pagination */}
          <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexWrap: 'nowrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
            <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{rangeStart}–{rangeEnd} dari {filtered.length} data · Total: <strong style={{ color: '#166534' }}>{formatCurrency(totalAmount)}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page</span>
                <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px', background: 'white' }}>
                  {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ width: '1px', height: '16px', background: '#dbe5f0', margin: '0 4px' }} />
              <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Prev</button>
              
              {/* Numbered Pagination Desktop */}
              {getPaginationItems(safePage, totalPages).map((item, index) =>
                typeof item === 'number' ? (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    style={{
                      border: item === safePage ? '1px solid #2563eb' : '1px solid #dbe5f0',
                      background: item === safePage ? '#eff6ff' : 'white',
                      color: item === safePage ? '#1d4ed8' : '#475569',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: item === safePage ? 600 : 400,
                      minWidth: '32px'
                    }}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={index} style={{ color: '#94a3b8', padding: '0 4px', fontSize: '12px' }}>...</span>
                )
              )}

              <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
