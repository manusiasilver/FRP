const express = require('express');
const db = require('../../db');
const { centralDb } = require('../../db');
const path = require('path');
const { checkAuth } = require('../middleware/auth');
const { USER_SQL } = require('../config/constants');
const { readJson } = require('../utils/json');
const { normalizeCompanyCode } = require('../utils/company');
const { bucket } = require('../config/storage');
const { upload } = require('../middleware/upload');
const {
    getAllEmployees,
    getCompanies,
    getDepartmentRows,
    getDeptCode,
    getDeptId,
    getCompanyId,
    dbRowsToEmployees,
    getDepartmentEmployeesByUserId,
    fetchAllFrpRequests,
} = require('../services/dbService');
const {
    normalizeAssignmentList,
    resolveSelectedScope,
    getFrpSnapshotFromUser,
    normalizeFrpItems,
    replaceFrpItems,
    adjustBudgetUsage,
    validateFrpBudgetAccess,
    canLookAllFrp,
    isDivisionRestrictedFrpApprover,
    canApproveFrpRequest,
    enrichReqWithRevert,
    getExchangeRateFromGoogle,
    filterDepartmentsForUser,
    filterBudgetsForUser,
} = require('../services/frpService');
const { getUserScopedDivisions, hasUserDivisionAccess, isRequestInUserScope, isStaffScopedUser } = require('../middleware/scope');

const router = express.Router();

// ============================================================
// HELPER — map raw budget rows to normalized objects
// ============================================================

function mapBudgetRows(rows) {
    return rows.map(row => ({
        id: row.id,
        company_id: null,
        companyId: null,
        department_id: row.department_id,
        departmentId: row.department_id,
        class: row.department_class,
        description: row.project_name,
        type: row.budget_type,
        total_amount: Number(row.budget_amount || 0),
        totalAmount: Number(row.budget_amount || 0),
        budget_remaining: Number(row.budget_remaining || 0),
        sisa_budget: Number(row.budget_remaining || 0),
        sisaBudget: Number(row.budget_remaining || 0),
        remainingAmount: Number(row.budget_remaining || 0),
    }));
}

function enrichBudgets(budgetsData, departments, companiesData, usedBudgets) {
    return budgetsData.map(b => {
        const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
        const dept = departments.find(d => String(d.id) === String(bDepartmentId));
        const bCompanyId = b.company_id || b.companyId || (dept ? dept.companyId : null);
        const comp = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
        const classDept = departments.find(d => String(d.id) === String(b.class) || d.class === b.class);
        const dynamicRemaining = (b.total_amount !== undefined ? b.total_amount : (b.totalAmount || 0)) - (usedBudgets[b.id] || 0);

        return {
            ...b,
            company_id: bCompanyId,
            companyId: bCompanyId,
            company: comp ? comp.name : (b.company || 'PT PILAR NIAGA MAKMUR'),
            department: dept ? dept.name : (b.department || ''),
            class: classDept ? classDept.class : b.class,
            remainingAmount: dynamicRemaining,
            sisa_budget: dynamicRemaining,
            sisaBudget: dynamicRemaining,
        };
    });
}

function calcUsedBudgets(requests) {
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
    return usedBudgets;
}

function normalizeScopeText(value) {
    return String(value || '').trim().toUpperCase();
}

function findUserCompany(user, requestedCompany) {
    const target = normalizeScopeText(requestedCompany);
    if (!target) return null;

    return (user.companies || []).find(company =>
        normalizeScopeText(company.name) === target ||
        normalizeScopeText(company.companyName) === target ||
        normalizeScopeText(company.code) === target ||
        String(company.id || company.companyId || '') === String(requestedCompany || '')
    ) || null;
}

function resolveRequestDepartmentSnapshot(baseSnapshot, user, body = {}) {
    const requestedClass = body.departmentClass || body.kelas || body.classClass || body.class || '';
    const requestedName = body.departmentName || body.divisi || body.className || '';
    const requestedId = body.departmentId || body.classId || '';
    const requestedCompany = body.companyName || user.selectedCompany || baseSnapshot.companyName || '';
    const requestedCompanyRecord = findUserCompany(user, requestedCompany);
    const assignments = Array.isArray(user.allAssignments) ? user.allAssignments : [];

    const match = assignments.find((assignment) => {
        const companyMatch =
            !requestedCompany ||
            normalizeScopeText(assignment.name) === normalizeScopeText(requestedCompany) ||
            normalizeScopeText(assignment.companyName) === normalizeScopeText(requestedCompany);

        if (!companyMatch) return false;

        const assignmentClasses = Array.isArray(assignment.classes) && assignment.classes.length > 0
            ? assignment.classes
            : [assignment.class, assignment.dept_class, assignment.departmentClass].filter(Boolean);

        const classMatch = requestedClass
            ? assignmentClasses.some(cls => normalizeScopeText(cls) === normalizeScopeText(requestedClass))
            : false;

        const nameMatch = requestedName
            ? [assignment.dept_name, assignment.departmentName, assignment.department_name, assignment.name]
                .some(name => normalizeScopeText(name) === normalizeScopeText(requestedName))
            : false;

        const idMatch = requestedId
            ? [assignment.department_id, assignment.departmentId, assignment.dept_id, assignment.id]
                .some(id => String(id || '') === String(requestedId))
            : false;

        return classMatch || nameMatch || idMatch;
    });

    if (!match && !requestedClass && !requestedName && !requestedId) {
        return baseSnapshot;
    }

    const selectedClass = requestedClass || match?.class || match?.dept_class || match?.departmentClass || baseSnapshot.departmentClass;
    const selectedName = requestedName || match?.dept_name || match?.departmentName || match?.department_name || baseSnapshot.departmentName || selectedClass;

    return {
        ...baseSnapshot,
        companyId: match?.companyId || match?.company_id || match?.id || requestedCompanyRecord?.id || requestedCompanyRecord?.companyId || baseSnapshot.companyId,
        companyCode: match?.companyCode || match?.company_code || match?.code || requestedCompanyRecord?.code || requestedCompanyRecord?.companyCode || baseSnapshot.companyCode,
        companyName: match?.name || requestedCompanyRecord?.name || requestedCompanyRecord?.companyName || requestedCompany || baseSnapshot.companyName,
        departmentId: requestedId || match?.department_id || match?.departmentId || match?.dept_id || baseSnapshot.departmentId,
        departmentName: selectedName,
        departmentClass: selectedClass,
        departmentCode: body.departmentCode || match?.dept_code || match?.departmentCode || match?.department_code || baseSnapshot.departmentCode,
        jobLevelName: match?.jobLevel || match?.job_level_name || baseSnapshot.jobLevelName,
        jobLevelRank: match?.jobLevelRank || match?.job_level_rank || baseSnapshot.jobLevelRank,
    };
}

const BUDGET_SELECT_SQL = `
    SELECT id, department_id, department_name, department_class, department_code,
           project_name, budget_type, budget_amount, budget_used, budget_remaining
    FROM master_budgets
`;

// ============================================================
// SPA PAGES
// ============================================================

router.get('/', checkAuth, (req, res) => res.sendSPA());
router.get('/frp', checkAuth, (req, res) => res.sendSPA());
router.get('/frp/:id', checkAuth, (req, res) => res.sendSPA());
router.get('/approval', checkAuth, (req, res) => res.sendSPA());
router.get('/approved', checkAuth, (req, res) => res.sendSPA());
router.get('/status_frp', checkAuth, (req, res) => res.sendSPA());

// ============================================================
// LOOKUP ENDPOINTS
// ============================================================

router.get('/api/company', checkAuth, async (req, res) => {
    try {
        res.json(await getCompanies());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/vendors', checkAuth, (req, res) => {
    try {
        res.json(readJson('vendors.json'));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/employees
// Admin & IT → semua karyawan (filter company opsional)
// User biasa → filter by company + divisi sendiri
// - ?company=xxx → override filter company (admin/IT only)
router.get('/api/employees', checkAuth, async (req, res) => {
    try {
        const user = req.session.user;
        const all = await getAllEmployees();

        if (user.role === 'administrator') return res.json(all);

        const targetCompany = normalizeCompanyCode(req.query.company || user.selectedCompany || '');
        const userDivision = String(user.selectedDivision || user.departmentClass || '').trim().toUpperCase();
        const isIT = userDivision === 'IT';

        // IT bisa lihat semua karyawan, hanya filter by company jika ada
        if (isIT) {
            if (!targetCompany) return res.json(all);
            const filtered = all.filter(e =>
                normalizeCompanyCode(e.companyCode || e.companyName || '') === targetCompany ||
                (e.allAssignments || []).some(a => normalizeCompanyCode(a.code || a.name || '') === targetCompany)
            );
            return res.json(filtered.length > 0 ? filtered : all);
        }

        // Non-IT: filter by company AND divisi user
        const filtered = all.filter(e =>
            (e.allAssignments || []).some(a => {
                const matchCompany = !targetCompany || normalizeCompanyCode(a.code || a.name || '') === targetCompany;
                const matchDivision = !userDivision || String(a.class || a.dept_class || '').trim().toUpperCase() === userDivision;
                return matchCompany && matchDivision;
            })
        );
        res.json(filtered.length > 0 ? filtered : all);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/employees/:department', checkAuth, async (req, res) => {
    try {
        const params = [req.params.department];
        let sql = USER_SQL + ' AND md.name = ?';
        if (req.query.company) {
            sql += ' AND mc.code = ?';
            params.push(normalizeCompanyCode(req.query.company));
        }
        sql += ' ORDER BY cu.name';
        const [rows] = await db.query(sql, params);
        res.json(dbRowsToEmployees(rows));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/departments
// Sudah difilter berdasarkan scope user (via allAssignments)
// - ?company=xxx  → filter by company
// - ?names=true   → return name strings only
router.get('/api/departments', checkAuth, async (req, res) => {
    try {
        const { sameCompanyName } = require('../utils/company');
        const departments = await getDepartmentRows();

        const byCompany = req.query.company
            ? departments.filter(d => sameCompanyName(d.company, req.query.company))
            : departments;

        const scoped = filterDepartmentsForUser(byCompany, req.session.user);

        if (req.query.names === 'true') {
            return res.json([...new Set(scoped.map(r => r.name))].sort());
        }

        res.json(scoped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/job-levels', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, level FROM master_job_levels ORDER BY level ASC');
        res.json(rows.map(r => ({ id: r.id, name: r.name, level: r.level })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/managers/:department', checkAuth, async (req, res) => {
    try {
        const params = [req.params.department];
        let sql = USER_SQL + ' AND md.name = ? AND mjl.level >= 4';
        if (req.query.company) {
            sql += ' AND mc.code = ?';
            params.push(normalizeCompanyCode(req.query.company));
        }
        sql += ' ORDER BY cu.name';
        const [rows] = await db.query(sql, params);
        res.json(dbRowsToEmployees(rows));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function toPilargroupUserInfo(user) {
    return {
        id: user.id,
        internal_id: user.internal_id ?? null,
        username: user.username,
        name: user.name || user.fullName || user.username,
        email: user.email ?? null,
        phone: user.phone ?? null,

        departments: user.departments || [],
        companies: user.companies || [],

        department_id: user.department_id ?? user.departmentId ?? null,
        department: user.department || user.departmentName || user.selectedDivision || '',

        company_id: user.company_id || user.companyId || '',
        company: user.company || user.companyName || user.selectedCompany || '',

        job_position: user.job_position || user.jobPosition || '',
        job_level: user.job_level || user.jobLevelName || user.selectedJobLevel || '',
        job_level_value: user.job_level_value ?? user.jobLevelRank ?? null,

        apps: user.apps || [],
        cv: user.cv ?? null,
    };
}

router.get('/api/user/info', checkAuth, (req, res) => {
    const user = req.session.user;

    res.json({
        ...toPilargroupUserInfo(user),
        role: user.role ?? null,
        selectedCompany: user.selectedCompany ?? '',
        selectedCompanyId: user.selectedCompanyId ?? '',
        selectedCompanyCode: user.selectedCompanyCode ?? '',
        selectedDivision: user.selectedDivision ?? user.department ?? '',
        selectedJobLevel: user.selectedJobLevel ?? user.job_level ?? user.jobLevelName ?? '',
        jobLevelRank: user.jobLevelRank ?? user.job_level_value ?? null,
        allAssignments: user.allAssignments || [],
    });
});

router.get('/api/user/departement', checkAuth, async (req, res) => {
    try {
        res.json(await getDepartmentEmployeesByUserId(req.session.user.id));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// FRP FORM OPTIONS
// Satu endpoint untuk semua data form — sudah difilter per user.
// Frontend tidak perlu lagi logic scope/assignment, tinggal render.
// GET /api/frp/form-options
// GET /api/frp/form-options?revisi=<id>
// ============================================================

router.get('/api/frp/form-options', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;
        const revisiId = req.query.revisi || null;

        const [employees, departmentEmployees, [budgetRows], companiesData, vendorsData, departments, requests] = await Promise.all([
            getAllEmployees(),
            getDepartmentEmployeesByUserId(u.id),
            db.query(BUDGET_SELECT_SQL),
            getCompanies(),
            Promise.resolve(readJson('vendors.json')),
            getDepartmentRows(),
            fetchAllFrpRequests(),
        ]);

        const usedBudgets = calcUsedBudgets(requests);
        const allBudgets = enrichBudgets(mapBudgetRows(budgetRows), departments, companiesData, usedBudgets);

        const allAssignments = normalizeAssignmentList(u, departmentEmployees);
        const scope = resolveSelectedScope(u, allAssignments);
        const userWithScope = { ...u, ...scope };

        // Pre-filter berdasarkan scope user — frontend tidak perlu logic ini
        const userDepts   = filterDepartmentsForUser(departments, userWithScope);
        const userBudgets = filterBudgetsForUser(allBudgets, userWithScope);

        const editData    = revisiId ? (requests.find(r => r.id === revisiId) || null) : null;
        const divisionList = [...new Set(userDepts.map(d => d.name))].sort();

        res.json({
            user:             userWithScope,
            companies:        companiesData,
            departments:      userDepts,
            budgets:          userBudgets,
            employees,
            departmentEmployees,
            vendors:          vendorsData,
            divisionList,
            editData,
            selectedCompany:  scope.selectedCompany,
            selectedDivision: scope.selectedDivision,
            selectedJobLevel: scope.selectedJobLevel,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// FRP BUDGET ENDPOINTS  (enriched with remaining & company info)
// Berbeda dari /api/budgets (admin CRUD) — ini khusus untuk form FRP
// GET /api/frp/budgets              → semua budget
// GET /api/frp/budgets?department=x → filtered by department name
// ============================================================

router.get('/api/frp/budgets', checkAuth, async (req, res) => {
    try {
        const [[budgetRows], requests, companiesData, departments] = await Promise.all([
            db.query(BUDGET_SELECT_SQL),
            fetchAllFrpRequests(),
            getCompanies(),
            getDepartmentRows(),
        ]);
        const budgets = mapBudgetRows(budgetRows);
        const usedBudgets = calcUsedBudgets(requests);
        let result = enrichBudgets(budgets, departments, companiesData, usedBudgets);

        // Filter berdasarkan scope user
        result = filterBudgetsForUser(result, req.session.user);

        if (req.query.department) {
            const dept = req.query.department.toLowerCase();
            result = result.filter(b => (b.department || '').toLowerCase() === dept);
        }

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// EXCHANGE RATE
// ============================================================

router.get('/api/kurs/:currency', checkAuth, async (req, res) => {
    try {
        const from = (req.params.currency || '').trim().toUpperCase();
        if (from === 'IDR') return res.json({ success: true, rate: 1 });
        const rate = await getExchangeRateFromGoogle(from, 'IDR');
        res.json({ success: true, rate });
    } catch (e) {
        console.error(`[API Kurs] Error fetching ${req.params.currency}:`, e.message);
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// FRP NUMBER
// ============================================================

router.get('/api/next-frp-number/:department', checkAuth, async (req, res) => {
    try {
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept, req.query.company || req.session.user.selectedCompany);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const [seqRows] = await db.query(`SELECT frp_no FROM frp_request WHERE frp_no LIKE ?`, [`${prefix}%`]);
        const sequences = seqRows.map(r => parseInt(r.frp_no.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        res.json({ frpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// FORM DATA (combined initial load)
// ============================================================

router.get('/api/form-data', checkAuth, async (req, res) => {
    try {
        const u = req.session.user;

        const [employees, departmentEmployees, [budgetRows], companiesData, vendorsData, departments] = await Promise.all([
            getAllEmployees(),
            getDepartmentEmployeesByUserId(u.id),
            db.query(BUDGET_SELECT_SQL),
            getCompanies(),
            Promise.resolve(readJson('vendors.json')),
            getDepartmentRows(),
        ]);

        const requests = await fetchAllFrpRequests();
        const usedBudgets = calcUsedBudgets(requests);
        const budgets = enrichBudgets(mapBudgetRows(budgetRows), departments, companiesData, usedBudgets);

        const editData = req.query.revisi
            ? requests.find(r => r.id === req.query.revisi) || null
            : null;

        const allAssignments = normalizeAssignmentList(u, departmentEmployees);
        const scope = resolveSelectedScope(u, allAssignments);
        const divisionList = [...new Set(departments.map(r => r.name))].sort();

        res.json({
            employees,
            departmentEmployees,
            budgets,
            companies: companiesData,
            vendors: vendorsData,
            departments,
            divisionList,
            editData,
            user: {
                ...u,
                ...scope,
                selectedCompany: scope.selectedCompany,
                selectedDivision: scope.selectedDivision,
                selectedJobLevel: scope.selectedJobLevel,
            },
            selectedCompany: scope.selectedCompany,
            selectedDivision: scope.selectedDivision,
            selectedJobLevel: scope.selectedJobLevel,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// APPROVAL VIEW
// ============================================================

// GET /api/data/approval
// Query params:
//   view=pending|approved|all
//   search, date, requester, status, division  — filter
//   sortBy=date|requester|division|status|total, sortDir=asc|desc
//   page=1, limit=10
async function sendFrpApprovalView(req, res, forcedView, section = 'full') {
    try {
        const u = req.session.user;
        const routeValue = (key, fallback = '') => req.params[key] || req.query[key] || fallback;

        const view = forcedView || req.query.view || 'pending';
        const isApprovedView = view === 'approved';
        const isAllView      = view === 'all';

        const search    = (req.query.search    || '').toLowerCase().trim();
        const date      = (req.query.date      || '').trim();
        const requester = (req.query.requester || '').toLowerCase().trim();
        const status    = (req.query.status    || '').toUpperCase().trim();
        const division  = (req.query.division  || '').trim();
        const page      = Math.max(1, parseInt(routeValue('page', '1'),  10));
        const limit     = Math.max(1, Math.min(200, parseInt(routeValue('limit', '10'), 10)));
        const sortBy    = routeValue('sortBy', 'date');
        const sortOrder = routeValue('sortDir', 'desc');
        const sortDir   = (sortOrder === 'asc' || sortOrder === 'ascending') ? 'asc' : 'desc';

        const hasLookAccess = await canLookAllFrp(u);
        const selectedOnlyScope = isStaffScopedUser(u);
        let all = await fetchAllFrpRequests();

        // scope filter
        if (!hasLookAccess) {
            all = all.filter(r => isRequestInUserScope(r, u, { selectedOnly: selectedOnlyScope }));
        }
        if (!isAllView && isDivisionRestrictedFrpApprover(u)) {
            all = all.filter(r => canApproveFrpRequest(u, r));
        }

        // badge counts (sebelum view/filter)
        const pendingCount  = all.filter(r => r.status === 'PENDING').length;
        const approvedCount = all.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED').length;

        // view filter
        if (!isAllView) {
            all = isApprovedView
                ? all.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED')
                : all.filter(r => r.status === 'PENDING');
        }

        // enrich + tambah field total per request
        all = all.map(r => ({
            ...enrichReqWithRevert(r, u),
            total: (r.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0),
        }));

        // filter options (dari semua data view, sebelum search)
        const filterOptions = {
            requesters: [...new Set(all.map(r => r.dimintaOleh).filter(Boolean))].sort(),
            divisions:  [...new Set(all.map(r => r.divisi).filter(Boolean))].sort(),
        };

        // apply filters
        if (search) {
            all = all.filter(r =>
                (r.frpNo       || '').toLowerCase().includes(search) ||
                (r.frpDescription || '').toLowerCase().includes(search) ||
                (r.vendor      || '').toLowerCase().includes(search) ||
                (r.dimintaOleh || '').toLowerCase().includes(search) ||
                (r.divisi      || '').toLowerCase().includes(search) ||
                (r.status      || '').toLowerCase().includes(search) ||
                (r.approvedBy  || '').toLowerCase().includes(search) ||
                (r.items || []).some(i =>
                    (i.memo        || '').toLowerCase().includes(search) ||
                    (i.projectName || '').toLowerCase().includes(search)
                )
            );
        }
        if (date)      all = all.filter(r => r.tanggalFrp === date);
        if (requester) all = all.filter(r => (r.dimintaOleh || '').toLowerCase().includes(requester));
        if (status)    all = all.filter(r => r.status === status);
        if (division)  all = all.filter(r => r.divisi === division);

        // sort
        all.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'date') {
                valA = a.createdAt ? new Date(a.createdAt).getTime() : (parseInt(a.id) || 0);
                valB = b.createdAt ? new Date(b.createdAt).getTime() : (parseInt(b.id) || 0);
                return sortDir === 'asc' ? valA - valB : valB - valA;
            } else if (sortBy === 'amount') {
                return sortDir === 'asc' ? a.total - b.total : b.total - a.total;
            }
            const map = { requester: 'dimintaOleh', division: 'divisi', status: 'status' };
            const field = map[sortBy] || 'dimintaOleh';
            valA = (a[field] || '').toLowerCase();
            valB = (b[field] || '').toLowerCase();
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });

        // paginate
        const total      = all.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage   = Math.min(page, totalPages);
        const pageItems  = all.slice((safePage - 1) * limit, safePage * limit);

        const canApprove = u.role === 'administrator' ||
            Number(u.jobLevelRank || 0) >= 4 ||
            ['Manager', 'Direktur', 'Komisaris'].includes(u.selectedJobLevel);

        // Map ke struktur response bersih — hanya field yang dipakai frontend
        const data = pageItems.map(r => ({
            // Core table fields
            id:            r.id,
            frpNo:         r.frpNo,
            status:        r.status,
            date:          r.tanggalFrp,
            requesterName: r.dimintaOleh,
            vendor:        r.vendor,
            division:      r.divisi,
            frp_description: r.frpDescription,
            amount:        r.total,
            approvedBy:    r.approvedBy,
            attachLink:    r.attachLink,
            canRevert:     r.canRevert,
            items:         r.items,
            // Detail dialog fields
            checkDocs:        r.checkDocs,
            companyName:      r.companyName,
            keteranganFrp:    r.frpDescription,
            internalPoNumber: r.internalPoNumber,
            extDocType:       r.extDocType || r.externalDocumentType || '',
            extDocNumber:     r.extDocNumber || r.externalDocumentNumber || '',
            paymentMethod:    r.paymentMethod,
            paymentDate:      r.paymentDate,
            bankTujuan:       r.bankTujuan || r.destinationBank || '',
            rekBankTujuan:    r.rekBankTujuan || r.destinationBankAccount || '',
            rpReference:      r.rpReference,
        }));

        const payload = {
            canApprove,
            isApprovedView,
            summary:    { pending: pendingCount, approved: approvedCount },
            filters:    filterOptions,
            pagination: { total, page: safePage, limit, totalPages },
            data,
            meta: {
                user: {
                    fullName:         u.fullName,
                    selectedDivision: u.selectedDivision,
                    jobLevelRank:     u.jobLevelRank,
                },
            },
        };

        if (section === 'meta') {
            return res.json({
                canApprove: payload.canApprove,
                isApprovedView: payload.isApprovedView,
                meta: payload.meta,
            });
        }
        if (section === 'summary') return res.json({ summary: payload.summary });
        if (section === 'filters') return res.json({ filters: payload.filters });
        if (section === 'data') {
            return res.json({
                pagination: payload.pagination,
                data: payload.data,
            });
        }

        res.json(payload);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

router.get('/api/frp/approval/pending/meta', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending', 'meta'));
router.get('/api/frp/approval/pending/summary', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending', 'summary'));
router.get('/api/frp/approval/pending/filters', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending', 'filters'));
router.get('/api/frp/approval/pending/data/page/:page/limit/:limit/sort-by/:sortBy/order/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending', 'data'));

router.get('/api/frp/approval/approved/meta', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved', 'meta'));
router.get('/api/frp/approval/approved/summary', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved', 'summary'));
router.get('/api/frp/approval/approved/filters', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved', 'filters'));
router.get('/api/frp/approval/approved/data/page/:page/limit/:limit/sort-by/:sortBy/order/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved', 'data'));

router.get('/api/frp/status/meta', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'all', 'meta'));
router.get('/api/frp/status/summary', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'all', 'summary'));
router.get('/api/frp/status/data/page/:page/limit/:limit/sort-by/:sortBy/order/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'all', 'data'));

router.get('/api/frp/approval/pending/page/:page/limit/:limit/sort-by/:sortBy/order/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending'));
router.get('/api/frp/approval/approved/page/:page/limit/:limit/sort-by/:sortBy/order/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved'));
router.get('/api/frp/status/page/:page/limit/:limit/sort-by/:sortBy/order/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'all'));
router.get('/api/frp/approval/pending/page/:page/limit/:limit/sort/:sortBy/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending'));
router.get('/api/frp/approval/approved/page/:page/limit/:limit/sort/:sortBy/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved'));
router.get('/api/frp/status/page/:page/limit/:limit/sort/:sortBy/:sortDir', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'all'));
router.get('/api/frp/approval/pending', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'pending'));
router.get('/api/frp/approval/approved', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'approved'));
router.get('/api/frp/status', checkAuth, (req, res) => sendFrpApprovalView(req, res, 'all'));
router.get('/api/data/approval', checkAuth, (req, res) => sendFrpApprovalView(req, res));
router.get('/api/data/frp-approval', checkAuth, (req, res) => sendFrpApprovalView(req, res));

// ============================================================
// FRP — READ
// ============================================================

router.get('/api/frp/:id', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllFrpRequests()).find(r => r.id === req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });

        const user = req.session.user;
        const isIT = user.role === 'administrator' || String(user.selectedDivision || user.departmentClass || '').trim().toUpperCase() === 'IT';
        const canApprove = canApproveFrpRequest(user, data);
        const [employees, companies] = await Promise.all([getAllEmployees(), getCompanies()]);

        res.json({ data, employees, companies, user, isIT, canApprove, canEdit: isIT });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// FRP — ATTACHMENT
// ============================================================

router.post('/api/frp/:id/attachment', checkAuth, (req, res, next) => {
    upload.single('attachment')(req, res, err => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'File tidak ditemukan' });

        const frpId = req.params.id;
        const [frpRows] = await db.query('SELECT frp_no FROM frp_request WHERE id = ?', [frpId]);
        if (!frpRows.length) return res.status(404).json({ success: false, error: 'FRP tidak ditemukan' });

        const frpNo = frpRows[0].frp_no.replace(/\//g, '-');
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `frp/${year}/${month}/${frpNo}${ext}`;

        const blob = bucket.file(filename);
        await blob.save(req.file.buffer, { contentType: req.file.mimetype, resumable: false });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        await db.query('UPDATE frp_request SET attachment_link = ? WHERE id = ?', [publicUrl, frpId]);

        res.json({ success: true, path: publicUrl });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/api/frp/:id/attachment', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT attachment_link FROM frp_request WHERE id = ?', [req.params.id]);
        if (!rows.length || !rows[0].attachment_link) {
            return res.status(404).json({ success: false, error: 'File tidak ditemukan' });
        }

        let attachmentLink = rows[0].attachment_link;
        const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;

        if (!attachmentLink.startsWith(bucketPrefix)) {
            if (attachmentLink.startsWith('http')) return res.redirect(attachmentLink);
        } else {
            attachmentLink = attachmentLink.substring(bucketPrefix.length);
        }

        const [signedUrl] = await bucket.file(attachmentLink).getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
            responseDisposition: 'inline',
        });

        const ext = path.extname(attachmentLink).toLowerCase();
        const officeExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
        if (officeExts.includes(ext)) {
            return res.redirect(`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}`);
        }

        res.redirect(signedUrl);
    } catch (e) {
        console.error('Get attachment error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.delete('/api/frp/:id/attachment', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT attachment_link FROM frp_request WHERE id = ?', [req.params.id]);
        if (!rows.length || !rows[0].attachment_link) {
            return res.status(404).json({ success: false, error: 'File tidak ditemukan' });
        }

        let filenameToDelete = rows[0].attachment_link;
        const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;
        if (filenameToDelete.startsWith(bucketPrefix)) {
            filenameToDelete = filenameToDelete.substring(bucketPrefix.length);
        }

        await bucket.file(filenameToDelete).delete();
        await db.query('UPDATE frp_request SET attachment_link = NULL WHERE id = ?', [req.params.id]);

        res.json({ success: true });
    } catch (e) {
        console.error('Delete error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ============================================================
// FRP — SAVE (create / revisi)
// ============================================================

router.post('/api/frp/save', checkAuth, async (req, res) => {
    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        const u = req.session.user;
        const snapshot = resolveRequestDepartmentSnapshot(getFrpSnapshotFromUser(u), u, req.body);
        const items = normalizeFrpItems(req.body.items || []);

        await validateFrpBudgetAccess(client, u, items);

        if (!snapshot.companyId || !snapshot.departmentId) {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: 'User company or department snapshot is missing from auth session',
            });
        }

        // Load old items for revision (needed to revert budget usage)
        let oldItems = [];
        if (req.body.frpId) {
            const [oldItemRows] = await client.query(`
                SELECT id, budget_id, memo, qty, price, amount
                FROM items_frp
                WHERE frp_request_id = ?
            `, [req.body.frpId]);

            oldItems = oldItemRows.map(item => ({
                id: item.id,
                budgetId: item.budget_id,
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                amount: Number(item.amount || 0),
            }));
        }

        // Pre-save budget validation
        const kurs = parseFloat(req.body.exchangeRate) || parseFloat(req.body.kurs) || 1;
        for (const item of (req.body.items || [])) {
            if (!item.budgetId) continue;

            const reqAmount = parseFloat(item.amount) || 0;
            const price = parseFloat(item.price) || parseFloat(item.hargaSatuan) || 0;
            const unitPriceIdr = price * kurs;

            let revertedAmount = 0;
            if (req.body.frpId) {
                const matchedOld = oldItems.filter(oi => oi.budgetId === item.budgetId);
                revertedAmount = matchedOld.reduce((sum, oi) => sum + (parseFloat(oi.amount) || 0), 0);
            }

            const [bRows] = await db.query('SELECT budget_remaining FROM master_budgets WHERE id = ?', [item.budgetId]);
            if (bRows.length) {
                const availableBudget = parseFloat(bRows[0].budget_remaining) + revertedAmount;
                const fmt = n => new Intl.NumberFormat('id-ID').format(n);

                if (unitPriceIdr > availableBudget) {
                    return res.json({
                        success: false,
                        error: `Harga Satuan untuk budget ${item.budgetId} (Rp ${fmt(unitPriceIdr)}) melebihi batas budget yang tersedia (Rp ${fmt(availableBudget)}).`,
                    });
                }
                if (reqAmount > availableBudget) {
                    return res.json({
                        success: false,
                        error: `Total Amount untuk budget ${item.budgetId} (Rp ${fmt(reqAmount)}) melebihi sisa budget yang tersedia (Rp ${fmt(availableBudget)}).`,
                    });
                }
            }
        }

        const commonFields = {
            company_id: snapshot.companyId,
            company_code: snapshot.companyCode,
            company_name: snapshot.companyName,
            frp_date: req.body.frpDate || req.body.tanggalFrp || null,
            department_id: snapshot.departmentId,
            department_name: snapshot.departmentName,
            department_class: snapshot.departmentClass,
            department_code: snapshot.departmentCode,
            job_level_name: snapshot.jobLevelName,
            job_level_rank: snapshot.jobLevelRank,
            requested_by: snapshot.createdByUserName,
            currency: req.body.currency || 'IDR',
            kurs: req.body.exchangeRate || req.body.kurs || '1',
            frp_description: req.body.frpDescription || req.body.keteranganFrp || '',
            vendor: req.body.vendor || '',
            internal_po_number: req.body.internalPoNumber || '',
            ext_doc_type: req.body.externalDocumentType || req.body.extDocType || '',
            ext_doc_number: req.body.externalDocumentNumber || req.body.extDocNumber || '',
            payment_method: req.body.paymentMethod || 'Transfer',
            payment_date: req.body.paymentDate || req.body.payment_date || null,
            destination_bank: req.body.destinationBank || req.body.bankTujuan || '',
            destination_bank_account: req.body.destinationBankAccount || req.body.rekBankTujuan || '',
            check_docs: JSON.stringify(req.body.checkDocs || []),
            created_by_user_id: snapshot.createdByUserId,
            created_by_user_name: snapshot.createdByUserName,
        };

        // UPDATE (revision)
        if (req.body.frpId) {
            const frpId = req.body.frpId;

            await client.query(`
                UPDATE frp_request SET
                    company_id = ?, company_code = ?, company_name = ?,
                    frp_date = ?,
                    department_id = ?, department_name = ?, department_class = ?, department_code = ?,
                    job_level_name = ?, job_level_rank = ?,
                    requested_by = ?,
                    currency = ?, kurs = ?, frp_description = ?, vendor = ?,
                    internal_po_number = ?, ext_doc_type = ?, ext_doc_number = ?,
                    payment_method = ?, payment_date = ?,
                    destination_bank = ?, destination_bank_account = ?,
                    check_docs = ?,
                    created_by_user_id = ?, created_by_user_name = ?,
                    status = 'PENDING'
                WHERE id = ?
            `, [
                commonFields.company_id, commonFields.company_code, commonFields.company_name,
                commonFields.frp_date,
                commonFields.department_id, commonFields.department_name, commonFields.department_class, commonFields.department_code,
                commonFields.job_level_name, commonFields.job_level_rank,
                commonFields.requested_by,
                commonFields.currency, commonFields.kurs, commonFields.frp_description, commonFields.vendor,
                commonFields.internal_po_number, commonFields.ext_doc_type, commonFields.ext_doc_number,
                commonFields.payment_method, commonFields.payment_date,
                commonFields.destination_bank, commonFields.destination_bank_account,
                commonFields.check_docs,
                commonFields.created_by_user_id, commonFields.created_by_user_name,
                frpId,
            ]);

            await adjustBudgetUsage(client, oldItems, 'revert');
            await replaceFrpItems(client, frpId, items);
            await adjustBudgetUsage(client, items, 'deduct');

            const [rows] = await client.query('SELECT frp_no FROM frp_request WHERE id = ?', [frpId]);
            await client.commit();

            return res.json({ success: true, id: frpId, frpNo: rows.length ? rows[0].frp_no : '' });
        }

        // INSERT (new)
        const deptCode = snapshot.departmentCode || await getDeptCode(snapshot.departmentClass, snapshot.companyName);
        const prefix = `FRP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const [seqRows] = await client.query('SELECT frp_no FROM frp_request WHERE frp_no LIKE ?', [`${prefix}%`]);
        const sequences = seqRows.map(r => parseInt(String(r.frp_no || '').split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const frpNo = `${prefix}${nextSeq.toString().padStart(5, '0')}`;
        const { randomUUID } = require('crypto');
        const id = randomUUID();

        await client.query(`
            INSERT INTO frp_request (
                id, frp_no, status,
                company_id, company_code, company_name,
                frp_date,
                department_id, department_name, department_class, department_code,
                job_level_name, job_level_rank,
                requested_by,
                currency, kurs, frp_description, vendor,
                internal_po_number, ext_doc_type, ext_doc_number,
                payment_method, payment_date,
                destination_bank, destination_bank_account,
                check_docs,
                created_by, created_by_user_id, created_by_user_name, created_at,
                approved_by_actual, approved_by, approved_at
            ) VALUES (
                ?, ?, ?,
                ?, ?, ?,
                ?,
                ?, ?, ?, ?,
                ?, ?,
                ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?,
                ?, ?, ?, NOW(),
                NULL, NULL, NULL
            )
        `, [
            id, frpNo, 'PENDING',
            commonFields.company_id, commonFields.company_code, commonFields.company_name,
            commonFields.frp_date,
            commonFields.department_id, commonFields.department_name, commonFields.department_class, commonFields.department_code,
            commonFields.job_level_name, commonFields.job_level_rank,
            commonFields.requested_by,
            commonFields.currency, commonFields.kurs, commonFields.frp_description, commonFields.vendor,
            commonFields.internal_po_number, commonFields.ext_doc_type, commonFields.ext_doc_number,
            commonFields.payment_method, commonFields.payment_date,
            commonFields.destination_bank, commonFields.destination_bank_account,
            commonFields.check_docs,
            commonFields.created_by_user_name, commonFields.created_by_user_id, commonFields.created_by_user_name,
        ]);

        await replaceFrpItems(client, id, items);
        await adjustBudgetUsage(client, items, 'deduct');

        if (req.body.fromRpId) {
            await client.query('UPDATE rp_request SET status = ? WHERE id = ?', ['CREATED_FRP', req.body.fromRpId]);
        }

        await client.commit();
        res.json({ success: true, id, frpNo });
    } catch (e) {
        await client.rollback();
        console.error('Error saving FRP:', e);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        client.release();
    }
});

// ============================================================
// FRP — ACTIONS (approve / reject / delete / revert)
// ============================================================

router.post('/api/frp/:id/:action', checkAuth, async (req, res) => {
    try {
        const { action, id: frpId } = req.params;
        const u = req.session.user;
        let frpApprovalTarget = null;

        if (action === 'approve' || action === 'reject') {
            const [rows] = await db.query(`
                SELECT company_id, company_code, company_name,
                       department_id, department_name, department_class, department_code
                FROM frp_request
                WHERE id = ?
            `, [frpId]);

            if (!rows.length) {
                return res.status(404).json({ success: false, error: 'FRP tidak ditemukan' });
            }

            frpApprovalTarget = rows[0];

            if (!canApproveFrpRequest(u, frpApprovalTarget)) {
                return res.status(403).json({
                    success: false,
                    error: 'Anda tidak memiliki akses approval untuk FRP dari divisi ini',
                });
            }
        }

        if (action === 'approve') {
            let approvedBy = u.fullName;

            if (frpApprovalTarget) {
                const r = frpApprovalTarget;
                const params = [r.department_name || '', r.department_class || ''];
                let sql = USER_SQL + ' AND (md.name = ? OR md.class = ?) AND mjl.level >= 4';
                if (r.company_code) {
                    sql += ' AND mc.code = ?';
                    params.push(normalizeCompanyCode(r.company_code));
                }
                sql += ' ORDER BY mjl.level DESC LIMIT 1';

                const [mgrRows] = await centralDb.query(sql, params);
                if (mgrRows.length) approvedBy = mgrRows[0].name;
            }

            await db.query(`
                UPDATE frp_request
                SET status = 'APPROVED', approved_by_actual = ?, approved_at = NOW(), approved_by = ?
                WHERE id = ?
            `, [u.fullName, approvedBy, frpId]);

        } else if (action === 'reject') {
            await db.query(`UPDATE frp_request SET status = 'REJECTED' WHERE id = ?`, [frpId]);

        } else if (action === 'delete') {
            await db.query(`DELETE FROM frp_request WHERE id = ?`, [frpId]);

        } else if (action === 'revert') {
            const [frpRows] = await db.query('SELECT department_class FROM frp_request WHERE id = ?', [frpId]);

            if (!frpRows.length) {
                return res.status(404).json({ success: false, error: 'FRP tidak ditemukan' });
            }

            const frpDeptClass = frpRows[0].department_class;
            const userDivisions = getUserScopedDivisions(u, u.selectedCompany || u.companyName || u.company);
            const isIT = userDivisions.includes('IT');
            const isOwnDivision = hasUserDivisionAccess(u, frpDeptClass, u.selectedCompany || u.companyName || u.company);
            const canRevert = u.role === 'administrator' || isIT || (Number(u.jobLevelRank || 0) >= 3 && isOwnDivision);

            if (!canRevert) {
                return res.status(403).json({
                    success: false,
                    error: 'Hanya IT, atau supervisor/manager divisi terkait yang bisa melakukan revert',
                });
            }

            await db.query(`
                UPDATE frp_request
                SET status = 'PENDING', approved_by_actual = NULL, approved_at = NULL, approved_by = NULL
                WHERE id = ?
            `, [frpId]);
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Error action FRP:', e);
        res.json({ success: false, error: e.message });
    }
});

module.exports = router;
