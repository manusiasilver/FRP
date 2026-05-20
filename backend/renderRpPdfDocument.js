const fs = require('fs');
const path = require('path');

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

function parseAmount(value) {
  const raw = Array.isArray(value) ? value[0] : value
  return parseInt(String(raw || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}

function renderRpPdfDocument(formData = {}, preview = false) {
  const items = normalizeItems(formData.items)
  const totalAmount = items.reduce((sum, item) => sum + (parseAmount(item.estimatedValue) * parseAmount(item.qty)), 0)
  
  const companyName = formData.companyName || 'PT PILAR NIAGA MAKMUR'
  
  // Choose logo based on company
  let logoUrl = 'https://i.ibb.co.com/8YhGZ2N/logo-piagam2.png' // Default PNM
  if (companyName.toUpperCase() === 'PT PILAR KARGO PERKASA') {
    logoUrl = 'https://i.ibb.co.com/FwYJ3Hj/logo-pkp.png' // Use appropriate URL if needed, fallback to default
  } else if (companyName.toUpperCase() === 'PT PILAR KARANG SAMUDERA') {
    logoUrl = 'https://i.ibb.co.com/FwYJ3Hj/logo-pks.png' // Use appropriate URL if needed, fallback to default
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { size: landscape; margin: 0; }
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      color: #000;
      line-height: 1.3;
      font-size: 10px;
      background: ${preview ? `
        radial-gradient(circle at top left, rgba(244,169,64,0.06), transparent 24%),
        radial-gradient(circle at 88% 16%, rgba(47,111,178,0.08), transparent 22%),
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
      color: transparent;
      -webkit-text-fill-color: transparent;
    }
    .toolbar-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.15); color: white;
      border: 1px solid rgba(255,255,255,0.25);
      padding: 8px 16px; border-radius: 8px;
      cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit;
    }

    .container {
      width: 297mm;
      min-height: 210mm;
      background: white;
      margin: ${preview ? '20px auto' : '0 auto'};
      padding: 10mm 10mm 10mm;
      ${preview ? 'box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-radius: 4px;' : ''}
      box-sizing: border-box;
    }
    
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #000; padding-bottom: 8px; }
    .logo-container { width: 75px; }
    .logo { max-width: 100%; height: auto; filter: grayscale(100%); }
    .title-container { text-align: right; }
    .title { font-size: 16px; font-weight: 700; color: #000; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-no { font-size: 11px; font-weight: 600; color: #000; margin: 0; }
    .company-name { font-size: 13px; font-weight: 700; color: #000; margin: 0 0 3px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .info-box { border: 1px solid #000; border-radius: 6px; padding: 8px 12px; }
    .info-row { display: flex; margin-bottom: 3px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { width: 110px; font-size: 9px; font-weight: 700; color: #000; text-transform: uppercase; }
    .info-value { flex: 1; font-weight: 400; color: #000; }
    
    .desc-box { border: 1px solid #000; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; }
    .desc-label { font-size: 9px; font-weight: 700; color: #000; text-transform: uppercase; margin-bottom: 3px; }
    .desc-value { font-weight: 400; color: #000; }

    .table-container { margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid #000; border-radius: 6px; overflow: hidden; }
    th { border: 1px solid #000; font-weight: 700; text-align: left; padding: 5px 8px; text-transform: uppercase; background: white; border-bottom: 1.5px solid #000; }
    td { padding: 5px 8px; border: 1px solid #000; vertical-align: top; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .link { color: #000; text-decoration: underline; word-break: break-all; }
    
    .total-row td { font-weight: 700; border-top: 1.5px solid #000; }
    .total-label { text-align: right; padding-right: 12px; text-transform: uppercase; }
    .total-value { font-size: 10px; }

    @media print {
      body { background: white; padding: 0; }
      .toolbar { display: none !important; }
      .container { margin: 0; padding: 10mm; width: 100%; box-shadow: none; border-radius: 0; }
      @page { size: landscape; margin: 0; }
    }
  `

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Request Purchase - ${escapeHtml(formData.rpNo || 'DRAFT')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">Form Request Purchase — Preview</div>
    <div style="display:flex;gap:8px;">
      <button class="toolbar-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})">
        <span class="material-icons-round" style="font-size:16px;">vertical_align_top</span> Ke Atas
      </button>
      <button class="toolbar-btn" onclick="window.print()">
        <span class="material-icons-round" style="font-size:16px;">print</span> Cetak
      </button>
      <button class="toolbar-btn" onclick="window.location.href='/api/rp/${formData.id}/pdf'" style="background: #10b981; border-color: #10b981;">
        <span class="material-icons-round" style="font-size:16px;">download</span> Download PDF
      </button>
    </div>
  </div>
  <div class="container">
    
    <div class="header">
      <div class="logo-container">
        <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'">
      </div>
      <div class="title-container">
        <p class="company-name">${escapeHtml(companyName)}</p>
        <h1 class="title">Request Purchase</h1>
        <p class="doc-no">${escapeHtml(formData.rpNo || 'DRAFT')}</p>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-row"><div class="info-label">Dibuat Oleh</div><div class="info-value">${escapeHtml(formData.dibuatOleh)}</div></div>
        <div class="info-row"><div class="info-label">Divisi</div><div class="info-value">${escapeHtml(formData.divisi)}</div></div>
        <div class="info-row"><div class="info-label">Class</div><div class="info-value">${escapeHtml(formData.class)}</div></div>
        <div class="info-row"><div class="info-label">Tanggal</div><div class="info-value">${escapeHtml(formData.tanggalDibutuhkan)}</div></div>
      </div>
      <div class="info-box">
        <div class="info-row"><div class="info-label">Kategori</div><div class="info-value">${escapeHtml(formData.kategoriPembelian)}</div></div>
        <div class="info-row"><div class="info-label">Diproses Oleh</div><div class="info-value">${escapeHtml(formData.diprosesOleh)}</div></div>
        <div class="info-row"><div class="info-label">Vendor Sug.</div><div class="info-value">${escapeHtml(formData.vendorSuggestion || '-')}</div></div>
        <div class="info-row"><div class="info-label">PIC Penerima</div><div class="info-value">${escapeHtml(formData.picPenerima || '-')}</div></div>
      </div>
    </div>

    ${formData.deskripsi ? `
    <div class="desc-box">
      <div class="desc-label">Deskripsi / Alasan Permintaan</div>
      <div class="desc-value">${escapeHtml(formData.deskripsi).replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th width="5%" class="text-center">No</th>
            <th width="20%">Item Group (Budget)</th>
            <th width="25%">Memo / Deskripsi Item</th>
            <th width="20%">Link Pembelian</th>
            <th width="5%" class="text-center">Qty</th>
            <th width="12%" class="text-right">Est. Harga Satuan</th>
            <th width="13%" class="text-right">Total Est. Harga</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => {
            const qty = parseAmount(item.qty) || 0
            const val = parseAmount(item.estimatedValue) || 0
            const rowTotal = qty * val
            return `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${escapeHtml(item.budgetId)}</td>
              <td>${escapeHtml(item.memo)}</td>
              <td>${item.linkPembelian ? `<a href="${escapeHtml(item.linkPembelian)}" class="link" target="_blank">${escapeHtml(item.linkPembelian)}</a>` : '-'}</td>
              <td class="text-center">${qty}</td>
              <td class="text-right">${formatRupiah(val)}</td>
              <td class="text-right">${formatRupiah(rowTotal)}</td>
            </tr>
            `
          }).join('')}
          <tr class="total-row">
            <td colspan="6" class="total-label">Grand Total Estimasi</td>
            <td class="text-right total-value">Rp ${formatRupiah(totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="approval-table-container" style="margin-top: 15px; page-break-inside: avoid;">
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9px; border: 1px solid #000; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: white; border-bottom: 1.5px solid #000;">
            <th style="border: 1px solid #000; padding: 4px 6px; width: 25%; font-weight: 700; text-transform: uppercase;">Dibuat Oleh</th>
            <th style="border: 1px solid #000; padding: 4px 6px; width: 25%; font-weight: 700; text-transform: uppercase;">Disetujui Oleh (Mgr Divisi)</th>
            <th style="border: 1px solid #000; padding: 4px 6px; width: 25%; font-weight: 700; text-transform: uppercase;">Dicek Oleh (${escapeHtml(formData.diprosesOleh)})</th>
            <th style="border: 1px solid #000; padding: 4px 6px; width: 25%; font-weight: 700; text-transform: uppercase;">Diperiksa Oleh (Mgr ${escapeHtml(formData.diprosesOleh)})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000; padding: 8px 6px 3px; font-weight: 700;">${escapeHtml(formData.dibuatOleh || '-')}</td>
            <td style="border: 1px solid #000; padding: 8px 6px 3px; font-weight: 700;">${escapeHtml(formData.managerApprovedBy || '-')}</td>
            <td style="border: 1px solid #000; padding: 8px 6px 3px; font-weight: 700;">${escapeHtml(formData.processUpdatedBy || '-')}</td>
            <td style="border: 1px solid #000; padding: 8px 6px 3px; font-weight: 700;">${escapeHtml(formData.processManagerApprovedBy || '-')}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 3px; font-size: 8.5px; color: #000;">${formData.createdAt ? new Date(formData.createdAt).toLocaleString('id-ID') : '-'}</td>
            <td style="border: 1px solid #000; padding: 3px; font-size: 8.5px; color: #000;">${formData.managerApprovedAt ? new Date(formData.managerApprovedAt).toLocaleString('id-ID') : '-'}</td>
            <td style="border: 1px solid #000; padding: 3px; font-size: 8.5px; color: #000;">${formData.processUpdatedAt ? new Date(formData.processUpdatedAt).toLocaleString('id-ID') : '-'}</td>
            <td style="border: 1px solid #000; padding: 3px; font-size: 8.5px; color: #000;">${formData.processManagerApprovedAt ? new Date(formData.processManagerApprovedAt).toLocaleString('id-ID') : '-'}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top: 8px; font-size: 8.5px; font-weight: 600; font-style: italic; text-align: left;">
        * Dokumen ini dibuat, divalidasi, dan diterbitkan secara elektronik oleh sistem. Dokumen ini sah dan berkekuatan resmi tanpa memerlukan tanda tangan basah.
      </div>
    </div>

  </div>
</body>
</html>
  `
}

module.exports = renderRpPdfDocument;
