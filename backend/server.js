const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const session = require('express-session');
const { renderPdfDocument } = require('./renderPdfDocument');

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, '..', 'frontend');
const dataPath = path.join(__dirname, 'data');
const pdfPath = path.join(__dirname, 'generated-pdfs');

app.set('view cache', false);
app.use(express.static(path.join(frontendPath, 'dist')));
app.use(express.static(path.join(frontendPath, 'public')));
app.use('/pdfs', express.static(pdfPath));

const sendSPA = (res) => res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'frp-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf8').replace(/^﻿/, ''));
const writeJson = (file, data) => fs.writeFileSync(path.join(dataPath, file), JSON.stringify(data, null, 2));

const renderAppShell = ({
    title = 'FRP System',
    rootId = 'root',
    css = [],
    scripts = [],
    bodyExtra = ''
}) => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  ${css.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n  ')}
  <style>
    html, body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(244, 169, 64, 0.10), transparent 24%),
        radial-gradient(circle at 88% 16%, rgba(47, 111, 178, 0.12), transparent 22%),
        radial-gradient(circle at 50% 100%, rgba(22, 58, 107, 0.06), transparent 26%),
        linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
      color: #1e293b;
      overflow-x: hidden;
    }

    body {
      font-family: 'Inter', sans-serif;
      position: relative;
    }

    #app-shell-bg {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: -1;
      background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,243,249,1) 100%);
    }

    #app-shell-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.55;
      background-image:
        linear-gradient(135deg, rgba(31,78,140,0.08) 0, rgba(31,78,140,0.08) 2px, transparent 2px, transparent 34px),
        radial-gradient(rgba(31,78,140,0.09) 1.2px, transparent 1.2px);
      background-size: 34px 34px, 24px 24px;
      background-position: 0 0, 12px 10px;
    }

    #app-shell-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 18% 8%, rgba(210,218,228,0.94) 0%, rgba(210,218,228,0.94) 10%, rgba(210,218,228,0) 24%),
        radial-gradient(circle at 84% 14%, rgba(47,111,178,0.18) 0%, rgba(47,111,178,0) 18%),
        radial-gradient(circle at 90% 72%, rgba(244,169,64,0.16) 0%, rgba(244,169,64,0) 18%),
        radial-gradient(circle at 76% 100%, rgba(214,224,236,0.88) 0%, rgba(214,224,236,0) 22%);
      filter: blur(2px);
    }

    #${rootId} {
      min-height: 100vh;
      position: relative;
      z-index: 1;
    }
  </style>
</head>
<body>
  <div id="app-shell-bg" aria-hidden="true"></div>
  <div id="${rootId}"></div>
  ${bodyExtra}
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  ${scripts.includes('/js/react-form.jsx') ? `<script crossorigin src="https://unpkg.com/@emotion/react@11.11.1/dist/emotion-react.umd.min.js"></script>
  <script crossorigin src="https://unpkg.com/@emotion/styled@11.11.0/dist/emotion-styled.umd.min.js"></script>
  <script crossorigin src="https://unpkg.com/@mui/material@5.13.7/umd/material-ui.development.js"></script>` : ''}
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${scripts.map((src) => `<script type="text/babel" data-presets="react" src="${src}"></script>`).join('\n  ')}
</body>
</html>`;

const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
        }
        return res.redirect('/login');
    }
    res.locals.user = req.session.user;
    next();
};

const checkIT = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// --- AUTH ROUTES ---
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    sendSPA(res);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const employees = readJson('employees.json');
    const user = employees.find(e => e.fullName === username);
    if (user && password === '123') {
        req.session.user = { fullName: user.fullName, role: user.role, allAssignments: user.companies || [] };
        return res.redirect('/select-company');
    }
    res.redirect('/login?error=1');
});

// JSON login for React
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const employees = readJson('employees.json');
    const user = employees.find(e => e.fullName === username);
    if (user && password === '123') {
        req.session.user = { fullName: user.fullName, role: user.role, allAssignments: user.companies || [] };
        return res.json({ success: true, redirect: '/select-company' });
    }
    res.json({ success: false, error: 'Nama atau Password salah' });
});

app.get('/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companies = [...new Set(user.allAssignments.map(a => a.name))];
    if (companies.length === 1) {
        req.session.user.selectedCompany = companies[0];
        return res.redirect('/select-division');
    }
    sendSPA(res);
});

app.post('/select-company', checkAuth, (req, res) => {
    req.session.user.selectedCompany = req.body.company;
    res.redirect('/select-division');
});

app.get('/api/data/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companies = [...new Set(user.allAssignments.map(a => a.name))];
    res.json({
        companies,
        user: {
            fullName: user.fullName,
            role: user.role,
            selectedCompany: user.selectedCompany || '',
            selectedDivision: user.selectedDivision || '',
            selectedJobLevel: user.selectedJobLevel || '',
            allAssignments: user.allAssignments || []
        }
    });
});

app.post('/api/auth/select-company', checkAuth, (req, res) => {
    req.session.user.selectedCompany = req.body.company;
    res.json({ success: true, redirect: '/select-division' });
});

app.get('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .map(a => ({ class: a.class, jobLevel: a.jobLevel }));
    if (divisions.length === 1) {
        req.session.user.selectedDivision = divisions[0].class;
        req.session.user.selectedJobLevel = divisions[0].jobLevel;
        return res.redirect('/');
    }
    sendSPA(res);
});

app.post('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const assignment = user.allAssignments.find(a => a.name === user.selectedCompany && a.class === req.body.division);
    if (assignment) {
        req.session.user.selectedDivision = assignment.class;
        req.session.user.selectedJobLevel = assignment.jobLevel;
    }
    res.redirect('/');
});

app.get('/api/data/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .map(a => ({ class: a.class, jobLevel: a.jobLevel }));
    res.json({
        divisions,
        selectedCompany: user.selectedCompany,
        user: {
            fullName: user.fullName,
            role: user.role,
            selectedCompany: user.selectedCompany || '',
            selectedDivision: user.selectedDivision || '',
            selectedJobLevel: user.selectedJobLevel || '',
            allAssignments: user.allAssignments || []
        }
    });
});

app.post('/api/auth/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const assignment = user.allAssignments.find(a => a.name === user.selectedCompany && a.class === req.body.division);
    if (assignment) {
        req.session.user.selectedDivision = assignment.class;
        req.session.user.selectedJobLevel = assignment.jobLevel;
    }
    res.json({ success: true, redirect: '/' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- MAIN APP ROUTES ---
app.get('/', checkAuth, (req, res) => sendSPA(res));

app.get('/api/form-data', checkAuth, (req, res) => {
    const u = req.session.user;
    const employeesData = readJson('employees.json');
    const budgetsData = readJson('budgets.json');
    const companiesData = readJson('companies.json');
    const vendorsData = readJson('vendors.json');
    const requests = readJson('requests.json');

    const usedBudgets = {};
    requests.forEach(r => {
        if (r.status === 'APPROVED' && r.items) {
            r.items.forEach(item => {
                const bId = item.budgetId;
                const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
            });
        }
    });

    const budgetsWithRemaining = budgetsData.map(b => ({
        ...b,
        remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0)
    }));

    let editData = null;
    if (req.query.revisi) {
        editData = requests.find(r => r.id === req.query.revisi);
    }

    res.json({
        employees: employeesData,
        budgets: budgetsWithRemaining,
        companies: companiesData,
        vendors: vendorsData,
        user: {
            ...u,
            selectedCompany: u.selectedCompany || '',
            selectedDivision: u.selectedDivision || '',
            selectedJobLevel: u.selectedJobLevel || ''
        },
        selectedCompany: u.selectedCompany || '',
        selectedDivision: u.selectedDivision || '',
        selectedJobLevel: u.selectedJobLevel || '',
        editData: editData
    });
});

app.get('/api/employees/:department', checkAuth, (req, res) => {
    const dept = req.params.department;
    const company = req.query.company;
    const employeesData = readJson('employees.json');
    const filtered = employeesData.filter(e => {
        if (!e.companies) return e.class === dept;
        return e.companies.some(assign => (assign.class === dept && (!company || assign.name === company)));
    });
    res.json(filtered);
});

app.get('/api/budgets/:department', checkAuth, (req, res) => {
    const budgetsData = readJson('budgets.json');
    const requests = readJson('requests.json');
    const usedBudgets = {};
    requests.forEach(r => {
        if (r.status === 'APPROVED' && r.items) {
            r.items.forEach(item => {
                const bId = item.budgetId;
                const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
            });
        }
    });
    const filtered = budgetsData
        .filter(b => (b.department || '').toLowerCase() === req.params.department.toLowerCase())
        .map(b => ({ ...b, remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0) }));
    res.json(filtered);
});

app.get('/api/departments', checkAuth, (req, res) => {
    const depts = readJson('departments.json');
    res.json([...new Set(depts.map(d => d.class).filter(Boolean))].sort());
});

app.get('/api/managers/:department', checkAuth, (req, res) => {
    const dept = req.params.department;
    const company = req.query.company;
    const employeesData = readJson('employees.json');
    const filtered = employeesData.filter(e => {
        if (!e.companies) return false;
        return e.companies.some(assign => (assign.class === dept && (!company || assign.name === company) && ['Manager', 'Direktur', 'Komisaris'].includes(assign.jobLevel)));
    });
    res.json(filtered);
});

app.get('/api/next-frp-number/:department', checkAuth, (req, res) => {
    const requests = readJson('requests.json');
    const departmentsData = readJson('departments.json');
    const dept = req.params.department.toUpperCase();
    const deptData = departmentsData.find(d => d.class === dept || d.name === dept);
    const deptCode = deptData ? deptData.kodeFrp : dept.substring(0, 3).toUpperCase();
    const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
    const sequences = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix)).map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
    const nextSeq = Math.max(0, ...sequences) + 1;
    res.json({ frpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
});

// --- APPROVAL ROUTES ---
app.get('/approval', checkAuth, (req, res) => sendSPA(res));
app.get('/approved', checkAuth, (req, res) => sendSPA(res));

app.get('/api/data/approval', checkAuth, (req, res) => {
    const u = req.session.user;
    const isApprovedView = req.query.view === 'approved';
    let reqs = readJson('requests.json');

    if (isApprovedView) {
        reqs = reqs.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED');
    } else {
        reqs = reqs.filter(r => r.status === 'PENDING');
    }

    if (u.role !== 'administrator') {
        reqs = reqs.filter(r => r.divisi === u.selectedDivision);
    }

    const canApprove = u.role === 'administrator' || ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);

    res.json({
        requests: reqs,
        canApprove,
        isApprovedView,
        user: { fullName: u.fullName, role: u.role, selectedDivision: u.selectedDivision, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

// --- FRP ACTIONS ---
app.get('/frp/:id', checkAuth, (req, res) => sendSPA(res));

app.get('/api/frp/:id', checkAuth, (req, res) => {
    const data = readJson('requests.json').find(r => r.id === req.params.id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    const user = req.session.user;
    const isIT = user.role === 'administrator' || user.class === 'IT';
    const canApprove = isIT || ['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel);
    const canEdit = isIT;

    res.json({
        data,
        employees: readJson('employees.json'),
        companies: readJson('companies.json'),
        user,
        isIT,
        canApprove,
        canEdit
    });
});

app.post('/api/frp/save', checkAuth, (req, res) => {
    try {
        let requests = readJson('requests.json');

        if (req.body.frpId) {
            const idx = requests.findIndex(r => r.id === req.body.frpId);
            if (idx === -1) return res.json({ success: false, error: 'FRP not found for revision' });
            const updatedReq = { ...requests[idx], ...req.body, id: requests[idx].id, frpNo: requests[idx].frpNo, status: 'PENDING' };
            delete updatedReq.frpId;
            requests[idx] = updatedReq;
            writeJson('requests.json', requests);
            return res.json({ success: true, id: updatedReq.id, frpNo: updatedReq.frpNo });
        }

        const departmentsData = readJson('departments.json');
        const dept = (req.body.divisi || 'GENERAL').toUpperCase();
        const deptData = departmentsData.find(d => d.class === dept || d.name === dept);
        const deptCode = deptData ? deptData.kodeFrp : dept.substring(0, 3).toUpperCase();
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix)).map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        const newReq = { ...req.body, id: Date.now().toString(36), frpNo, requestBy: req.body.dimintaOleh || 'System', status: 'PENDING', createdBy: req.session.user.fullName, createdAt: new Date().toISOString() };
        requests.push(newReq);
        writeJson('requests.json', requests);
        res.json({ success: true, id: newReq.id, frpNo });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/frp/:id/:action', checkAuth, (req, res) => {
    let requests = readJson('requests.json');
    const idx = requests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.json({ success: false });
    const action = req.params.action;
    if (action === 'approve') { requests[idx].status = 'APPROVED'; requests[idx].approvedByActual = req.session.user.fullName; const employees = readJson('employees.json'); const divisi = requests[idx].divisi || ''; const mgr = employees.find(e => (e.companies || []).some(a => a.class === divisi && ['Manager', 'Direktur', 'Komisaris'].includes(a.jobLevel))); requests[idx].approvedBy = mgr ? mgr.fullName : req.session.user.fullName; requests[idx].approvedAt = new Date().toISOString(); }
    else if (action === 'reject') requests[idx].status = 'REJECTED';
    else if (action === 'delete') requests.splice(idx, 1);
    else if (action === 'revert') { requests[idx].status = 'PENDING'; delete requests[idx].approvedByActual; delete requests[idx].approvedAt; }
    else if (action === 'update') { requests[idx] = { ...requests[idx], ...req.body, id: requests[idx].id, status: requests[idx].status, frpNo: requests[idx].frpNo }; }
    writeJson('requests.json', requests);
    res.json({ success: true });
});

// --- ADMIN ROUTES ---
app.get('/admin/:type', checkAuth, checkIT, (req, res) => sendSPA(res));

app.get('/api/data/admin', checkAuth, checkIT, (req, res) => {
    const type = req.query.type;
    if (!['employees', 'vendors', 'budgets', 'departments', 'roles'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    const u = req.session.user;
    const listData = readJson(`${type}.json`).map((item, index) => ({ ...item, originalIndex: index }));
    const employeeList = readJson('employees.json');
    res.json({
        activeType: type,
        listData,
        employeeList,
        user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

app.post('/api/admin/:type/add', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    const data = readJson(`${type}.json`);
    let newItem = req.body;
    if (type === 'employees' && newItem.companies) {
        if (!Array.isArray(newItem.companies)) newItem.companies = Object.values(newItem.companies);
    }
    if (type === 'budgets' && newItem.totalAmount) newItem.totalAmount = parseInt(String(newItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
    data.push(newItem);
    writeJson(`${type}.json`, data);
    res.json({ success: true });
});

app.post('/api/admin/:type/delete/:index', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    const data = readJson(`${type}.json`);
    data.splice(parseInt(req.params.index, 10), 1);
    writeJson(`${type}.json`, data);
    res.json({ success: true });
});

app.post('/api/admin/:type/edit/:index', checkAuth, checkIT, (req, res) => {
    const type = req.params.type;
    const data = readJson(`${type}.json`);
    let updatedItem = req.body;
    if (type === 'employees' && updatedItem.companies) {
        if (!Array.isArray(updatedItem.companies)) updatedItem.companies = Object.values(updatedItem.companies);
    }
    if (type === 'budgets' && updatedItem.totalAmount) updatedItem.totalAmount = parseInt(String(updatedItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
    data[parseInt(req.params.index, 10)] = updatedItem;
    writeJson(`${type}.json`, data);
    res.json({ success: true });
});

// --- HISTORY ROUTE ---
app.get('/history', checkAuth, (req, res) => sendSPA(res));

app.get('/api/data/history', checkAuth, (req, res) => {
    const u = req.session.user;
    if (!fs.existsSync(pdfPath)) return res.json({ files: [], user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] } });
    const files = fs.readdirSync(pdfPath)
        .filter(f => f.endsWith('.pdf'))
        .map(f => {
            const stats = fs.statSync(path.join(pdfPath, f));
            return { name: f, path: `/pdfs/${f}`, date: stats.mtime };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
        files,
        user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

// --- PDF ROUTES ---
app.post('/preview', checkAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPdfDocument(req.body, true));
});

app.post('/generate-pdf', checkAuth, async (req, res) => {
    try {
        const html = renderPdfDocument(req.body, false);
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
        await browser.close();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="FRP-${req.body.frpNo || 'DRAFT'}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
});

app.listen(PORT, () => { console.log(`\n FRP Backend running at http://localhost:${PORT}\n`); });
