const express = require('express');
const { checkAuth } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const { getAllEmployees, getCompanies, getDepartmentRows, getDeptCode, getCompanyId, getDeptId, fetchAllFrpRequests, fetchAllRpRequests } = require('../services/dbService');
const { sameCompanyName } = require('../utils/company');
const { getUserScopedDivisions, hasUserDivisionAccess, canUserViewRpProcessDivision, isStaffScopedUser } = require('../middleware/scope');
const db = require('../../db');
const crypto = require('crypto');

const router = express.Router();

function getRpSnapshotFromUser(user) {
    return {
        companyId: user.companyId || null,
        companyCode: user.companyCode || '',
        companyName: user.companyName || user.selectedCompany || '',

        departmentId: user.departmentId || null,
        departmentName: user.departmentName || '',
        departmentClass: user.departmentClass || user.selectedDivision || '',
        departmentCode: user.departmentCode || '',

        jobLevelId: user.jobLevelId || null,
        jobLevelName: user.jobLevelName || user.selectedJobLevel || '',
        jobLevelRank: user.jobLevelRank || null,

        createdByUserId: user.id || null,
        createdByUserName: user.fullName || user.name || user.username || '',
    };
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
    const requestedClass = body.classClass || body.class || body.departmentClass || body.kelas || '';
    const requestedName = body.className || body.divisi || body.departmentName || '';
    const requestedId = body.classId || body.departmentId || '';
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
        departmentCode: body.classCode || body.departmentCode || match?.dept_code || match?.departmentCode || match?.department_code || baseSnapshot.departmentCode,
        jobLevelName: match?.jobLevel || match?.job_level_name || baseSnapshot.jobLevelName,
        jobLevelRank: match?.jobLevelRank || match?.job_level_rank || baseSnapshot.jobLevelRank,
    };
}

function normalizeRpItems(items = []) {
    return Array.isArray(items)
        ? items.map(item => ({
            id: item.id || crypto.randomUUID(),
            budgetId: item.budgetId || item.budget_id || null,
            memo: item.memo || '',
            link_item: item.link_item || item.linkPembelian || item.linkItem || '',
            qty: Number(item.qty || 0),
            price: Number(item.price || item.estimatedValue || 0),
            amount: Number(item.amount || (Number(item.qty || 0) * Number(item.price || item.estimatedValue || 0)) || 0),
        }))
        : [];
}

async function replaceRpItems(client, rpRequestId, items) {
    await client.query(
        'DELETE FROM items_rp WHERE rp_request_id = ?',
        [rpRequestId]
    );

    for (const item of items) {
        await client.query(`
            INSERT INTO items_rp (
                id,
                rp_request_id,
                budget_id,
                memo,
                link_item,
                qty,
                price,
                amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            item.id,
            rpRequestId,
            item.budgetId,
            item.memo,
            item.link_item,
            item.qty,
            item.price,
            item.amount,
        ]);
    }
}

function normText(value) {
    return String(value || '').trim().toUpperCase();
}

function getUserDepartmentScopes(user) {
    const scopes = [];

    // root / selected department
    scopes.push({
        id: user.departmentId,
        name: user.departmentName,
        class: user.departmentClass || user.selectedDivision,
        code: user.departmentCode,
    });

    // all assignments / multi department
    (user.allAssignments || []).forEach(a => {
        scopes.push({
            id: a.department_id || a.departmentId || a.dept_id || a.id,
            name: a.dept_name || a.departmentName || a.department_name || a.name,
            class: a.dept_class || a.departmentClass || a.department_class || a.class,
            code: a.dept_code || a.departmentCode || a.department_code || a.code,
        });

        // kalau classes array ada, masukkan juga
        (a.classes || []).forEach(cls => {
            scopes.push({
                id: a.department_id || a.departmentId || a.dept_id,
                name: a.dept_name || a.departmentName || a.department_name,
                class: cls,
                code: a.dept_code || a.departmentCode || a.department_code,
            });
        });
    });

    return scopes.filter(s =>
        s.id || s.name || s.class || s.code
    );
}

function isBudgetInUserDepartments(budget, user) {
    const scopes = getUserDepartmentScopes(user);

    const bId = String(budget.department_id || '');
    const bName = normText(budget.department_name);
    const bClass = normText(budget.department_class);
    const bCode = normText(budget.department_code);

    return scopes.some(scope => {
        const sId = String(scope.id || '');
        const sName = normText(scope.name);
        const sClass = normText(scope.class);
        const sCode = normText(scope.code);

        if (sId && bId && sId === bId) return true;
        if (sClass && (sClass === bClass || sClass === bName)) return true;
        if (sName && (sName === bName || sName === bClass)) return true;
        if (sCode && bCode && sCode === bCode) return true;

        return false;
    });
}

async function userHasCrossBudgetPolicy(client, moduleName, user) {
    if (user.role === 'administrator') return true;

    const scopes = getUserDepartmentScopes(user);
    const departmentClasses = [...new Set(
        scopes
            .map(s => s.class)
            .filter(Boolean)
    )];

    if (!departmentClasses.length) return false;

    const [rows] = await client.query(`
        SELECT 1
        FROM budget_access_policies
        WHERE module = ?
          AND flow = 'CREATE'
          AND department_class IN (?)
          AND can_cross_department_budget = 1
          AND is_active = 1
        LIMIT 1
    `, [moduleName, departmentClasses]);

    return rows.length > 0;
}

async function userRequiresBudgetCheck(client, moduleName, user) {
    const scopes = getUserDepartmentScopes(user);
    const departmentClasses = [...new Set(
        scopes
            .map(s => s.class)
            .filter(Boolean)
    )];

    if (!departmentClasses.length) return true;

    const [rows] = await client.query(`
        SELECT requires_budget_check
        FROM budget_access_policies
        WHERE module = ?
          AND flow = 'CREATE'
          AND department_class IN (?)
          AND is_active = 1
    `, [moduleName, departmentClasses]);

    // default aman: kalau tidak ada policy, tetap check budget
    if (!rows.length) return true;

    // kalau ada salah satu policy requires check, tetap check
    return rows.some(r => Number(r.requires_budget_check) === 1);
}

async function getBudgetAccessPolicy(client, moduleName, user) {
    const departmentClass = String(
        user.departmentClass ||
        user.selectedDivision ||
        user.departmentName ||
        ''
    ).trim();

    const [rows] = await client.query(`
        SELECT
            can_cross_department_budget,
            requires_budget_check
        FROM budget_access_policies
        WHERE module = ?
          AND flow = 'CREATE'
          AND department_class = ?
          AND is_active = 1
        LIMIT 1
    `, [moduleName, departmentClass]);

    if (!rows.length) {
        return {
            canCrossDepartmentBudget: false,
            requiresBudgetCheck: true,
        };
    }

    return {
        canCrossDepartmentBudget: Number(rows[0].can_cross_department_budget) === 1,
        requiresBudgetCheck: Number(rows[0].requires_budget_check) === 1,
    };
}

async function validateRpBudgetAccess(client, user, items) {
    const requiresBudgetCheck = await userRequiresBudgetCheck(client, 'RP', user);
    const canCrossDepartmentBudget = await userHasCrossBudgetPolicy(client, 'RP', user);

    if (!requiresBudgetCheck) return;

    const budgetIds = [...new Set(items.map(item => item.budgetId).filter(Boolean))];

    if (!budgetIds.length) return;

    const [budgets] = await client.query(`
        SELECT
            id,
            department_id,
            department_name,
            department_class,
            department_code,
            budget_remaining,
            is_active
        FROM master_budgets
        WHERE id IN (?)
    `, [budgetIds]);

    const foundBudgetIds = new Set(budgets.map(b => b.id));
    const missingBudgetIds = budgetIds.filter(id => !foundBudgetIds.has(id));

    if (missingBudgetIds.length) {
        const error = new Error(`Budget not found: ${missingBudgetIds.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const inactiveBudgets = budgets.filter(b => Number(b.is_active) !== 1);

    if (inactiveBudgets.length) {
        const error = new Error(`Inactive budget: ${inactiveBudgets.map(b => b.id).join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    if (!canCrossDepartmentBudget && user.role !== 'administrator') {
        const invalidBudgets = budgets.filter(b => !isBudgetInUserDepartments(b, user));

        if (invalidBudgets.length) {
            const error = new Error(
                `You are not allowed to use budget from another department: ${invalidBudgets.map(b => b.id).join(', ')}`
            );
            error.statusCode = 403;
            throw error;
        }
    }

    const amountByBudgetId = items.reduce((acc, item) => {
        if (!item.budgetId) return acc;
        acc[item.budgetId] = (acc[item.budgetId] || 0) + Number(item.amount || 0);
        return acc;
    }, {});

    const overBudgetItems = budgets.filter(b => {
        const requestedAmount = Number(amountByBudgetId[b.id] || 0);
        const remaining = Number(b.budget_remaining || 0);
        return requestedAmount > remaining;
    });

    if (overBudgetItems.length) {
        const error = new Error(
            `Budget remaining is not enough: ${overBudgetItems.map(b => b.id).join(', ')}`
        );
        error.statusCode = 400;
        throw error;
    }
}



async function getVendorsFromDb() {
    const [rows] = await db.query(
        'SELECT id, name, bank, no_rekening FROM master_vendor ORDER BY name ASC'
    );
    return rows.map(r => ({
        id:          r.id,
        name:        r.name        || '',
        bank:        r.bank        || '',
        no_rekening: r.no_rekening || '',
    }));
}

// ============================================================
// RP PAGES
// ============================================================

router.get('/rp', checkAuth, (req, res) => res.sendSPA());

// Short flow = only IT & HCGA: manager-approve goes directly to 'approved'
// All other departments must go through division_review → final_review → approved
const SHORT_FLOW_DEPARTMENTS = ['IT', 'HCGA', 'IT & HCGA'];

function isShortFlowDepartmentClass(departmentClass) {
    const normalizedDepartmentClass = String(departmentClass || '').trim().toUpperCase();

    return SHORT_FLOW_DEPARTMENTS.some(
        d => d.toUpperCase() === normalizedDepartmentClass
    );
}

function isShortFlowDepartment(client, user) {
    return isShortFlowDepartmentClass(
        user.departmentClass || user.selectedDivision || ''
    );
}

async function getRpLookScope(user) {
    if (user.role === 'administrator') return 'all';

    const departmentClasses = getUserScopedDivisions(
        user,
        user.selectedCompany || user.companyName || user.company || ''
    );

    if (!departmentClasses.length) return 'own';

    const [rows] = await db.query(`
        SELECT 1 FROM budget_access_policies
        WHERE module = 'RP'
          AND flow = 'LOOK'
          AND department_class IN (?)
          AND is_active = 1
        LIMIT 1
    `, [departmentClasses]);

    if (rows.length > 0) return 'processor';
    return 'own';
}

function enrichRpWithRevert(r, u) {
    const isAdmin = u.role === 'administrator';
    const rank = Number(u.jobLevelRank || 0);
    const companyName = r.companyName || r.company_name || '';
    const requesterDivision = r.divisi || r.departmentClass || r.department_name || '';
    const processDivision = r.diprosesOleh || r.processedByDepartment || requesterDivision;
    const isShortFlow = isShortFlowDepartmentClass(requesterDivision);

    // Revert dari waiting_manager → tidak ada (manager approve/reject langsung)
    
    // Revert dari division_review → waiting_manager
    // oleh: admin, atau rank >= 1 dari processor department
    const canRevertDivisionReview =
        r.status === 'division_review' &&
        (isAdmin || (rank >= 1 && hasUserDivisionAccess(u, processDivision, companyName)));

    // Revert dari final_review → division_review  
    // oleh: admin, atau rank >= 1 dari processor department
    const canRevertFinalReview =
        r.status === 'final_review' &&
        (isAdmin || (rank >= 1 && hasUserDivisionAccess(u, processDivision, companyName)));

    // Revert dari approved → waiting_manager
    // oleh: admin, atau rank >= 1 dari department terkait (IT/HCGA short flow: dept requester, 4-step: processor dept)
    const canRevertApproved =
        r.status === 'approved' &&
        (isAdmin || (
            rank >= 1 &&
            hasUserDivisionAccess(
                u,
                isShortFlow ? requesterDivision : processDivision,
                companyName
            )
        ));

    return {
        ...r,
        canRevert: canRevertDivisionReview || canRevertFinalReview || canRevertApproved,
        canRevertTo: canRevertApproved ? 'waiting_manager'
            : canRevertFinalReview ? 'division_review'
            : canRevertDivisionReview ? 'waiting_manager'
            : null,
    };
}

async function hasRpBudgetPolicy(client, user) {
    const departmentClasses = getUserScopedDivisions(
        user,
        user.selectedCompany || user.companyName || user.company || ''
    );

    if (!departmentClasses.length) return false;

    const [rows] = await client.query(`
        SELECT id
        FROM budget_access_policies
        WHERE module = 'RP'
          AND flow = 'CREATE'
          AND department_class IN (?)
          AND can_cross_department_budget = 1
          AND is_active = 1
        LIMIT 1
    `, [departmentClasses]);

    return rows.length > 0;
}


router.get('/rp-approval', checkAuth, (req, res) => res.sendSPA());
router.get('/rp-approved', checkAuth, (req, res) => res.sendSPA());
router.get('/rp/:id', checkAuth, (req, res) => res.sendSPA());

// ============================================================
// RP LOOKUP ENDPOINTS
// ============================================================

// GET /api/rp/budgets
// Mengembalikan budget dengan remaining dihitung dari FRP + RP approved
router.get('/api/rp/budgets', checkAuth, async (req, res) => {
    try {
        const [departmentsData, companiesData, rpRequests, frpRequests] = await Promise.all([
            getDepartmentRows(),
            getCompanies(),
            fetchAllRpRequests(),
            fetchAllFrpRequests(),
        ]);

        const [budgetsRows] = await db.query(`
            SELECT id, department_id, department_name, department_class, department_code,
                   project_name, budget_type, budget_amount, budget_used, budget_remaining
            FROM master_budgets
        `);

        const usedBudgets = {};
        frpRequests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[item.budgetId] = (usedBudgets[item.budgetId] || 0) + amt;
                });
            }
        });
        rpRequests.forEach(r => {
            if (r.status === 'approved' && r.items) {
                r.items.forEach(item => {
                    const amt = parseFloat(String(item.estimatedValue || '0').replace(/[^0-9.-]/g, '')) || 0;
                    usedBudgets[item.budgetId] = (usedBudgets[item.budgetId] || 0) + amt * (parseFloat(item.qty) || 1);
                });
            }
        });

        const budgets = budgetsRows.map(row => {
            const dept    = departmentsData.find(d => String(d.id) === String(row.department_id));
            const company = companiesData.find(c => String(c.id) === String(dept?.companyId));
            return {
                id:              row.id,
                department_id:   row.department_id,
                department:      row.department_name || (dept?.name ?? ''),
                class:           row.department_class || (dept?.class ?? ''),
                description:     row.project_name || '',
                type:            row.budget_type || '',
                company:         company ? (company.name || company.code) : 'PT PILAR NIAGA MAKMUR',
                totalAmount:     Number(row.budget_amount || 0),
                remainingAmount: Number(row.budget_amount || 0) - (usedBudgets[row.id] || 0),
            };
        });

        res.json(budgets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// RP FORM DATA
// ============================================================

router.get('/api/rp/form-options', checkAuth, async (req, res) => {
    // alias — same handler as /api/rp/form-data
    return rpFormData(req, res);
});

router.get('/api/rp/form-data', checkAuth, async (req, res) => {
    return rpFormData(req, res);
});

async function rpFormData(req, res) {
    try {
        const u = req.session.user;

        // Fetch all raw data in parallel
        const [
            departmentsData, companiesData, vendorsData,
            rpRequests, frpRequests,
            [budgetsRows], [processorRows], [crossBudgetRows],
        ] = await Promise.all([
            getDepartmentRows(),
            getCompanies(),
            getVendorsFromDb(),
            fetchAllRpRequests(),
            fetchAllFrpRequests(),
            db.query(`SELECT id, department_id, department_name, department_class,
                      project_name, budget_type, budget_amount FROM master_budgets`),
            db.query(`SELECT DISTINCT department_class FROM budget_access_policies
                      WHERE module = 'RP' AND flow = 'PROCESS' AND is_active = 1`),
            db.query(`SELECT DISTINCT department_class FROM budget_access_policies
                      WHERE module = 'RP' AND flow = 'CREATE'
                        AND can_cross_department_budget = 1 AND is_active = 1`),
        ]);

        // Divisions that can use any company budget
        const crossBudgetSet = new Set(
            crossBudgetRows.map(r => (r.department_class || '').trim().toUpperCase()).filter(Boolean)
        );
        const processorDepts = processorRows.map(r => r.department_class).filter(Boolean);

        // Compute used budgets from approved FRP + RP
        const usedBudgets = {};
        frpRequests.forEach(r => {
            if (r.status === 'APPROVED' && r.items) {
                r.items.forEach(item => {
                    const amt = parseInt(String(item.amount || '0').replace(/[^0-9]/g, ''), 10) || 0;
                    usedBudgets[item.budgetId] = (usedBudgets[item.budgetId] || 0) + amt;
                });
            }
        });
        rpRequests.forEach(r => {
            if (r.status === 'approved' && r.items) {
                r.items.forEach(item => {
                    const amt = parseFloat(String(item.estimatedValue || '0').replace(/[^0-9.-]/g, '')) || 0;
                    usedBudgets[item.budgetId] = (usedBudgets[item.budgetId] || 0) + amt * (parseFloat(item.qty) || 1);
                });
            }
        });

        // Build fully-shaped budget list with remaining amount
        const allBudgets = budgetsRows.map(row => {
            const dept    = departmentsData.find(d => String(d.id) === String(row.department_id));
            const company = companiesData.find(c => String(c.id) === String(dept?.companyId));
            return {
                id:              row.id,
                department_id:   row.department_id,
                department:      row.department_name || dept?.name || '',
                class:           row.department_class || dept?.class || '',
                description:     row.project_name || '',
                type:            row.budget_type || '',
                company:         company ? (company.name || company.code) : 'PT PILAR NIAGA MAKMUR',
                totalAmount:     Number(row.budget_amount || 0),
                remainingAmount: Number(row.budget_amount || 0) - (usedBudgets[row.id] || 0),
            };
        });

        // Shape + annotate departments with canCrossBudget flag
        const allDepts = departmentsData.map(d => ({
            originalIndex:  d.originalIndex,
            value:          d.originalIndex,
            name:           d.name || '',
            class:          d.class || '',
            label:          d.class ? `${d.name} - ${d.class}` : (d.name || ''),
            company:        d.company || '',
            companyCode:    d.companyCode || '',
            canCrossBudget: crossBudgetSet.has((d.class || '').trim().toUpperCase()) ||
                            crossBudgetSet.has((d.name  || '').trim().toUpperCase()),
        })).sort((a, b) => a.label.localeCompare(b.label));

        // Filter departments to user-accessible ones (non-admins)
        let departments;
        if (u.role === 'administrator') {
            departments = allDepts;
        } else {
            const scopes     = getUserDepartmentScopes(u);
            const allowedIds = new Set(scopes.map(s => String(s.id || '')).filter(Boolean));
            const allowedNm  = new Set(
                scopes.flatMap(s => [s.name, s.class].filter(Boolean)).map(n => n.trim().toUpperCase())
            );
            const filtered = allDepts.filter(d => {
                const dId  = String(d.originalIndex || '');
                const dNm  = (d.name  || '').trim().toUpperCase();
                const dCls = (d.class || '').trim().toUpperCase();
                return allowedIds.has(dId) || allowedNm.has(dNm) || allowedNm.has(dCls);
            });
            departments = filtered.length > 0 ? filtered : allDepts;
        }

        // Filter budgets to user-accessible ones (non-admins)
        let budgets;
        if (u.role === 'administrator') {
            budgets = allBudgets;
        } else {
            budgets = allBudgets.filter(b => {
                // Budgets belonging to a cross-budget division are visible to everyone
                const bClass = (b.class      || '').trim().toUpperCase();
                const bDept  = (b.department || '').trim().toUpperCase();
                if (crossBudgetSet.has(bClass) || crossBudgetSet.has(bDept)) return true;
                // Check user's direct department scope
                return isBudgetInUserDepartments(
                    { department_id: b.department_id, department_name: b.department,
                      department_class: b.class, department_code: '' },
                    u
                );
            });
        }

        // User-accessible companies (shaped as { value, label })
        let companies;
        if (u.role === 'administrator') {
            companies = [...new Set(companiesData.map(c => c.name || c.code).filter(Boolean))].sort()
                        .map(n => ({ value: n, label: n }));
        } else {
            const accessible = new Set();
            if (u.selectedCompany) accessible.add(u.selectedCompany.trim());
            (u.allAssignments || []).forEach(a => {
                if (a.name) accessible.add(a.name.trim());
            });
            budgets.forEach(b => { if (b.company) accessible.add(b.company.trim()); });

            companies = [...accessible].filter(Boolean).sort().map(n => ({ value: n, label: n }));
        }

        // Edit data for revisi / process mode
        let editData = null;
        if (req.query.revisi) {
            editData = rpRequests.find(r => String(r.id) === String(req.query.revisi)) || null;
        } else if (req.query.process) {
            editData = rpRequests.find(r => String(r.id) === String(req.query.process)) || null;
        }

        res.json({
            departments,
            companies,
            budgets,
            vendors: vendorsData,
            processorDepts,
            editData,
            user: {
                ...u,
                selectedCompany:  u.selectedCompany  || '',
                selectedDivision: u.selectedDivision || '',
                selectedJobLevel: u.selectedJobLevel || '',
            },
            selectedCompany:  u.selectedCompany  || '',
            selectedDivision: u.selectedDivision || '',
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// ============================================================
// RP NUMBER
// ============================================================

router.get('/api/rp/next-number/:department', checkAuth, async (req, res) => {
    try {
        const rpRequests = await fetchAllRpRequests();
        const dept = (req.params.department || '').trim().toUpperCase();
        const deptCode = await getDeptCode(dept, req.query.company || req.session.user.selectedCompany);
        const prefix = `RP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;
        const sequences = rpRequests
            .filter(r => r.rpNo && r.rpNo.startsWith(prefix))
            .map(r => parseInt(r.rpNo.split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        res.json({ rpNo: `${prefix}${nextSeq.toString().padStart(5, '0')}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/rp/processor-departments', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT department_class, department_name
            FROM budget_access_policies
            WHERE module = 'RP'
              AND flow = 'PROCESS'
              AND is_active = 1
        `);
        res.json(rows.map(r => r.department_class).filter(Boolean));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/rp/cross-budget-divisions', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT department_class
            FROM budget_access_policies
            WHERE module = 'RP'
              AND flow = 'CREATE'
              AND can_cross_department_budget = 1
              AND is_active = 1
        `);
        res.json(rows.map(r => r.department_class).filter(Boolean));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// RP SAVE
// ============================================================

router.post('/api/rp/save', checkAuth, async (req, res) => {
    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        const u = req.session.user;
        const snapshot = resolveRequestDepartmentSnapshot(getRpSnapshotFromUser(u), u, req.body);
        const items = normalizeRpItems(req.body.items || []);

        await validateRpBudgetAccess(client, u, items);

        const creatorCanProcessRp = await hasRpBudgetPolicy(client, u);
        const initialStatus = 'waiting_manager';

        const requestedBy = req.body.requestedBy || snapshot.createdByUserName;
        const purchaseCategory = req.body.purchaseCategory || '';
        const description = req.body.description || '';
        const processedByDepartment = req.body.processedByDepartment || '';
        const requiredDate = req.body.requiredDate || null;
        const vendorSuggestion = req.body.vendorSuggestion || '';
        const receiverPic = req.body.receiverPic || '';

        if (!creatorCanProcessRp && !processedByDepartment) {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: 'processedByDepartment is required for non IT/HCGA requester',
            });
        }

        if (
            !creatorCanProcessRp &&
            !(await isAllowedRpProcessorDepartment(client, processedByDepartment))
        ) {
            await client.rollback();
            return res.status(400).json({
                success: false,
                error: `processedByDepartment is not allowed: ${processedByDepartment}`,
            });
        }

        const classId = req.body.classId || snapshot.departmentId;
        const className = req.body.className || snapshot.departmentName;
        const classClass = req.body.classClass || snapshot.departmentClass;
        const classCode = req.body.classCode || snapshot.departmentCode;

        if (req.body.rpId) {
            const rpId = req.body.rpId;

            const [existingRows] = await client.query(
                'SELECT id, rp_no FROM rp_request WHERE id = ? LIMIT 1',
                [rpId]
            );

            if (!existingRows.length) {
                await client.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'RP not found for revision',
                });
            }

            await client.query(`
                UPDATE rp_request SET
                    status = ?,

                    company_id = ?,
                    company_code = ?,
                    company_name = ?,

                    department_id = ?,
                    department_name = ?,
                    department_class = ?,
                    department_code = ?,

                    class_id = ?,
                    class_name = ?,
                    class_class = ?,
                    class_code = ?,

                    job_level_name = ?,
                    job_level_rank = ?,

                    requested_by = ?,
                    purchase_category = ?,
                    description = ?,
                    processed_by_department = ?,
                    required_date = ?,
                    vendor_suggestion = ?,
                    receiver_pic = ?,

                    created_by_user_id = ?,
                    created_by_user_name = ?
                WHERE id = ?
            `, [
                initialStatus,

                snapshot.companyId,
                snapshot.companyCode,
                snapshot.companyName,

                snapshot.departmentId,
                snapshot.departmentName,
                snapshot.departmentClass,
                snapshot.departmentCode,

                classId,
                className,
                classClass,
                classCode,

                snapshot.jobLevelName,
                snapshot.jobLevelRank,

                requestedBy,
                purchaseCategory,
                description,
                processedByDepartment,
                requiredDate,
                vendorSuggestion,
                receiverPic,

                snapshot.createdByUserId,
                snapshot.createdByUserName,

                rpId,
            ]);

            await replaceRpItems(client, rpId, items);

            await client.commit();

            return res.json({
                success: true,
                rpNo: existingRows[0].rp_no,
                id: rpId,
            });
        }

        const id = crypto.randomUUID();

        const deptCode = snapshot.departmentCode || 'RP';
        const prefix = `RP-${deptCode}-${new Date().getFullYear().toString().slice(-2)}-`;

        const [seqRows] = await client.query(
            'SELECT rp_no FROM rp_request WHERE rp_no LIKE ?',
            [`${prefix}%`]
        );

        const sequences = seqRows.map(r => parseInt(String(r.rp_no || '').split('-').pop(), 10) || 0);
        const nextSeq = Math.max(0, ...sequences) + 1;
        const rpNo = req.body.rpNo || `${prefix}${nextSeq.toString().padStart(5, '0')}`;

        await client.query(`
            INSERT INTO rp_request (
                id,
                rp_no,
                status,

                company_id,
                company_code,
                company_name,

                department_id,
                department_name,
                department_class,
                department_code,

                class_id,
                class_name,
                class_class,
                class_code,

                job_level_name,
                job_level_rank,

                requested_by,
                purchase_category,
                description,
                processed_by_department,
                required_date,
                vendor_suggestion,
                receiver_pic,

                created_at,
                created_by,
                created_by_user_id,
                created_by_user_name,

                manager_approved_by,
                manager_approved_at,
                process_changes,
                process_updated_by,
                process_updated_at,
                process_manager_approved_by,
                process_manager_approved_at,
                rejected_by,
                rejected_at,
                rejected_reason,
                rejected_stage
            ) VALUES (
                ?, ?, ?,

                ?, ?, ?,

                ?, ?, ?, ?,

                ?, ?, ?, ?,

                ?, ?,

                ?, ?, ?, ?, ?, ?, ?,

                NOW(), ?, ?, ?,

                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        `, [
            id,
            rpNo,
            initialStatus,

            snapshot.companyId,
            snapshot.companyCode,
            snapshot.companyName,

            snapshot.departmentId,
            snapshot.departmentName,
            snapshot.departmentClass,
            snapshot.departmentCode,

            classId,
            className,
            classClass,
            classCode,

            snapshot.jobLevelName,
            snapshot.jobLevelRank,

            requestedBy,
            purchaseCategory,
            description,
            processedByDepartment,
            requiredDate,
            vendorSuggestion,
            receiverPic,

            snapshot.createdByUserName,
            snapshot.createdByUserId,
            snapshot.createdByUserName,
        ]);

        await replaceRpItems(client, id, items);

        await client.commit();

        res.json({ success: true, rpNo, id });
    } catch (e) {
        await client.rollback();
        console.error('Error saving RP:', e);

        res.status(e.statusCode || 500).json({
            success: false,
            error: e.message,
        });
    } finally {
        client.release();
    }
});

// ============================================================
// RP APPROVAL DATA
// ============================================================

// GET /api/data/rp-approval
// Query params:
//   view=pending|approved|process|process-approval|all
//   search, status, division  — filter
//   sortBy=date|requester|division|status, sortDir=asc|desc
//   page=1, limit=10
router.get('/api/data/rp-approval', checkAuth, async (req, res) => {
    const u = req.session.user;
    const view = req.query.view || 'pending';
    const selectedOnlyScope = isStaffScopedUser(u);

    const search    = (req.query.search    || '').toLowerCase().trim();
    const status    = (req.query.status    || '').trim();
    const division  = (req.query.division  || '').trim();
    const creator   = (req.query.creator   || '').trim();
    const processor = (req.query.processor || '').trim();
    const date      = (req.query.date      || '').trim();
    const page      = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit     = Math.max(1, Math.min(200, parseInt(req.query.limit || '10', 10)));
    const sortBy    = req.query.sortBy  || 'date';
    const sortDir   = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    let reqs = await fetchAllRpRequests();
    const lookScope = await getRpLookScope(u);
    const hasOwnDivisionScope = (request) => (
        sameCompanyName(request.companyName, u.selectedCompany || u.companyName) &&
        hasUserDivisionAccess(
            u,
            request.divisi || request.departmentClass,
            request.companyName,
            { selectedOnly: selectedOnlyScope }
        )
    );
    const hasProcessorScope = (request) => (
        sameCompanyName(request.companyName, u.selectedCompany || u.companyName) &&
        canUserViewRpProcessDivision(
            u,
            request.diprosesOleh || request.processedByDepartment || request.divisi,
            request.companyName,
            { selectedOnly: selectedOnlyScope }
        )
    );
    const isPendingScope = request =>
        u.role === 'administrator' ||
        hasOwnDivisionScope(request) ||
        (lookScope === 'processor' && hasProcessorScope(request));
    const isProcessorStageScope = request =>
        u.role === 'administrator' ||
        (lookScope === 'processor' ? hasProcessorScope(request) : hasOwnDivisionScope(request));
    const isApprovedScope = request =>
        u.role === 'administrator' ||
        (lookScope === 'processor' ? hasProcessorScope(request) : hasOwnDivisionScope(request));

    // badge counts (sebelum view filter)
    const pendingCount         = reqs.filter(r => r.status === 'waiting_manager' && isPendingScope(r)).length;
    const processCount         = reqs.filter(r => r.status === 'division_review' && isProcessorStageScope(r)).length;
    const processApprovalCount = reqs.filter(r => r.status === 'final_review' && isProcessorStageScope(r)).length;
    const approvedCount        = reqs.filter(r =>
        ['approved', 'REJECTED', 'CREATED_FRP'].includes(r.status) && isApprovedScope(r)
    ).length;

    // view filter
    if (view === 'approved') {
        reqs = reqs.filter(r => ['approved', 'REJECTED', 'CREATED_FRP'].includes(r.status));
        if (u.role !== 'administrator') reqs = reqs.filter(r => isApprovedScope(r));
    } else if (view === 'process') {
        reqs = reqs.filter(r => r.status === 'division_review');
        if (u.role !== 'administrator') reqs = reqs.filter(r => isProcessorStageScope(r));
    } else if (view === 'process-approval') {
        reqs = reqs.filter(r => r.status === 'final_review');
        if (u.role !== 'administrator') reqs = reqs.filter(r => isProcessorStageScope(r));
    } else if (view === 'all') {
        if (u.role !== 'administrator') reqs = reqs.filter(r => isApprovedScope(r));
    } else {
        reqs = reqs.filter(r => r.status === 'waiting_manager');
        if (u.role !== 'administrator') reqs = reqs.filter(r => isPendingScope(r));
    }

    // enrich + total per request
    const getRpTotal = r => Array.isArray(r.items)
        ? r.items.reduce((s, it) => s + (parseFloat(it.estimatedValue || 0) * (parseFloat(it.qty) || 1)), 0)
        : 0;

    reqs = reqs.map(r => ({ ...enrichRpWithRevert(r, u), total: getRpTotal(r) }));

    // filter options (sebelum search filter)
    const filterOptions = {
        divisions:  [...new Set(reqs.map(r => r.departmentName || r.departmentClass || r.divisi).filter(Boolean))].sort(),
        statuses:   [...new Set(reqs.map(r => r.status).filter(Boolean))].sort(),
        creators:   [...new Set(reqs.map(r => r.dibuatOleh).filter(Boolean))].sort(),
        processors: [...new Set(reqs.map(r => r.diprosesOleh).filter(Boolean))].sort(),
    };

    // apply filters
    if (search) {
        reqs = reqs.filter(r =>
            (r.rpNo         || '').toLowerCase().includes(search) ||
            (r.dibuatOleh   || '').toLowerCase().includes(search) ||
            (r.divisi       || '').toLowerCase().includes(search) ||
            (r.diprosesOleh || '').toLowerCase().includes(search) ||
            (r.status       || '').toLowerCase().includes(search) ||
            (r.items || []).some(i => (i.memo || '').toLowerCase().includes(search))
        );
    }
    if (status)    reqs = reqs.filter(r => r.status === status);
    if (division)  reqs = reqs.filter(r =>
        (r.departmentName || r.departmentClass || r.divisi || '') === division
    );
    if (creator)   reqs = reqs.filter(r => (r.dibuatOleh   || '') === creator);
    if (processor) reqs = reqs.filter(r => (r.diprosesOleh || '') === processor);
    if (date)      reqs = reqs.filter(r => r.createdAt && r.createdAt.startsWith(date));

    // sort
    reqs.sort((a, b) => {
        let valA, valB;
        if (sortBy === 'date') {
            valA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id) || 0;
            valB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id) || 0;
            return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        if (sortBy === 'total') return sortDir === 'asc' ? a.total - b.total : b.total - a.total;
        const map = { requester: 'dibuatOleh', division: 'divisi', status: 'status' };
        valA = (a[map[sortBy] || 'dibuatOleh'] || '').toLowerCase();
        valB = (b[map[sortBy] || 'dibuatOleh'] || '').toLowerCase();
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ?  1 : -1;
        return 0;
    });

    // paginate
    const total      = reqs.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage   = Math.min(page, totalPages);
    const pagedRequests = reqs.slice((safePage - 1) * limit, safePage * limit);
    const requests = pagedRequests;

    const canApprove = isManagerLevel(u);

    res.json({
        requests,
        pagination:    { total, page: safePage, limit, totalPages },
        filterOptions,
        counts: {
            pending:            pendingCount,
            process:            processCount,
            'process-approval': processApprovalCount,
            approved:           approvedCount,
        },
        canApprove,
        view,
        user: {
            fullName:         u.fullName,
            role:             u.role,
            jobLevelRank:     u.jobLevelRank,
            selectedDivision: u.selectedDivision,
            selectedJobLevel: u.selectedJobLevel,
            allAssignments:   u.allAssignments || [],
        },
    });
});

// ============================================================
// RP DETAIL & ACTIONS
// ============================================================

router.get('/api/rp/:id', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        const user = req.session.user;
        const isAdmin = user.role === 'administrator';
        const canApprove = isManagerLevel(user);
        const isProcessDivision = isAdmin || user.selectedDivision === data.diprosesOleh;
        const employees = await getAllEmployees();
        const [budgetsRows] = await db.query('SELECT id, department_id, department_name, department_class, department_code, project_name, budget_type, budget_amount, budget_used, budget_remaining FROM master_budgets');
        const budgetsData = budgetsRows.map(row => ({
            id: row.id,
            company_id: null,
            companyId: null,
            department_id: row.department_id,
            departmentId: row.department_id,
            class_id: row.department_class,
            classId: row.department_class,
            class: row.department_class,
            description: row.project_name,
            type: row.budget_type,
            total_amount: Number(row.budget_amount || 0),
            totalAmount: Number(row.budget_amount || 0),
            budget_remaining: Number(row.budget_remaining || 0),
            sisa_budget: Number(row.budget_remaining || 0),
            sisaBudget: Number(row.budget_remaining || 0),
            remainingAmount: Number(row.budget_remaining || 0)
        }));
        const [companiesData, departmentsData] = await Promise.all([
            getCompanies(),
            getDepartmentRows(),
        ]);
        const mappedBudgets = budgetsData.map(b => {
            const bDepartmentId = b.department_id !== undefined ? b.department_id : b.departmentId;
            const bDept = departmentsData.find(d => String(d.id) === String(bDepartmentId));
            const bCompanyId = b.company_id || b.companyId || (bDept ? bDept.companyId : null);
            const bCompany = companiesData.find(c => String(c.id) === String(bCompanyId) || c.code === bCompanyId);
            const bClassId = b.class_id !== undefined ? b.class_id : b.classId;
            const bClass = departmentsData.find(d => String(d.id) === String(bClassId) || d.class === bClassId);
            return {
                ...b,
                company_id: bCompanyId,
                companyId: bCompanyId,
                company: bCompany ? (bCompany.name || bCompany.code) : (b.company || 'PT PILAR NIAGA MAKMUR'),
                department: bDept ? bDept.name : (b.department || ''),
                class: bClass ? bClass.class : (b.class || ''),
            };
        });

        res.json({
            data,
            employees,
            vendors: await getVendorsFromDb(),
            budgets: mappedBudgets,
            user,
            isAdmin,
            canApprove,
            isProcessDivision,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function isManagerLevel(user) {
    return Number(user.jobLevelRank || 0) >= 4;
}

function canAccessRpFinalApproval(user, rp) {
    const userJobLevelRank = Number(user.jobLevelRank || 0);
    const processDepartmentClass = String(rp?.processedByDepartment || '').trim();

    return userJobLevelRank >= 2 && hasUserDivisionAccess(
        user,
        processDepartmentClass,
        rp?.companyName || rp?.company_name || ''
    );
}

async function getAllowedRpProcessorDepartments(client) {
    const [rows] = await client.query(`
        SELECT department_class
        FROM budget_access_policies
        WHERE module = 'RP'
          AND flow = 'PROCESS'
          AND is_active = 1
    `);

    return rows.map(row => String(row.department_class || '').trim().toUpperCase());
}

async function isAllowedRpProcessorDepartment(client, departmentClass) {
    const allowedDepartments = await getAllowedRpProcessorDepartments(client);
    return allowedDepartments.includes(String(departmentClass || '').trim().toUpperCase());
}

router.post('/api/rp/:id/:action', checkAuth, async (req, res) => {
    const client = await db.getConnection();

    try {
        await client.beginTransaction();

        const rpRequests = await fetchAllRpRequests();
        const rp = rpRequests.find(r => r.id === req.params.id);

        if (!rp) {
            await client.rollback();
            return res.status(404).json({
                success: false,
                error: 'RP not found',
            });
        }

        const action = req.params.action;
        const u = req.session.user;

        const isAdmin = u.role === 'administrator';
        const userCanProcessRp = await hasRpBudgetPolicy(client, u);

        // ============================================================
        // AUTHORIZATION CHECKS
        // ============================================================

        if (!isAdmin && !sameCompanyName(rp.companyName, u.selectedCompany || u.companyName)) {
            await client.rollback();
            return res.status(403).json({
                success: false,
                error: 'Anda hanya dapat memproses data dari perusahaan Anda',
            });
        }

        // Step 2: manager department requester approval
        if (['manager-approve', 'manager-reject'].includes(action)) {
            if (!isManagerLevel(u)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Hanya user level Manager ke atas yang dapat melakukan persetujuan ini',
                });
            }

            if (!hasUserDivisionAccess(u, rp.departmentClass, rp.companyName)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Anda hanya dapat menyetujui dokumen dari department Anda sendiri',
                });
            }
        }

        // Step 3: processor department check/edit/revert/reject
        if (['process-update', 'process-direct', 'process-revert', 'process-reject'].includes(action) && !isAdmin) {
            if (!userCanProcessRp) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Department Anda tidak memiliki akses untuk memproses RP',
                });
            }

            if (!hasUserDivisionAccess(u, rp.processedByDepartment, rp.companyName)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat memproses RP untuk department ${rp.processedByDepartment}`,
                });
            }
        }

        // Step 4: processor manager final approval/revert/reject
        if (['process-manager-approve', 'process-manager-reject'].includes(action)) {
            if (!isManagerLevel(u)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Hanya user level Manager ke atas dari department pemroses yang dapat melakukan persetujuan final ini',
                });
            }

            if (!userCanProcessRp) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: 'Department Anda tidak memiliki akses approval final RP',
                });
            }

            if (!hasUserDivisionAccess(u, rp.processedByDepartment, rp.companyName)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat menyetujui RP untuk department ${rp.processedByDepartment}`,
                });
            }
        }

        // ============================================================
        // ACTION HANDLERS
        // ============================================================

        if (action === 'manager-approve') {
            if (rp.status !== 'waiting_manager') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            const rpUser = { departmentClass: rp.departmentClass, selectedDivision: rp.departmentClass };
            const shortFlow = await isShortFlowDepartment(client, rpUser);
            const nextStatus = shortFlow ? 'approved' : 'division_review';

            await client.query(`
                UPDATE rp_request
                SET
                    status = ?,
                    manager_approved_by = ?,
                    manager_approved_at = NOW()
                    ${shortFlow ? ', process_manager_approved_by = ?, process_manager_approved_at = NOW()' : ''}
                WHERE id = ?
            `, shortFlow
                ? [nextStatus, u.fullName, u.fullName, rp.id]
                : [nextStatus, u.fullName, rp.id]
            );

        } else if (action === 'manager-reject') {
            if (rp.status !== 'waiting_manager') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'REJECTED',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejected_reason = ?,
                    rejected_stage = 'manager'
                WHERE id = ?
            `, [u.fullName, req.body.reason || '', rp.id]);

        } else if (action === 'process-update') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            const changes = [];
            const headerFields = ['vendorSuggestion', 'requiredDate', 'receiverPic', 'description'];

            headerFields.forEach(field => {
                if (req.body[field] !== undefined && String(req.body[field]) !== String(rp[field] || '')) {
                    changes.push({ field, oldValue: rp[field] || '', newValue: req.body[field] });
                }
            });

            const newItems = normalizeRpItems(req.body.items || rp.items || []);
            const oldItems = rp.items || [];

            newItems.forEach((newItem, i) => {
                const oldItem = oldItems[i] || {};
                ['memo', 'qty', 'price', 'amount', 'budgetId', 'link_item'].forEach(field => {
                    if (newItem[field] !== undefined && String(newItem[field]) !== String(oldItem[field] || '')) {
                        changes.push({ field: `items[${i}].${field}`, oldValue: oldItem[field] || '', newValue: newItem[field], itemIndex: i });
                    }
                });
            });

            if (req.body.items) {
                await validateRpBudgetAccess(client, u, newItems);
                await replaceRpItems(client, rp.id, newItems);
            }

            await client.query(`
                UPDATE rp_request
                SET
                    vendor_suggestion = ?,
                    required_date = ?,
                    receiver_pic = ?,
                    description = ?,
                    process_changes = ?,
                    process_updated_by = ?,
                    process_updated_at = NOW(),
                    status = 'final_review'
                WHERE id = ?
            `, [
                req.body.vendorSuggestion !== undefined ? req.body.vendorSuggestion : rp.vendorSuggestion,
                req.body.requiredDate !== undefined ? req.body.requiredDate : rp.requiredDate,
                req.body.receiverPic !== undefined ? req.body.receiverPic : rp.receiverPic,
                req.body.description !== undefined ? req.body.description : rp.description,
                JSON.stringify({ note: req.body.note || '', changes }),
                u.fullName,
                rp.id,
            ]);

        } else if (action === 'process-direct') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    process_updated_by = ?,
                    process_updated_at = NOW(),
                    process_changes = ?,
                    status = 'final_review'
                WHERE id = ?
            `, [u.fullName, JSON.stringify({ note: req.body.note || 'RP checked without changes', changes: [] }), rp.id]);

        } else if (action === 'process-revert') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'waiting_manager',
                    manager_approved_by = NULL,
                    manager_approved_at = NULL,
                    process_changes = ?,
                    process_updated_by = ?,
                    process_updated_at = NOW()
                WHERE id = ?
            `, [
                JSON.stringify({ note: req.body.reason || 'Returned to requester department manager review', revertedBy: u.fullName, revertedFrom: 'division_review' }),
                u.fullName,
                rp.id,
            ]);

        } else if (action === 'process-reject') {
            if (rp.status !== 'division_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'REJECTED',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejected_reason = ?,
                    rejected_stage = 'process'
                WHERE id = ?
            `, [u.fullName, req.body.reason || '', rp.id]);

        } else if (action === 'process-manager-approve') {
            if (rp.status !== 'final_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            if (!canAccessRpFinalApproval(u, rp)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat final approve RP untuk department ${rp.processedByDepartment}`,
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'approved',
                    process_manager_approved_by = ?,
                    process_manager_approved_at = NOW()
                WHERE id = ?
            `, [u.fullName, rp.id]);

        } else if (action === 'process-manager-revert') {
            if (rp.status !== 'final_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            if (!canAccessRpFinalApproval(u, rp)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat final approval RP untuk department ${rp.processedByDepartment}`,
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'division_review',
                    process_manager_approved_by = NULL,
                    process_manager_approved_at = NULL,
                    process_changes = ?,
                    process_updated_by = ?,
                    process_updated_at = NOW()
                WHERE id = ?
            `, [
                JSON.stringify({ note: req.body.reason || 'Returned to processor review', revertedBy: u.fullName, revertedFrom: 'final_review' }),
                u.fullName,
                rp.id,
            ]);

        } else if (action === 'process-manager-reject') {
            if (rp.status !== 'final_review') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            if (!canAccessRpFinalApproval(u, rp)) {
                await client.rollback();
                return res.status(403).json({
                    success: false,
                    error: `Anda hanya dapat final approval RP untuk department ${rp.processedByDepartment}`,
                });
            }

            await client.query(`
                UPDATE rp_request
                SET
                    status = 'REJECTED',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejected_reason = ?,
                    rejected_stage = 'process-manager'
                WHERE id = ?
            `, [u.fullName, req.body.reason || '', rp.id]);

        } else if (action === 'revert-approved') {
            if (rp.status !== 'approved') {
                await client.rollback();
                return res.status(400).json({ success: false, error: 'Invalid status for this action' });
            }

            const rpUser = { departmentClass: rp.departmentClass, selectedDivision: rp.departmentClass };
            const shortFlow = await isShortFlowDepartment(client, rpUser);
            const isOwnManagerDept = shortFlow
                ? hasUserDivisionAccess(u, rp.departmentClass, rp.companyName)
                : hasUserDivisionAccess(u, rp.processedByDepartment, rp.companyName);

            const canRevertApproved =
                isAdmin ||
                (Number(u.jobLevelRank || 0) >= 1 && isOwnManagerDept);

            if (!canRevertApproved) {
                await client.rollback();
                return res.status(403).json({ success: false, error: 'Tidak ada akses untuk revert RP yang sudah approved' });
            }

            // Short flow: waiting_manager → approved (skip division_review & final_review)
            // Normal flow: ... → final_review → approved
            // Revert one step back accordingly
            if (shortFlow) {
                await client.query(`
                    UPDATE rp_request
                    SET
                        status = 'waiting_manager',
                        manager_approved_by = NULL,
                        manager_approved_at = NULL,
                        process_changes = ?,
                        process_updated_by = ?,
                        process_updated_at = NOW()
                    WHERE id = ?
                `, [
                    JSON.stringify({ note: req.body.reason || 'Reverted from approved to manager review', revertedBy: u.fullName, revertedFrom: 'approved' }),
                    u.fullName,
                    rp.id,
                ]);
            } else {
                await client.query(`
                    UPDATE rp_request
                    SET
                        status = 'final_review',
                        process_manager_approved_by = NULL,
                        process_manager_approved_at = NULL,
                        process_changes = ?,
                        process_updated_by = ?,
                        process_updated_at = NOW()
                    WHERE id = ?
                `, [
                    JSON.stringify({ note: req.body.reason || 'Reverted from approved to final review', revertedBy: u.fullName, revertedFrom: 'approved' }),
                    u.fullName,
                    rp.id,
                ]);
            }

        } else if (action === 'delete') {
            if (!isAdmin) {
                await client.rollback();
                return res.status(403).json({ success: false, error: 'Hanya administrator yang dapat menghapus RP' });
            }

            await client.query('DELETE FROM rp_request WHERE id = ?', [rp.id]);

        } else {
            await client.rollback();
            return res.status(400).json({ success: false, error: 'Unknown action' });
        }

        await client.commit();

        res.json({ success: true });
    } catch (e) {
        await client.rollback();
        console.error('Error processing RP action:', e);

        res.status(e.statusCode || 500).json({
            success: false,
            error: e.message,
        });
    } finally {
        client.release();
    }
});

module.exports = router;
