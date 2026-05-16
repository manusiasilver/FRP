function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatRupiah(n) {
  return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function normalizeItems(items) {
  if (Array.isArray(items)) return items
  if (items && typeof items === 'object') return Object.keys(items).map((key) => items[key])
  return []
}

function normalizeCheckDocs(checkDocs) {
  if (Array.isArray(checkDocs)) return checkDocs
  if (!checkDocs) return []
  return [checkDocs]
}

// If qs parsed duplicate form keys into an array, take the first value
function normalizeField(value) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function parseAmount(value) {
  // Handle array (duplicate form keys merged by qs) — take first valid amount
  const raw = Array.isArray(value) ? value[0] : value
  return parseInt(String(raw || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}

function renderPdfDocument(formData = {}, preview = false) {
  const items = normalizeItems(formData.items)
  const checkDocs = normalizeCheckDocs(formData.checkDocs)
  const keteranganFrp = Array.isArray(formData.keteranganFrp)
    ? formData.keteranganFrp.join(' ')
    : String(formData.keteranganFrp ?? '')
  const totalAmount = items.reduce((sum, item) => sum + parseAmount(item.amount), 0)

  const allDocs = [
    { name: 'Form Request Payment', required: true },
    { name: 'Tanda Terima Asli', required: false },
    { name: 'Invoice / Kontrak', required: true },
    { name: 'Surat Jalan Asli / Berita Acara', required: true },
    { name: 'Faktur Pajak', required: false },
    { name: 'Purchase Order', required: true },
  ]

  const itemsRows = items.map((item, idx) => `
    <tr>
      <td style="text-align:center;color:#64748b;">${idx + 1}</td>
      <td>${escapeHtml(normalizeField(item.memo) || '-')}</td>
      <td>${escapeHtml(normalizeField(item.budgetId) || '-')}</td>
      <td style="text-align:right;font-family:monospace;font-weight:600;">${formatRupiah(parseAmount(item.amount))}</td>
    </tr>`).join('')

  const checklistRows = allDocs.map((doc, idx) => {
    const checked = checkDocs.includes(doc.name)
    return `
      <div style="font-size:12px;display:flex;align-items:center;gap:8px;color:${checked ? '#1f4e8c' : '#475569'};">
        <span style="display:inline-grid;place-items:center;width:15px;height:15px;border:1.5px solid ${checked ? '#1f4e8c' : '#cbd5e1'};border-radius:4px;background:${checked ? '#1f4e8c' : 'white'};color:white;font-size:10px;font-weight:900;">${checked ? '✓' : ''}</span>
        <span>${idx + 1}. ${escapeHtml(doc.name)}${doc.required ? ' *' : ''}</span>
      </div>`
  }).join('')

  const generatedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>FRP - ${escapeHtml(formData.frpNo || 'DRAFT')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: ${preview ? `
        radial-gradient(circle at top left, rgba(244,169,64,0.1), transparent 24%),
        radial-gradient(circle at 88% 16%, rgba(47,111,178,0.12), transparent 22%),
        radial-gradient(circle at 50% 100%, rgba(22,58,107,0.06), transparent 26%),
        linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)
      ` : 'white'};
      ${preview ? 'padding: 0 0 40px;' : ''}
    }

    /* Toolbar */
    .toolbar {
      display: ${preview ? 'flex' : 'none'};
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #1a2a57 0%, #2d4a8c 100%);
      color: white;
      padding: 14px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .toolbar-title {
      font-size: 1.1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #fff 0%, #e9c46a 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .toolbar-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.15); color: white;
      border: 1px solid rgba(255,255,255,0.25);
      padding: 8px 16px; border-radius: 8px;
      cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit;
    }

    /* Page */
    .page {
      width: 210mm;
      min-height: 297mm;
      background: white;
      margin: ${preview ? '20px auto' : '0 auto'};
      padding: 14mm 12mm 12mm;
      ${preview ? 'box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-radius: 4px;' : ''}
    }

    /* Print */
    @media print {
      body { background: white; padding: 0; }
      .toolbar { display: none !important; }
      .page { margin: 0; padding: 10mm; width: 100%; box-shadow: none; border-radius: 0; }
      @page { size: A4; margin: 0; }
    }

    /* Document content */
    .doc-title {
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      color: #163a6b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding-bottom: 8px;
      border-bottom: 2px solid #163a6b;
      margin-bottom: 8px;
    }
    .frp-badge {
      text-align: center;
      margin-bottom: 14px;
    }
    .frp-badge span {
      display: inline-block;
      border: 1.5px solid #1f4e8c;
      border-radius: 999px;
      padding: 4px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #163a6b;
      background: #eff6ff;
    }

    /* Info tables */
    .info-row { display: flex; gap: 16px; margin-bottom: 10px; }
    .info-col { flex: 1; }
    .info-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .info-table td { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-table .lbl { font-weight: 600; width: 130px; color: #475569; background: #f8fafc; }
    .info-table .sep { width: 8px; text-align: center; color: #94a3b8; background: #f8fafc; }

    /* Bank */
    .bank-row {
      display: flex;
      gap: 32px;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #1f4e8c;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
      background: #f8fafc;
    }
    .bank-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 3px; }
    .bank-val { font-size: 14px; font-weight: 700; color: #163a6b; }

    /* Checklist */
    .checklist-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .checklist-heading { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 8px; }
    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }

    /* Items table */
    .items-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 10px 0; }
    .items-table th { background: #f8fafc; color: #475569; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; border-bottom: 1.5px solid #e2e8f0; }
    .items-table td { padding: 7px 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .items-table tr:last-child td { border-bottom: none; }
    .items-table .total-row td { font-weight: 700; background: #f1f5f9; border-top: 1.5px solid #e2e8f0; font-size: 13px; color: #163a6b; }

    /* Keterangan */
    .ket-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin: 10px 0;
      background: #f8fafc;
    }
    .ket-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 4px; }
    .ket-text { font-size: 12px; line-height: 1.6; color: #1e293b; }

    /* Note & footer */
    .note {
      margin-top: 14px;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 10px 14px;
      background: #fffbeb;
      font-size: 11px;
      color: #92400e;
      line-height: 1.5;
    }
    .pdf-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-title">Form Request Payment — Preview</div>
  <div style="display:flex;gap:8px;">
    <button class="toolbar-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})">
      <span class="material-icons-round" style="font-size:16px;">vertical_align_top</span> Ke Atas
    </button>
    <button class="toolbar-btn" onclick="window.print()">
      <span class="material-icons-round" style="font-size:16px;">print</span> Cetak
    </button>
  </div>
</div>

<div class="page">

  <div class="doc-title">Form Request Payment</div>
  <div class="frp-badge"><span>FRP No: ${escapeHtml(formData.frpNo || 'DRAFT')}</span></div>

  <div class="info-row">
    <div class="info-col">
      <table class="info-table">
        <tr><td class="lbl">Vendor</td><td class="sep">:</td><td>${escapeHtml(formData.vendor || '-')}</td></tr>
        <tr><td class="lbl">Tanggal FRP</td><td class="sep">:</td><td>${escapeHtml(formData.tanggalFrp || '-')}</td></tr>
        <tr><td class="lbl">Company Name</td><td class="sep">:</td><td>${escapeHtml(formData.companyName || '-')}</td></tr>
        <tr><td class="lbl">Divisi</td><td class="sep">:</td><td>${escapeHtml(formData.divisi || '-')}</td></tr>
        <tr><td class="lbl">Diminta Oleh</td><td class="sep">:</td><td>${escapeHtml(formData.dimintaOleh || '-')}</td></tr>
      </table>
    </div>
    <div class="info-col">
      <table class="info-table">
        <tr><td class="lbl">Internal PO No</td><td class="sep">:</td><td>${escapeHtml(formData.internalPoNumber || '-')}</td></tr>
        <tr><td class="lbl">Ext Doc Type</td><td class="sep">:</td><td>${escapeHtml(formData.extDocType || '-')}</td></tr>
        <tr><td class="lbl">Ext Doc Number</td><td class="sep">:</td><td>${escapeHtml(formData.extDocNumber || '-')}</td></tr>
        <tr><td class="lbl">Payment Method</td><td class="sep">:</td><td>${escapeHtml(formData.paymentMethod || '-')}</td></tr>
        <tr><td class="lbl">Payment Date</td><td class="sep">:</td><td>${escapeHtml(formData.paymentDate || '-')}</td></tr>
      </table>
    </div>
  </div>

  <div class="bank-row">
    <div>
      <div class="bank-lbl">Bank Tujuan</div>
      <div class="bank-val">${escapeHtml(formData.bankTujuan || '-')}</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <div class="bank-lbl">Nomor Rekening</div>
      <div class="bank-val" style="font-family:monospace;">${escapeHtml(formData.rekBankTujuan || '-')}</div>
    </div>
  </div>

  <div class="checklist-box">
    <div class="checklist-heading">Checklist Dokumen</div>
    <div class="checklist-grid">${checklistRows}</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:6px;">* Wajib dilampirkan</div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">No</th>
        <th>Memo</th>
        <th style="width:110px;">Budget ID</th>
        <th style="width:130px;text-align:right;">Amount (IDR)</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
    ${items.length > 1 ? `<tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding-right:10px;">Total</td>
        <td style="text-align:right;font-family:monospace;">${formatRupiah(totalAmount)}</td>
      </tr>
    </tfoot>` : ''}
  </table>

  <div class="ket-box">
    <div class="ket-lbl">Keterangan FRP</div>
    <div class="ket-text">${escapeHtml(keteranganFrp || '-')}</div>
  </div>

  <div class="note">
    <strong>INFORMASI PENTING:</strong> Dokumen ini tidak memerlukan tanda tangan basah. Dicetak secara otomatis oleh Sistem FRP dan telah melalui proses persetujuan digital.
  </div>

  <div class="pdf-footer">
    Generated by FRP Payment System ${escapeHtml(formData.companyName || '')} &mdash; ${escapeHtml(generatedDate)}
  </div>

</div>
</body>
</html>`
}

module.exports = { renderPdfDocument }
