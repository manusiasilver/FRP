const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const session = require('express-session');
const https = require('https');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { renderPdfDocument } = require('./renderPdfDocument');
const renderRpPdfDocument = require('./renderRpPdfDocument');

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

// --- DATABASE HELPERS ---
const COMPANY_MAP = {
    'PNM': 'PT PILAR NIAGA MAKMUR',
    'PKS': 'PT PILAR KARANG SAMUDERA',
    'PKP': 'PT PILAR KARGO PERKASA',
};

function mapJobLevel(name) {
    if (!name) return 'Staff';
    if (name === 'Commissioner') return 'Komisaris';
    if (['President Director', 'Finance Director'].includes(name)) return 'Direktur';
    if (['Senior Manager', 'Manager'].includes(name)) return 'Manager';
    return name;
}

const USER_SQL = `
    SELECT cu.id, cu.name, cu.email, cu.username, cu.department_id,
           md.name AS dept_name, md.code AS dept_code, md.company AS company_code,
           mjl.name AS job_level_name
    FROM central_users cu
    LEFT JOIN master_departments md ON cu.department_id = md.id
    LEFT JOIN master_job_levels mjl ON cu.job_level_id = mjl.id
    WHERE cu.is_active = 1
`;

const LOGIN_SQL = `
    SELECT cu.id, cu.name, cu.email, cu.username, cu.password, cu.department_id,
           md.name AS dept_name, md.code AS dept_code, md.company AS company_code,
           mjl.name AS job_level_name
    FROM central_users cu
    LEFT JOIN master_departments md ON cu.department_id = md.id
    LEFT JOIN master_job_levels mjl ON cu.job_level_id = mjl.id
    WHERE cu.is_active = 1 AND cu.username = ?
    LIMIT 1
`;

function dbRowToEmployee(row) {
    const companyName = COMPANY_MAP[row.company_code] || row.company_code || 'PT PILAR NIAGA MAKMUR';
    const deptName = row.dept_name || '';
    const jobLevel = mapJobLevel(row.job_level_name);
    return {
        fullName: row.name,
        email: row.email || '',
        username: row.username,
        role: row.department_id === 8 ? 'administrator' : 'user',
        companies: [{ name: companyName, class: deptName, jobLevel }],
        originalIndex: row.id,
    };
}

async function getAllEmployees() {
    const [rows] = await db.query(USER_SQL + ' ORDER BY cu.name');
    return rows.map(dbRowToEmployee);
}

async function getDeptCode(deptName) {
    const dept = (deptName || '').trim();
    if (!dept) return 'GEN';
    const [rows] = await db.query(
        'SELECT code FROM master_departments WHERE UPPER(name) = UPPER(?) OR UPPER(class) = UPPER(?) LIMIT 1',
        [dept, dept]
    );
    if (rows.length && rows[0].code) return rows[0].code;
    return dept.substring(0, 3).toUpperCase();
}

async function getJobLevelId(jobLevelName) {
    const mapped = { 'Komisaris': 'Commissioner', 'Direktur': 'President Director' };
    const search = mapped[jobLevelName] || jobLevelName;
    const [rows] = await db.query('SELECT id FROM master_job_levels WHERE name = ? LIMIT 1', [search]);
    return rows.length ? rows[0].id : 8;
}

async function getDeptId(deptClass) {
    const [rows] = await db.query(
        'SELECT id FROM master_departments WHERE name = ? OR class = ? LIMIT 1',
        [deptClass, deptClass]
    );
    return rows.length ? rows[0].id : null;
}

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

    const u = req.session.user;
    const isExempt = [
        '/select-company',
        '/select-division',
        '/logout',
        '/api/auth/select-company',
        '/api/auth/select-division',
        '/api/data/select-company',
        '/api/data/select-division'
    ].includes(req.path);

    if (!isExempt) {
        if (Array.isArray(u.allAssignments) && u.allAssignments.length > 0) {
            const uniqueCompanies = [...new Set(u.allAssignments.map(a => a.name))];
            if (!u.selectedCompany && uniqueCompanies.length > 1) {
                if (req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Unauthorized', redirect: '/select-company' });
                }
                return res.redirect('/select-company');
            }

            const divisions = u.allAssignments
                .filter(a => a.name === (u.selectedCompany || uniqueCompanies[0]))
                .map(a => a.class);
            if (!u.selectedDivision && divisions.length > 1) {
                if (req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Unauthorized', redirect: '/select-division' });
                }
                return res.redirect('/select-division');
            }
        }
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

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(LOGIN_SQL, [username]);
        if (rows.length) {
            const row = rows[0];
            const match = await bcrypt.compare(password, row.password || '');
            if (match) {
                const emp = dbRowToEmployee(row);
                req.session.user = { fullName: emp.fullName, role: emp.role, allAssignments: emp.companies };
                return res.redirect('/select-company');
            }
        }
    } catch (e) { console.error('[Login Error]', e.message); }
    res.redirect('/login?error=1');
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(LOGIN_SQL, [username]);
        if (rows.length) {
            const row = rows[0];
            const match = await bcrypt.compare(password, row.password || '');
            if (match) {
                const emp = dbRowToEmployee(row);
                req.session.user = { fullName: emp.fullName, role: emp.role, allAssignments: emp.companies };
                return res.json({ success: true, redirect: '/select-company' });
            }
        }
    } catch (e) { console.error('[Login Error]', e.message); }
    res.json({ success: false, error: 'Username atau Password salah' });
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
app.get('/frp', checkAuth, (req, res) => sendSPA(res));

app.get('/api/form-data', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const [employees, budgetsData, companiesData, vendorsData, deptRows] = await Promise.all([
            getAllEmployees(),
            Promise.resolve(readJson('budgets.json')),
            Promise.resolve(readJson('companies.json')),
            Promise.resolve(readJson('vendors.json')),
            db.query('SELECT id, name, class, code AS kodeFrp, company FROM master_departments ORDER BY name').then(([r]) => r),
        ]);
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

        const departments = deptRows.map(r => ({ id: r.id, name: r.name, class: r.class, kodeFrp: r.kodeFrp, company: r.company }));
        const divisionList = [...new Set(deptRows.map(r => r.name))].sort();

        res.json({
            employees,
            budgets: budgetsWithRemaining,
            companies: companiesData,
            vendors: vendorsData,
            departments,
            divisionList,
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
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/employees/:department', checkAuth, async (req, res) => {
    try {
        const dept = req.params.department;
        const company = req.query.company;
        const [rows] = await db.query(
            USER_SQL + ' AND md.name = ? ORDER BY cu.name',
            [dept]
        );
        let employees = rows.map(dbRowToEmployee);
        if (company) {
            employees = employees.filter(e => e.companies.some(c => c.name === company));
        }
        res.json(employees);
    } catch (e) { res.status(500).json({ error: e.message }); }
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

app.get('/api/departments', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT name FROM master_departments ORDER BY name');
        res.json(rows.map(r => r.name));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/managers/:department', checkAuth, async (req, res) => {
    try {
        const dept = req.params.department;
        const company = req.query.company;
        const [rows] = await db.query(
            USER_SQL + ' AND md.name = ? AND mjl.level >= 4 ORDER BY cu.name',
            [dept]
        );
        let managers = rows.map(dbRowToEmployee);
        if (company) {
            managers = managers.filter(e => e.companies.some(c => c.name === company));
        }
        res.json(managers);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

function getExchangeRateFromGoogle(from, to = 'IDR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.google.com/finance/quote/${from}-${to}`;

        function fetchUrl(currentUrl, depth) {
            if (depth > 5) {
                return reject(new Error('Too many redirects'));
            }
            https.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let nextUrl = res.headers.location;
                    if (!nextUrl.startsWith('http')) {
                        nextUrl = new URL(nextUrl, currentUrl).href;
                    }
                    return fetchUrl(nextUrl, depth + 1);
                }

                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const pattern = new RegExp(`"${from}\\s*\\/\\s*${to}",\\s*\\d+\\s*,\\s*null\\s*,\\s*\\[\\s*([\\d.]+)`);
                        const match = data.match(pattern);
                        if (match) {
                            return resolve(parseFloat(match[1]));
                        }

                        const regexClass = /class="YMlKec fxfa3d"[^>]*>([\d,.]+)</;
                        const matchClass = data.match(regexClass);
                        if (matchClass) {
                            const val = parseFloat(matchClass[1].replace(/,/g, ''));
                            return resolve(val);
                        }

                        reject(new Error(`Nilai kurs ${from}/${to} tidak ditemukan di Google Finance`));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        }

        fetchUrl(url, 0);
    });
}

app.get('/api/kurs/:currency', checkAuth, async (req, res) => {
    try {
        const from = (req.params.currency || '').trim().toUpperCase();
        console.log(`[API Kurs] Request for ${from} from user ${req.session?.user?.username || 'unknown'}`);
        if (from === 'IDR') {
            return res.json({ success: true, rate: 1 });
        }
        const rate = await getExchangeRateFromGoogle(from, 'IDR');
        console.log(`[API Kurs] Successfully fetched ${from}: ${rate}`);
        res.json({ success: true, rate });
    } catch (e) {
        console.error(`[API Kurs] Error fetching ${req.params.currency}:`, e.message);
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/next-frp-number/:department', checkAuth, async (req, res) => {
    try {
        const requests = readJson('requests.json');
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix)).map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        res.json({ frpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- APPROVAL ROUTES ---
app.get('/approval', checkAuth, (req, res) => sendSPA(res));
app.get('/approved', checkAuth, (req, res) => sendSPA(res));

app.get('/api/data/approval', checkAuth, (req, res) => {
    const u = req.session.user;
    const isApprovedView = req.query.view === 'approved';
    let reqs = readJson('requests.json');

    const pendingCount = reqs.filter(r => r.status === 'PENDING' && (u.role === 'administrator' || r.divisi === u.selectedDivision)).length;
    const approvedCount = reqs.filter(r => (r.status === 'APPROVED' || r.status === 'REJECTED') && (u.role === 'administrator' || r.divisi === u.selectedDivision)).length;

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
        counts: {
            pending: pendingCount,
            approved: approvedCount
        },
        user: { fullName: u.fullName, role: u.role, selectedDivision: u.selectedDivision, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

// --- FRP ACTIONS ---
app.get('/frp/:id', checkAuth, (req, res) => sendSPA(res));

app.get('/api/frp/:id', checkAuth, async (req, res) => {
    try {
        const data = readJson('requests.json').find(r => r.id === req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        const user = req.session.user;
        const isIT = user.role === 'administrator' || user.selectedDivision === 'IT';
        const canApprove = isIT || ['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel);
        const canEdit = isIT;
        const employees = await getAllEmployees();

        res.json({ data, employees, companies: readJson('companies.json'), user, isIT, canApprove, canEdit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/frp/save', checkAuth, async (req, res) => {
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

        const dept = (req.body.divisi || 'GENERAL').trim().toUpperCase();
        const deptCode = await getDeptCode(dept);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = requests.filter(r => r.frpNo && r.frpNo.startsWith(prefix)).map(r => parseInt(r.frpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        const newReq = { ...req.body, id: Date.now().toString(36), frpNo, requestBy: req.body.dimintaOleh || 'System', status: 'PENDING', createdBy: req.session.user.fullName, createdAt: new Date().toISOString() };
        requests.push(newReq);
        writeJson('requests.json', requests);

        if (req.body.fromRpId) {
            let rpRequests = readJson('rp-requests.json');
            const rpIdx = rpRequests.findIndex(r => r.id === req.body.fromRpId);
            if (rpIdx !== -1) {
                rpRequests[rpIdx].status = 'CREATED_FRP';
                writeJson('rp-requests.json', rpRequests);
            }
        }

        res.json({ success: true, id: newReq.id, frpNo });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/frp/:id/:action', checkAuth, async (req, res) => {
    try {
        let requests = readJson('requests.json');
        const idx = requests.findIndex(r => r.id === req.params.id);
        if (idx === -1) return res.json({ success: false });
        const action = req.params.action;
        if (action === 'approve') {
            requests[idx].status = 'APPROVED';
            requests[idx].approvedByActual = req.session.user.fullName;
            const divisi = requests[idx].divisi || '';
            const [mgrRows] = await db.query(
                USER_SQL + ' AND md.name = ? AND mjl.level >= 4 ORDER BY mjl.level DESC LIMIT 1',
                [divisi]
            );
            requests[idx].approvedBy = mgrRows.length ? mgrRows[0].name : req.session.user.fullName;
            requests[idx].approvedAt = new Date().toISOString();
        } else if (action === 'reject') {
            requests[idx].status = 'REJECTED';
        } else if (action === 'delete') {
            requests.splice(idx, 1);
        } else if (action === 'revert') {
            if (req.session.user.role !== 'administrator') return res.status(403).json({ success: false, error: 'Hanya administrator yang bisa melakukan revert' });
            requests[idx].status = 'PENDING';
            delete requests[idx].approvedByActual;
            delete requests[idx].approvedAt;
        } else if (action === 'update') {
            requests[idx] = { ...requests[idx], ...req.body, id: requests[idx].id, status: requests[idx].status, frpNo: requests[idx].frpNo };
        }
        writeJson('requests.json', requests);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

// --- DASHBOARD ROUTE ---
app.get('/dashboard', checkAuth, (req, res) => {
    const u = req.session.user;
    if (u.role !== 'administrator' && u.selectedDivision !== 'IT') return res.redirect('/');
    sendSPA(res);
});

app.get('/api/data/dashboard', checkAuth, (req, res) => {
    const u = req.session.user;
    if (u.role !== 'administrator' && u.selectedDivision !== 'IT') return res.status(403).json({ error: 'Forbidden' });

    const requests = readJson('requests.json');

    const parseItemAmount = (items) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => {
            const raw = Array.isArray(item.amount) ? item.amount[0] : item.amount;
            return sum + (parseInt(String(raw || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0);
        }, 0);
    };

    const pending = requests.filter(r => r.status === 'PENDING');
    const approved = requests.filter(r => r.status === 'APPROVED');
    const rejected = requests.filter(r => r.status === 'REJECTED');

    const companies = [...new Set(requests.map(r => r.companyName || 'Unknown'))].sort();
    const byCompany = companies.map(name => {
        const reqs = requests.filter(r => r.companyName === name);
        return {
            name,
            total: reqs.length,
            pending: reqs.filter(r => r.status === 'PENDING').length,
            approved: reqs.filter(r => r.status === 'APPROVED').length,
            rejected: reqs.filter(r => r.status === 'REJECTED').length,
            approvedAmount: reqs.filter(r => r.status === 'APPROVED').reduce((s, r) => s + parseItemAmount(r.items), 0),
        };
    });

    const recent = [...requests]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10)
        .map(r => ({
            id: r.id,
            frpNo: r.frpNo,
            vendor: r.vendor,
            companyName: r.companyName,
            divisi: r.divisi,
            status: r.status,
            totalAmount: parseItemAmount(r.items),
            tanggalFrp: r.tanggalFrp,
            dimintaOleh: r.dimintaOleh,
            createdAt: r.createdAt,
        }));

    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
            approved: 0, pending: 0, rejected: 0,
        };
    });
    requests.forEach(r => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = monthly.find(x => x.key === key);
        if (m) {
            if (r.status === 'APPROVED') m.approved++;
            else if (r.status === 'PENDING') m.pending++;
            else if (r.status === 'REJECTED') m.rejected++;
        }
    });

    const vendorMap = {};
    approved.forEach(r => {
        const v = r.vendor || 'Unknown';
        vendorMap[v] = (vendorMap[v] || 0) + parseItemAmount(r.items);
    });
    const topVendors = Object.entries(vendorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

    const divisiMap = {};
    requests.forEach(r => {
        const d = r.divisi || 'Unknown';
        if (!divisiMap[d]) divisiMap[d] = { pending: 0, approved: 0, rejected: 0, approvedAmount: 0, pendingAmount: 0 };
        if (r.status === 'PENDING') { divisiMap[d].pending++; divisiMap[d].pendingAmount += parseItemAmount(r.items); }
        else if (r.status === 'APPROVED') { divisiMap[d].approved++; divisiMap[d].approvedAmount += parseItemAmount(r.items); }
        else if (r.status === 'REJECTED') divisiMap[d].rejected++;
    });
    const byDivisi = Object.entries(divisiMap)
        .map(([name, d]) => ({ name, ...d, total: d.pending + d.approved + d.rejected }))
        .sort((a, b) => b.approvedAmount - a.approvedAmount);

    res.json({
        stats: {
            total: requests.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
            pendingAmount: pending.reduce((s, r) => s + parseItemAmount(r.items), 0),
            approvedAmount: approved.reduce((s, r) => s + parseItemAmount(r.items), 0),
            rejectedAmount: rejected.reduce((s, r) => s + parseItemAmount(r.items), 0),
        },
        byCompany,
        byDivisi,
        recent,
        monthly,
        topVendors,
        user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

// --- LAPORAN ROUTES ---
const checkLaporan = (req, res, next) => {
    const u = req.session.user;
    const isIT = u && (u.allAssignments || []).some(a => a.class === 'IT');
    if (!u || (u.role !== 'administrator' && !isIT)) return res.status(403).json({ error: 'Forbidden' });
    next();
};

app.get('/laporan', checkAuth, (req, res) => {
    const u = req.session.user;
    const isIT = (u.allAssignments || []).some(a => a.class === 'IT');
    if (u.role !== 'administrator' && !isIT) return res.redirect('/');
    sendSPA(res);
});

app.get('/api/data/laporan', checkAuth, checkLaporan, (req, res) => {
    const u = req.session.user;
    let requests = readJson('requests.json');

    const parseItemAmount = (items) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => {
            const raw = Array.isArray(item.amount) ? item.amount[0] : item.amount;
            return sum + (parseInt(String(raw || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0);
        }, 0);
    };

    const allRequests = readJson('requests.json');
    const companies = [...new Set(allRequests.map(r => r.companyName).filter(Boolean))].sort();
    const divisions = [...new Set(allRequests.map(r => r.divisi).filter(Boolean))].sort();

    const mapped = requests.map(r => ({
        id: r.id,
        frpNo: r.frpNo,
        tanggalFrp: r.tanggalFrp,
        dimintaOleh: r.dimintaOleh,
        divisi: r.divisi,
        companyName: r.companyName,
        vendor: r.vendor,
        totalAmount: parseItemAmount(r.items),
        status: r.status,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt,
        keterangan: r.keterangan,
        attachLink: r.attachLink,
    })).sort((a, b) => new Date(b.tanggalFrp || 0) - new Date(a.tanggalFrp || 0));

    res.json({
        requests: mapped,
        companies,
        divisions,
        user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

app.post('/api/laporan/pdf', checkAuth, checkLaporan, async (req, res) => {
    try {
        const { requests = [], meta = {} } = req.body;

        const formatRp = (n) => 'IDR ' + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const formatDt = (v) => {
            if (!v) return '-';
            try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)); } catch { return v; }
        };

        const rows = requests.map((r, i) => {
            const statusColor = r.status === 'APPROVED' ? '#166534' : r.status === 'REJECTED' ? '#991b1b' : '#854d0e';
            const statusBg   = r.status === 'APPROVED' ? '#bbf7d0' : r.status === 'REJECTED' ? '#fecaca' : '#fef08a';
            return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
              <td>${r.frpNo || ''}</td>
              <td>${formatDt(r.tanggalFrp)}</td>
              <td>${r.dimintaOleh || ''}</td>
              <td>${r.divisi || ''}</td>
              <td>${r.companyName || ''}</td>
              <td>${r.vendor || ''}</td>
              <td style="font-family:monospace;font-weight:700;text-align:right">${formatRp(r.totalAmount)}</td>
              <td style="text-align:center"><span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${r.status}</span></td>
              <td>${r.approvedBy || '-'}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
          h1 { font-size: 18px; color: #163a6b; margin: 0 0 4px; }
          .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
          .meta span { margin-right: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #163a6b; color: white; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          tfoot td { background: #f1f5f9; font-weight: bold; border-top: 2px solid #163a6b; }
          .footer { margin-top: 16px; color: #94a3b8; font-size: 10px; text-align: right; }
        </style></head><body>
        <h1>Laporan FRP</h1>
        <div class="meta">
          <span>Status: <b>${meta.status || 'Semua'}</b></span>
          <span>Perusahaan: <b>${meta.company || 'Semua'}</b></span>
          <span>Divisi: <b>${meta.divisi || 'Semua'}</b></span>
          ${meta.from ? `<span>Dari: <b>${meta.from}</b></span>` : ''}
          ${meta.to ? `<span>Sampai: <b>${meta.to}</b></span>` : ''}
          <span>Total Data: <b>${meta.count || requests.length}</b></span>
        </div>
        <table>
          <thead><tr>
            <th>No FRP</th><th>Tanggal</th><th>Pemohon</th><th>Divisi</th>
            <th>Perusahaan</th><th>Vendor</th><th>Total</th><th>Status</th><th>Disetujui Oleh</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="6">Total (${requests.length} data)</td>
            <td style="font-family:monospace;text-align:right">${formatRp(meta.totalAmount || 0)}</td>
            <td colspan="2"></td>
          </tr></tfoot>
        </table>
        <div class="footer">Dicetak: ${new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date())}</div>
        </body></html>`;

        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' } });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="laporan-frp-${Date.now()}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Gagal generate PDF', details: error.message });
    }
});

// --- ADMIN ROUTES ---
app.get('/admin/:type', checkAuth, checkIT, (req, res) => sendSPA(res));

app.get('/api/data/admin', checkAuth, checkIT, async (req, res) => {
    const type = req.query.type;
    if (!['employees', 'vendors', 'budgets', 'departments', 'roles'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    const u = req.session.user;
    try {
        let listData;
        if (type === 'employees') {
            listData = await getAllEmployees();
        } else if (type === 'departments') {
            const [rows] = await db.query('SELECT id, name, class, code AS kodeFrp, company FROM master_departments ORDER BY name');
            listData = rows.map((r, i) => ({ ...r, originalIndex: r.id }));
        } else {
            listData = readJson(`${type}.json`).map((item, index) => ({ ...item, originalIndex: index }));
        }
        const employeeList = await getAllEmployees();
        res.json({
            activeType: type,
            listData,
            employeeList,
            user: { fullName: u.fullName, role: u.role, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/:type/add', checkAuth, checkIT, async (req, res) => {
    const type = req.params.type;
    try {
        if (type === 'employees') {
            const { fullName, email, companies = [] } = req.body;
            const assignment = Array.isArray(companies) ? companies[0] : (companies['0'] || {});
            const deptId = await getDeptId(assignment.class || '');
            const jobLevelId = await getJobLevelId(assignment.jobLevel || 'Staff');
            const username = (fullName || '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
            const passwordHash = bcrypt.hashSync('12345', 10);
            await db.query(
                'INSERT INTO central_users (id, name, email, username, password, department_id, job_level_id, is_active) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)',
                [fullName, email || null, username, passwordHash, deptId, jobLevelId]
            );
            return res.json({ success: true });
        }
        if (type === 'departments') {
            const { name, class: cls, kodeFrp, company } = req.body;
            const [existing] = await db.query('SELECT MAX(id) AS maxId FROM master_departments');
            const nextId = (existing[0].maxId || 0) + 1;
            await db.query(
                'INSERT INTO master_departments (id, name, class, code, company) VALUES (?, ?, ?, ?, ?)',
                [nextId, name, cls || name, kodeFrp || '', company || 'PNM']
            );
            return res.json({ success: true });
        }
        // JSON-backed types
        const data = readJson(`${type}.json`);
        let newItem = req.body;
        if (type === 'budgets' && newItem.totalAmount) newItem.totalAmount = parseInt(String(newItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
        data.push(newItem);
        writeJson(`${type}.json`, data);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/admin/:type/delete/:index', checkAuth, checkIT, async (req, res) => {
    const type = req.params.type;
    const index = req.params.index;
    try {
        if (type === 'employees') {
            await db.query('DELETE FROM central_users WHERE id = ?', [index]);
            return res.json({ success: true });
        }
        if (type === 'departments') {
            await db.query('DELETE FROM master_departments WHERE id = ?', [parseInt(index, 10)]);
            return res.json({ success: true });
        }
        const data = readJson(`${type}.json`);
        data.splice(parseInt(index, 10), 1);
        writeJson(`${type}.json`, data);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/admin/:type/edit/:index', checkAuth, checkIT, async (req, res) => {
    const type = req.params.type;
    const index = req.params.index;
    try {
        if (type === 'employees') {
            const { fullName, email, companies = [] } = req.body;
            const assignment = Array.isArray(companies) ? companies[0] : (companies['0'] || {});
            const deptId = await getDeptId(assignment.class || '');
            const jobLevelId = await getJobLevelId(assignment.jobLevel || 'Staff');
            await db.query(
                'UPDATE central_users SET name = ?, email = ?, department_id = ?, job_level_id = ? WHERE id = ?',
                [fullName, email || null, deptId, jobLevelId, index]
            );
            return res.json({ success: true });
        }
        if (type === 'departments') {
            const { name, class: cls, kodeFrp, company } = req.body;
            await db.query(
                'UPDATE master_departments SET name = ?, class = ?, code = ?, company = ? WHERE id = ?',
                [name, cls || name, kodeFrp || '', company || 'PNM', parseInt(index, 10)]
            );
            return res.json({ success: true });
        }
        const data = readJson(`${type}.json`);
        let updatedItem = req.body;
        if (type === 'budgets' && updatedItem.totalAmount) updatedItem.totalAmount = parseInt(String(updatedItem.totalAmount).replace(/[^0-9]/g, ''), 10) || 0;
        data[parseInt(index, 10)] = updatedItem;
        writeJson(`${type}.json`, data);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
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

// --- REQUEST PURCHASE (RP) ROUTES ---
app.get('/rp', checkAuth, (req, res) => sendSPA(res));
app.get('/rp-approval', checkAuth, (req, res) => sendSPA(res));
app.get('/rp-approved', checkAuth, (req, res) => sendSPA(res));
app.get('/rp/:id', checkAuth, (req, res) => sendSPA(res));

app.get('/api/rp/form-data', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const [employees, deptRows] = await Promise.all([
            getAllEmployees(),
            db.query('SELECT id, name, class, code AS kodeFrp, company FROM master_departments ORDER BY name').then(([r]) => r),
        ]);
        const departmentsData = deptRows.map(r => ({ ...r, originalIndex: r.id }));
        const processDivisions = [...new Set(departmentsData.map(d => d.name).filter(Boolean))].sort();

        const budgetsData = readJson('budgets.json');
        const vendorsData = readJson('vendors.json');
        const rpRequests = readJson('rp-requests.json');
        const frpRequests = readJson('requests.json');

        const usedBudgets = {};
        frpRequests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + amt;
                });
            }
        });
        rpRequests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const bId = item.budgetId;
                    const amt = parseInt(String(item.estimatedValue || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[bId] = (usedBudgets[bId] || 0) + (amt * (parseInt(item.qty) || 1));
                });
            }
        });

        const budgetsWithRemaining = budgetsData.map(b => ({
            ...b,
            remainingAmount: (b.totalAmount || 0) - (usedBudgets[b.id] || 0)
        }));

        let editData = null;
        if (req.query.revisi) {
            editData = rpRequests.find(r => r.id === req.query.revisi);
        } else if (req.query.process) {
            editData = rpRequests.find(r => r.id === req.query.process);
        }

        res.json({
            employees,
            budgets: budgetsWithRemaining,
            vendors: vendorsData,
            departments: departmentsData,
            processDivisions,
            user: {
                ...u,
                selectedCompany: u.selectedCompany || '',
                selectedDivision: u.selectedDivision || '',
                selectedJobLevel: u.selectedJobLevel || ''
            },
            selectedCompany: u.selectedCompany || '',
            selectedDivision: u.selectedDivision || '',
            editData
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rp/next-number/:department', checkAuth, async (req, res) => {
    try {
        const rpRequests = readJson('rp-requests.json');
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept);
        const prefix = `RP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = rpRequests.filter(r => r.rpNo && r.rpNo.startsWith(prefix)).map(r => parseInt(r.rpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        res.json({ rpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rp/save', checkAuth, (req, res) => {
    try {
        let rpRequests = readJson('rp-requests.json');
        const u = req.session.user;

        if (req.body.rpId) {
            const idx = rpRequests.findIndex(r => r.id === req.body.rpId);
            if (idx === -1) return res.json({ success: false, error: 'RP not found for revision' });
            const updatedReq = { ...rpRequests[idx], ...req.body, id: rpRequests[idx].id, rpNo: rpRequests[idx].rpNo, status: 'PENDING_MANAGER' };
            delete updatedReq.rpId;
            rpRequests[idx] = updatedReq;
            writeJson('rp-requests.json', rpRequests);
            return res.json({ success: true, rpNo: rpRequests[idx].rpNo, id: rpRequests[idx].id });
        }

        const id = 'rp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const newRp = {
            id,
            rpNo: req.body.rpNo || '',
            status: 'PENDING_MANAGER',
            companyName: req.body.companyName || u.selectedCompany || '',
            divisi: req.body.divisi || u.selectedDivision || '',
            class: req.body.class || '',
            dibuatOleh: req.body.dibuatOleh || u.fullName,
            kategoriPembelian: req.body.kategoriPembelian || '',
            deskripsi: req.body.deskripsi || '',
            diprosesOleh: req.body.diprosesOleh || '',
            tanggalDibutuhkan: req.body.tanggalDibutuhkan || '',
            vendorSuggestion: req.body.vendorSuggestion || '',
            picPenerima: req.body.picPenerima || '',
            items: req.body.items || [],
            createdAt: new Date().toISOString(),
            createdBy: u.fullName
        };
        rpRequests.push(newRp);
        writeJson('rp-requests.json', rpRequests);
        res.json({ success: true, rpNo: newRp.rpNo, id: newRp.id });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/data/rp-approval', checkAuth, (req, res) => {
    const u = req.session.user;
    const view = req.query.view || 'pending';
    let reqs = readJson('rp-requests.json');

    const isProductUser = u.selectedDivision && ['product', 'produk'].includes(u.selectedDivision.toLowerCase());

    const pendingCount = reqs.filter(r => r.status === 'PENDING_MANAGER' && (u.role === 'administrator' || r.divisi === u.selectedDivision)).length;
    const processCount = reqs.filter(r => r.status === 'PENDING_PROCESS' && (u.role === 'administrator' || r.diprosesOleh === u.selectedDivision || r.divisi === u.selectedDivision)).length;
    const processApprovalCount = reqs.filter(r => r.status === 'PENDING_PROCESS_APPROVAL' && (u.role === 'administrator' || r.diprosesOleh === u.selectedDivision || r.divisi === u.selectedDivision)).length;
    const approvedCount = reqs.filter(r => (r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CREATED_FRP') && (u.role === 'administrator' || isProductUser || r.divisi === u.selectedDivision || r.diprosesOleh === u.selectedDivision)).length;

    if (view === 'approved') {
        reqs = reqs.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CREATED_FRP');
        if (u.role !== 'administrator' && !isProductUser) {
            reqs = reqs.filter(r => r.divisi === u.selectedDivision || r.diprosesOleh === u.selectedDivision);
        }
    } else if (view === 'process') {
        reqs = reqs.filter(r => r.status === 'PENDING_PROCESS');
        if (u.role !== 'administrator') {
            reqs = reqs.filter(r => r.diprosesOleh === u.selectedDivision || r.divisi === u.selectedDivision);
        }
    } else if (view === 'process-approval') {
        reqs = reqs.filter(r => r.status === 'PENDING_PROCESS_APPROVAL');
        if (u.role !== 'administrator') {
            reqs = reqs.filter(r => r.diprosesOleh === u.selectedDivision || r.divisi === u.selectedDivision);
        }
    } else {
        reqs = reqs.filter(r => r.status === 'PENDING_MANAGER');
        if (u.role !== 'administrator') {
            reqs = reqs.filter(r => r.divisi === u.selectedDivision);
        }
    }

    const canApprove = u.role === 'administrator' || ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);

    res.json({
        requests: reqs,
        canApprove,
        view,
        counts: {
            pending: pendingCount,
            process: processCount,
            'process-approval': processApprovalCount,
            approved: approvedCount
        },
        user: { fullName: u.fullName, role: u.role, selectedDivision: u.selectedDivision, selectedJobLevel: u.selectedJobLevel, allAssignments: u.allAssignments || [] }
    });
});

app.get('/api/rp/:id', checkAuth, async (req, res) => {
    try {
        const data = readJson('rp-requests.json').find(r => r.id === req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        const user = req.session.user;
        const isAdmin = user.role === 'administrator';
        const canApprove = isAdmin || ['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel);
        const isProcessDivision = isAdmin || user.selectedDivision === data.diprosesOleh;
        const employees = await getAllEmployees();

        res.json({
            data,
            employees,
            vendors: readJson('vendors.json'),
            budgets: readJson('budgets.json'),
            user,
            isAdmin,
            canApprove,
            isProcessDivision
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rp/:id/:action', checkAuth, (req, res) => {
    let rpRequests = readJson('rp-requests.json');
    const idx = rpRequests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.json({ success: false, error: 'RP not found' });

    const action = req.params.action;
    const rp = rpRequests[idx];
    const u = req.session.user;
    const isAdmin = u.role === 'administrator';

    if (action === 'manager-approve' || action === 'manager-reject') {
        if (!isAdmin) {
            const isManager = ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);
            if (!isManager) {
                return res.json({ success: false, error: 'Hanya Manager yang dapat melakukan persetujuan ini' });
            }
            if (u.selectedDivision !== rp.divisi) {
                return res.json({ success: false, error: 'Anda hanya dapat menyetujui dokumen dari divisi Anda sendiri' });
            }
        }
    }

    if (action === 'process-update' || action === 'process-direct' || action === 'process-reject') {
        if (!isAdmin) {
            const allowedDivisions = ['IT', 'HCGA', 'Product'];
            if (!allowedDivisions.includes(u.selectedDivision)) {
                return res.json({ success: false, error: 'Hanya divisi IT, HCGA, dan Product yang dapat memproses data ini' });
            }
            if (u.selectedDivision !== rp.diprosesOleh) {
                return res.json({ success: false, error: `Anda hanya dapat memproses data untuk divisi ${rp.diprosesOleh}` });
            }
        }
    }

    if (action === 'process-manager-approve' || action === 'process-manager-reject') {
        if (!isAdmin) {
            const isManager = ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);
            if (!isManager) {
                return res.json({ success: false, error: 'Hanya Manager dari divisi pemroses yang dapat melakukan persetujuan final ini' });
            }
            const allowedDivisions = ['IT', 'HCGA', 'Product'];
            if (!allowedDivisions.includes(u.selectedDivision)) {
                return res.json({ success: false, error: 'Hanya divisi IT, HCGA, dan Product yang dapat menyetujui data ini' });
            }
            if (u.selectedDivision !== rp.diprosesOleh) {
                return res.json({ success: false, error: `Anda hanya dapat menyetujui data untuk divisi ${rp.diprosesOleh}` });
            }
        }
    }

    if (action === 'manager-approve') {
        if (rp.status !== 'PENDING_MANAGER') return res.json({ success: false, error: 'Invalid status for this action' });
        rp.status = 'PENDING_PROCESS';
        rp.managerApprovedBy = u.fullName;
        rp.managerApprovedAt = new Date().toISOString();
    } else if (action === 'manager-reject') {
        if (rp.status !== 'PENDING_MANAGER') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'REJECTED';
        rp.rejectedBy = u.fullName;
        rp.rejectedAt = new Date().toISOString();
        rp.rejectedReason = req.body.reason || '';
        rp.rejectedStage = 'manager';
    } else if (action === 'process-update') {
        if (rp.status !== 'PENDING_PROCESS') return res.json({ success: false, error: 'Invalid status' });

        const changes = [];
        const headerFields = ['vendorSuggestion', 'tanggalDibutuhkan', 'picPenerima', 'deskripsi'];
        headerFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== rp[field]) {
                changes.push({ field, oldValue: rp[field], newValue: req.body[field] });
            }
        });

        const newItems = req.body.items || rp.items;
        const oldItems = rp.items || [];
        newItems.forEach((newItem, i) => {
            const oldItem = oldItems[i] || {};
            ['memo', 'linkPembelian', 'qty', 'estimatedValue', 'budgetId'].forEach(field => {
                if (newItem[field] !== undefined && String(newItem[field]) !== String(oldItem[field] || '')) {
                    changes.push({ field: `items[${i}].${field}`, oldValue: oldItem[field] || '', newValue: newItem[field], itemIndex: i });
                }
            });
        });

        headerFields.forEach(field => {
            if (req.body[field] !== undefined) rp[field] = req.body[field];
        });
        if (req.body.items) rp.items = req.body.items;

        rp.processChanges = changes;
        rp.processUpdatedBy = u.fullName;
        rp.processUpdatedAt = new Date().toISOString();
        rp.status = 'PENDING_PROCESS_APPROVAL';
    } else if (action === 'process-direct') {
        if (rp.status !== 'PENDING_PROCESS') return res.json({ success: false, error: 'Invalid status' });
        rp.processUpdatedBy = u.fullName;
        rp.processUpdatedAt = new Date().toISOString();
        rp.processChanges = [];
        rp.status = 'PENDING_PROCESS_APPROVAL';
    } else if (action === 'process-reject') {
        if (rp.status !== 'PENDING_PROCESS') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'REJECTED';
        rp.rejectedBy = u.fullName;
        rp.rejectedAt = new Date().toISOString();
        rp.rejectedReason = req.body.reason || '';
        rp.rejectedStage = 'process';
    } else if (action === 'process-manager-approve') {
        if (rp.status !== 'PENDING_PROCESS_APPROVAL') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'APPROVED';
        rp.processManagerApprovedBy = u.fullName;
        rp.processManagerApprovedAt = new Date().toISOString();
    } else if (action === 'process-manager-reject') {
        if (rp.status !== 'PENDING_PROCESS_APPROVAL') return res.json({ success: false, error: 'Invalid status' });
        rp.status = 'REJECTED';
        rp.rejectedBy = u.fullName;
        rp.rejectedAt = new Date().toISOString();
        rp.rejectedReason = req.body.reason || '';
        rp.rejectedStage = 'process-manager';
    } else if (action === 'delete') {
        rpRequests.splice(idx, 1);
    } else if (action === 'revert') {
        if (u.role !== 'administrator') return res.status(403).json({ success: false, error: 'Hanya administrator' });
        rp.status = 'PENDING_MANAGER';
        delete rp.managerApprovedBy;
        delete rp.managerApprovedAt;
        delete rp.processUpdatedBy;
        delete rp.processUpdatedAt;
        delete rp.processChanges;
        delete rp.processManagerApprovedBy;
        delete rp.processManagerApprovedAt;
        delete rp.rejectedBy;
        delete rp.rejectedAt;
        delete rp.rejectedReason;
        delete rp.rejectedStage;
    } else {
        return res.json({ success: false, error: 'Unknown action' });
    }

    rpRequests[idx] = rp;
    writeJson('rp-requests.json', rpRequests);
    res.json({ success: true });
});

// --- PDF ROUTES ---
app.post('/preview', checkAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPdfDocument(req.body, true));
});

app.get('/api/rp/:id/preview', checkAuth, (req, res) => {
    const data = readJson('rp-requests.json').find(r => r.id === req.params.id);
    if (!data) return res.status(404).send('Not found');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderRpPdfDocument(data, true));
});

app.get('/api/rp/:id/pdf', checkAuth, async (req, res) => {
    try {
        const data = readJson('rp-requests.json').find(r => r.id === req.params.id);
        if (!data) return res.status(404).send('Not found');

        const html = renderRpPdfDocument(data, false);
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
        await browser.close();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${data.rpNo || 'DRAFT'}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
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

app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    const localIPs = Object.values(nets).flat().filter(n => n.family === 'IPv4' && !n.internal).map(n => n.address);
    console.log(`\n FRP Backend running:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    localIPs.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    console.log('');
});
