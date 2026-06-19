import React from 'react'
import SearchableSelect from '../template/SearchableSelect.jsx'

const normalizeNumber = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

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

export default function DataTableItemsFrp({
  items,
  isMobile,
  budgetSelectOptions,
  updateItem,
  handleAddRow,
  handleRemoveRow,
  getBudgetAmount,
  totalAmount,
  calculateRowAmount,
  budgets,
  kurs,
  currency = 'IDR'
}) {
  const getBudgetObj = budgetId => {
    return (budgets || []).find(b => b.id === budgetId)
  }

  const getBaseBudgetRemaining = budgetId => {
    const b = getBudgetObj(budgetId)
    if (!b) return 0
    return b.budget_remaining !== undefined ? b.budget_remaining : (b.sisa_budget !== undefined ? b.sisa_budget : (b.sisaBudget !== undefined ? b.sisaBudget : (b.remainingAmount !== undefined ? b.remainingAmount : 0)))
  }

  const getItemSubtotal = item => {
    return calculateRowAmount
      ? calculateRowAmount(item)
      : (normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(kurs) || 1))
  }

  const requestedBudgetTotals = items.reduce((acc, item) => {
    if (!item.budgetId) return acc
    acc[item.budgetId] = (acc[item.budgetId] || 0) + getItemSubtotal(item)
    return acc
  }, {})

  const getRequestedBudgetTotal = budgetId => requestedBudgetTotals[budgetId] || 0

  const getAvailableBudgetForItem = item => {
    if (!item?.budgetId) return null
    const currentSubtotal = getItemSubtotal(item)
    return getBaseBudgetRemaining(item.budgetId) - (getRequestedBudgetTotal(item.budgetId) - currentSubtotal)
  }

  const getPreviewRemaining = item => {
    if (!item?.budgetId) return null
    return getBaseBudgetRemaining(item.budgetId) - getRequestedBudgetTotal(item.budgetId)
  }

  const isHargaSatuanExceeded = (item) => {
    if (!item.budgetId || !item.hargaSatuan) return false
    const budgetRemaining = getAvailableBudgetForItem(item)
    if (budgetRemaining === null) return false
    const unitPriceIdr = normalizeNumber(item.hargaSatuan) * (normalizeNumber(kurs) || 1)
    return unitPriceIdr > budgetRemaining
  }

  const isTotalAmountExceeded = (item) => {
    if (!item.budgetId || !item.hargaSatuan) return false
    const budgetRemaining = getAvailableBudgetForItem(item)
    if (budgetRemaining === null) return false
    const totalAmountIdr = getItemSubtotal(item)
    return totalAmountIdr > budgetRemaining
  }

  return (
    <div>
      {isMobile ? (
        <div>
          {items.map((item, idx) => {
            const subtotal = getItemSubtotal(item)
            const previewRemaining = getPreviewRemaining(item)

            return (
            <div key={idx} className="frp-item-card">
              <div className="frp-item-card-header">
                <div className="frp-item-card-title">Item {idx + 1}</div>
                <button type="button" className="frp-btn-del" onClick={() => handleRemoveRow(idx)}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                </button>
              </div>
              <div className="frp-grid-2">
                <div className="frp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="frp-label">Memo</label>
                  <input name={`items[${idx}][memo]`} className="frp-input" value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Description..." />
                </div>
                <div className="frp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="frp-label">Budget</label>
                  <SearchableSelect
                    name={`items[${idx}][budgetId]`}
                    value={item.budgetId}
                    onChange={selectedValue => updateItem(idx, 'budgetId', selectedValue)}
                    options={budgetSelectOptions}
                    placeholder="Pilih Budget"
                    className="frp-select"
                  />
                </div>
                <div className="frp-form-group">
                  <label className="frp-label">Qty</label>
                  <input type="number" name={`items[${idx}][qty]`} className="frp-input" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                </div>
                <div className="frp-form-group">
                  <label className="frp-label">Harga Satuan ({currency})</label>
                  <input
                    type="text"
                    name={`items[${idx}][hargaSatuan]`}
                    className={`frp-input ${isHargaSatuanExceeded(item) || isTotalAmountExceeded(item) ? 'frp-input-error' : ''}`}
                    style={isHargaSatuanExceeded(item) || isTotalAmountExceeded(item) ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                    value={formatDecimalInput(item.hargaSatuan)}
                    onChange={e => updateItem(idx, 'hargaSatuan', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                  {isHargaSatuanExceeded(item) && (
                    <span style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 500 }}>
                      Harga Satuan melebihi sisa budget
                    </span>
                  )}
                  {!isHargaSatuanExceeded(item) && isTotalAmountExceeded(item) && (
                    <span style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 500 }}>
                      Total amount melebihi sisa budget
                    </span>
                  )}
                </div>
              </div>
              <div className="frp-item-card-amount" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                  <span className="frp-total-label" style={{ fontSize: '0.8rem' }}>Budget Remaining</span>
                  <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: previewRemaining !== null && previewRemaining < 0 ? '#ef4444' : '#16a34a' }}>
                    {previewRemaining !== null ? `Rp ${formatCurrency(previewRemaining)}` : '-'}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                  <span className="frp-total-label" style={{ fontSize: '0.8rem' }}>Amount (IDR)</span>
                  <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: '#1f4e8c' }}>
                    Rp {formatCurrency(subtotal)}
                  </strong>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <div className="no-scrollbar" style={{ overflowX: 'auto' }}>
          <table className="frp-table">
            <thead>
              <tr>
                <th className="frp-th" style={{ width: "20%" }}>Memo</th>
                <th className="frp-th" style={{ width: "25%" }}>Budget</th>
                <th className="frp-th" style={{ width: "14%", textAlign: "right" }}>Budget Remaining</th>
                <th className="frp-th" style={{ width: "7%", textAlign: "center" }}>Qty</th>
                <th className="frp-th" style={{ width: "16%", textAlign: "right" }}>Unit Price ({currency})</th>
                <th className="frp-th" style={{ width: "14%", textAlign: "right" }}>Total(IDR)</th>
                <th className="frp-th" style={{ width: "4%" }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const subtotal = getItemSubtotal(item)
                const previewRemaining = getPreviewRemaining(item)

                return (
                <tr key={idx}>
                  <td className="frp-td">
                    <input
                      name={`items[${idx}][memo]`}
                      className="frp-td-input"
                      value={item.memo}
                      onChange={e => updateItem(idx, 'memo', e.target.value)}
                      placeholder="Description..."
                      style={{ fontSize: '0.85rem' }}
                    />
                  </td>
                  <td className="frp-td">
                    <SearchableSelect
                      name={`items[${idx}][budgetId]`}
                      value={item.budgetId}
                      onChange={selectedValue => updateItem(idx, 'budgetId', selectedValue)}
                      options={budgetSelectOptions}
                      placeholder="Select Budget"
                      className="frp-td-select"
                      style={{ minHeight: '34px', padding: '6px 10px', fontSize: '0.85rem' }}
                      menuPosition="fixed"
                    />
                  </td>
                  <td className="frp-td" style={{ textAlign: 'right' }}>
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
                  <td className="frp-td" style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      name={`items[${idx}][qty]`}
                      className="frp-td-input"
                      value={item.qty}
                      onChange={e => updateItem(idx, 'qty', e.target.value)}
                      style={{ textAlign: 'center', padding: '5px 8px', fontSize: '0.85rem' }}
                    />
                  </td>
                  <td className="frp-td">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{currency}</span>
                      <input
                        type="text"
                        name={`items[${idx}][hargaSatuan]`}
                        className="frp-td-input"
                        style={{
                          paddingLeft: '32px',
                          paddingRight: '8px',
                          textAlign: 'right',
                          fontSize: '0.85rem',
                          ...(isHargaSatuanExceeded(item) || isTotalAmountExceeded(item) ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', outline: 'none' } : {})
                        }}
                        value={formatDecimalInput(item.hargaSatuan)}
                        onChange={e => updateItem(idx, 'hargaSatuan', e.target.value.replace(/[^0-9.]/g, ''))}
                      />
                    </div>
                    {isHargaSatuanExceeded(item) && (
                      <div style={{ color: '#ef4444', fontSize: '9px', marginTop: '4px', fontWeight: 500, lineHeight: '1.2', textAlign: 'right' }}>
                        Exceeds budget
                      </div>
                    )}
                    {!isHargaSatuanExceeded(item) && isTotalAmountExceeded(item) && (
                      <div style={{ color: '#ef4444', fontSize: '9px', marginTop: '4px', fontWeight: 500, lineHeight: '1.2', textAlign: 'right' }}>
                        Exceeds budget
                      </div>
                    )}
                  </td>
                  <td className="frp-td" style={{ textAlign: 'right' }}>
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
                  <td className="frp-td" style={{ textAlign: 'center' }}>
                    <button type="button" className="frp-btn-del" onClick={() => handleRemoveRow(idx)}>
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
