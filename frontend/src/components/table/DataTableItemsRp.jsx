import React from 'react'
import SearchableSelect from '../template/SearchableSelect.jsx'

const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
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

const S = {
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' },
  input: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' },
  select: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', cursor: 'pointer', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { padding: '8px 10px', textAlign: 'left', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '6px 10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tdInput: { width: '100%', minWidth: 0, padding: '6px 10px', height: '34px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc' },
  tdSelect: { width: '100%', minWidth: 0, padding: '6px 10px', height: '34px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', cursor: 'pointer' },
  btnAdd: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  btnDel: { display: 'inline-flex', alignItems: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' },
  totalLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  totalValue: { fontSize: '1.1rem', fontWeight: 800, color: '#1f4e8c' },
  itemCard: { padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fbfdff', marginBottom: '0.85rem', minWidth: 0, overflow: 'visible' },
  itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '0.9rem', flexWrap: 'wrap' },
  itemCardTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' },
  itemCardAmount: { marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid #e2e8f0' },
}

export default function DataTableItemsRp({
  items,
  isMobile,
  embedded = false,
  budgetSelectOpts,
  updateItem,
  removeRow,
  addRow,
  getBudgetRemaining,
  totalAmount,
  mobileDropdownStyle
}) {
  const getItemSubtotal = item => normalizeNumber(item.qty) * normalizeNumber(item.estimatedValue)

  const requestedBudgetTotals = items.reduce((acc, item) => {
    if (!item.budgetId) return acc
    acc[item.budgetId] = (acc[item.budgetId] || 0) + getItemSubtotal(item)
    return acc
  }, {})

  const getPreviewRemaining = item => {
    if (!item?.budgetId) return null
    const remaining = getBudgetRemaining(item.budgetId)
    if (remaining === null || remaining === undefined) return null
    return remaining - (requestedBudgetTotals[item.budgetId] || 0)
  }

  return (
    <div>
      {isMobile ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {items.map((item, idx) => {
            const subtotal = getItemSubtotal(item)
            const previewRemaining = getPreviewRemaining(item)
            return (
              <div key={idx} style={S.itemCard}>
                <div style={S.itemCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                    <div style={{ ...S.itemCardTitle, minWidth: 0 }}>Item Request</div>
                  </div>
                  <button type="button" style={S.btnDel} onClick={() => removeRow(idx)}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
                  <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Memo</label>
                    <input name={`items[${idx}][memo]`} style={S.input} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi item..." />
                  </div>
                  <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Purchase Link</label>
                    <input name={`items[${idx}][linkPembelian]`} style={S.input} value={item.linkPembelian} onChange={e => updateItem(idx, 'linkPembelian', e.target.value)} placeholder="https://..." />
                  </div>
                  <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Budget</label>
                    <SearchableSelect name={`items[${idx}][budgetId]`} value={item.budgetId} onChange={v => updateItem(idx, 'budgetId', v)} options={budgetSelectOpts} placeholder="Pilih Budget" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition="fixed" />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Qty</label>
                    <input type="number" name={`items[${idx}][qty]`} style={S.input} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Estimated Value</label>
                    <input type="text" name={`items[${idx}][estimatedValue]`} style={S.input} value={formatDecimalInput(item.estimatedValue)} onChange={e => updateItem(idx, 'estimatedValue', e.target.value.replace(/[^0-9.]/g, ''))} />
                  </div>
                </div>
                <div style={{ ...S.itemCardAmount, display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                    <span style={S.totalLabel}>Budget Remaining</span>
                    <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: previewRemaining !== null && previewRemaining < 0 ? '#ef4444' : '#16a34a', overflowWrap: 'anywhere' }}>{previewRemaining !== null ? `Rp ${formatCurrency(previewRemaining)}` : '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                    <span style={S.totalLabel}>Subtotal Estimated</span>
                    <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: '#1f4e8c', overflowWrap: 'anywhere' }}>Rp {formatCurrency(subtotal)}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="no-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: embedded ? '235px' : 'none' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: '20%', borderLeft: '1px solid #e2e8f0', borderTopLeftRadius: '8px' }}>Memo</th>
                <th style={{ ...S.th, width: '22%' }}>Purchase Link</th>
                <th style={{ ...S.th, width: '20%' }}>Budget</th>
                <th style={{ ...S.th, width: '8%', textAlign: 'center' }}>Qty</th>
                <th style={{ ...S.th, width: '13%', textAlign: 'right' }}>Budget Remaining</th>
                <th style={{ ...S.th, width: '13%', textAlign: 'right' }}>Unit Price (IDR)</th>
                <th style={{ ...S.th, width: '13%', textAlign: 'right' }}>Total (IDR)</th>
                <th style={{ ...S.th, width: '4%', borderTopRightRadius: '8px' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const subtotal = getItemSubtotal(item)
                const previewRemaining = getPreviewRemaining(item)
                return (
                  <tr key={idx}>
                    <td style={S.td}>
                      <input
                        name={`items[${idx}][memo]`}
                        style={{ ...S.tdInput, height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                        value={item.memo}
                        onChange={e => updateItem(idx, 'memo', e.target.value)}
                        placeholder="Description Item..."
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        name={`items[${idx}][linkPembelian]`}
                        style={{ ...S.tdInput, height: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                        value={item.linkPembelian}
                        onChange={e => updateItem(idx, 'linkPembelian', e.target.value)}
                        placeholder="https://..."
                      />
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <SearchableSelect
                        name={`items[${idx}][budgetId]`}
                        value={item.budgetId}
                        onChange={v => updateItem(idx, 'budgetId', v)}
                        options={budgetSelectOpts}
                        placeholder="Pilih Budget"
                        className="frp-td-select"
                        style={{ minHeight: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                        menuPosition="fixed"
                      />
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <input
                        type="number"
                        name={`items[${idx}][qty]`}
                        style={{ ...S.tdInput, height: '34px', padding: '6px 8px', fontSize: '0.95rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: previewRemaining !== null && previewRemaining < 0 ? '#ef4444' : (item.budgetId ? '#16a34a' : '#94a3b8'),
                        fontSize: '0.85rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: item.budgetId ? (previewRemaining !== null && previewRemaining < 0 ? '#fef2f2' : '#f0fdf4') : 'transparent',
                        whiteSpace: 'nowrap'
                      }}>
                        {previewRemaining !== null ? `Rp ${formatCurrency(previewRemaining)}` : '-'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Rp</span>
                        <input
                          type="text"
                          name={`items[${idx}][estimatedValue]`}
                          style={{
                            ...S.tdInput,
                            height: '34px',
                            paddingLeft: '24px',
                            paddingRight: '8px',
                            textAlign: 'right',
                            fontSize: '0.85rem'
                          }}
                          value={formatDecimalInput(item.estimatedValue)}
                          onChange={e => updateItem(idx, 'estimatedValue', e.target.value.replace(/[^0-9.]/g, ''))}
                        />
                      </div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#1e293b',
                        fontSize: '0.85rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        whiteSpace: 'nowrap'
                      }}>
                        Rp {formatCurrency(subtotal)}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <button type="button" style={S.btnDel} onClick={() => removeRow(idx)}>
                        <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
