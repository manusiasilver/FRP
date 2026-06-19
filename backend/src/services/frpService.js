const db = require('../../db');
const { centralDb } = require('../../db');
const crypto = require('crypto');
const https = require('https');
const { USER_SQL } = require('../config/constants');
const { normalizeCompanyCode, sameCompanyName } = require('../utils/company');
const { getUserScopedDivisions, hasUserDivisionAccess } = require('../middleware/scope');

// ============================================================
// USER / SESSION HELPERS
// ============================================================

function normalizeAssignmentList(u, departmentEmployees = []) {
    const company =
        (Array.isArray(u?.companies) && (
            u.companies.find(c => Number(c.is_primary) === 1) || u.companies[0]
        )) || {
            id: u?.company_id || u?.companyId || '',
            code: u?.companyCode || '',
            name: u?.company || u?.companyName || u?.selectedCompany || '',
        };

    const departmentAssignments = Array.isArray(u?.departments)
        ? u.departments.map(d => ({
            id: company.id || '',
            code: company.code || '',
            name: company.name || '',
            class: d.class || '',
            department_id: d.id || null,
            dept_name: d.name || '',
            dept_class: d.class || '',
            dept_code: d.code || '',
            job_level_name: u?.job_level || u?.jobLevelName || u?.selectedJobLevel || '',
            job_level_rank: u?.job_level_value ?? u?.jobLevelRank ?? null,
            classes: d.class ? [d.class] : [],
        }))
        : [];

    const sessionAssignments = Array.isArray(u?.allAssignments) ? u.allAssignments : [];
    const fallbackAssignments = Array.isArray(departmentEmployees)
        ? departmentEmployees.flatMap(emp => Array.isArray(emp?.allAssignments) ? emp.allAssignments : [])
        : [];

    const source =
        sessionAssignments.length > 0
            ? sessionAssignments
            : departmentAssignments.length > 0
                ? departmentAssignments
                : fallbackAssignments;

    const seen = new Set();

    return source.filter(a => {
        if (!a) return false;
        const key = [
            a.id || '',
            a.code || '',
            a.name || '',
            a.department_id || a.departmentId || '',
            a.dept_code || '',
            a.dept_name || '',
            a.dept_class || a.class || '',
        ].join('|');

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function resolveSelectedScope(u, allAssignments = []) {
    const currentCompany = u?.selectedCompany || '';
    const currentDivision = u?.selectedDivision || '';

    const companyMatch = currentCompany
        ? allAssignments.find(a => a.name === currentCompany)
        : allAssignments[0];

    const scopedAssignments = companyMatch
        ? allAssignments.filter(a => a.name === companyMatch.name)
        : allAssignments;

    const divisionMatch = currentDivision
        ? scopedAssignments.find(a =>
            a.class === currentDivision ||
            a.dept_class === currentDivision ||
            a.dept_name === currentDivision
        )
        : scopedAssignments[0];

    return {
        selectedCompany: companyMatch?.name || currentCompany || '',
        selectedDivision: divisionMatch?.class || divisionMatch?.dept_class || divisionMatch?.dept_name || currentDivision || '',
        selectedJobLevel: divisionMatch?.job_level_name || u?.selectedJobLevel || '',
        selectedCompanyId: companyMatch?.id || u?.selectedCompanyId || '',
        selectedCompanyCode: companyMatch?.code || u?.selectedCompanyCode || '',
        selectedDivisionId: divisionMatch?.department_id || divisionMatch?.departmentId || u?.selectedDivisionId || '',
        allAssignments,
    };
}

function getFrpSnapshotFromUser(user) {
    return {
        companyId: user.companyId || user.company_id || null,
        companyCode: user.companyCode || '',
        companyName: user.companyName || user.company || user.selectedCompany || '',

        departmentId: user.departmentId || user.department_id || null,
        departmentName: user.departmentName || user.department || '',
        departmentClass: user.departmentClass || user.department || user.selectedDivision || '',
        departmentCode: user.departmentCode || '',

        jobLevelId: user.jobLevelId || null,
        jobLevelName: user.jobLevelName || user.job_level || user.selectedJobLevel || '',
        jobLevelRank: user.jobLevelRank ?? user.job_level_value ?? null,

        createdByUserId: user.id || null,
        createdByUserName: user.fullName || user.name || user.username || '',
    };
}

// ============================================================
// FRP ITEM HELPERS
// ============================================================

function normalizeFrpItems(items = []) {
    return Array.isArray(items)
        ? items.map(item => ({
            id: item.id || crypto.randomUUID(),
            budgetId: item.budgetId || item.budget_id || null,
            memo: item.memo || '',
            qty: Number(item.qty || 0),
            price: Number(item.price || item.hargaSatuan || 0),
            amount: Number(item.amount || 0),
        }))
        : [];
}

async function replaceFrpItems(client, frpRequestId, items) {
    await client.query(
        'DELETE FROM items_frp WHERE frp_request_id = ?',
        [frpRequestId]
    );

    for (const item of items) {
        await client.query(`
            INSERT INTO items_frp (
                id,
                frp_request_id,
                budget_id,
                memo,
                qty,
                price,
                amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            item.id,
            frpRequestId,
            item.budgetId,
            item.memo,
            item.qty,
            item.price,
            item.amount,
        ]);
    }
}

// ============================================================
// BUDGET HELPERS
// ============================================================

async function adjustBudgetUsage(client, items, direction = 'deduct') {
    const multiplier = direction === 'revert' ? -1 : 1;

    for (const item of items) {
        if (!item.budgetId) continue;

        const amount = Number(item.amount || 0) * multiplier;

        await client.query(`
            UPDATE master_budgets
            SET
                budget_used = budget_used + ?,
                budget_remaining = budget_remaining - ?
            WHERE id = ?
        `, [amount, amount, item.budgetId]);
    }
}

function normText(value) {
    return String(value || '').trim().toUpperCase();
}

function getUserDepartmentScopes(user) {
    const scopes = [];

    scopes.push({
        id: user.departmentId,
        name: user.departmentName,
        class: user.departmentClass || user.selectedDivision,
        code: user.departmentCode,
    });

    (user.allAssignments || []).forEach(a => {
        scopes.push({
            id: a.department_id || a.departmentId || a.dept_id || a.id,
            name: a.dept_name || a.departmentName || a.department_name || a.name,
            class: a.dept_class || a.departmentClass || a.department_class || a.class,
            code: a.dept_code || a.departmentCode || a.department_code || a.code,
        });

        (a.classes || []).forEach(cls => {
            scopes.push({
                id: a.department_id || a.departmentId || a.dept_id,
                name: a.dept_name || a.departmentName || a.department_name,
                class: cls,
                code: a.dept_code || a.departmentCode || a.department_code,
            });
        });
    });

    return scopes.filter(s => s.id || s.name || s.class || s.code);
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
    const departmentClasses = [...new Set(scopes.map(s => s.class).filter(Boolean))];

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
    const departmentClasses = [...new Set(scopes.map(s => s.class).filter(Boolean))];

    if (!departmentClasses.length) return true;

    const [rows] = await client.query(`
        SELECT requires_budget_check
        FROM budget_access_policies
        WHERE module = ?
          AND flow = 'CREATE'
          AND department_class IN (?)
          AND is_active = 1
    `, [moduleName, departmentClasses]);

    if (!rows.length) return true;

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
            module,
            flow,
            department_id,
            department_name,
            department_class,
            department_code,
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
        return { canCrossDepartmentBudget: false, requiresBudgetCheck: true };
    }

    return {
        canCrossDepartmentBudget: Number(rows[0].can_cross_department_budget) === 1,
        requiresBudgetCheck: Number(rows[0].requires_budget_check) === 1,
    };
}

async function validateFrpBudgetAccess(client, user, items) {
    const requiresBudgetCheck = await userRequiresBudgetCheck(client, 'FRP', user);
    const canCrossDepartmentBudget = await userHasCrossBudgetPolicy(client, 'FRP', user);

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

// ============================================================
// APPROVAL HELPERS
// ============================================================

async function canLookAllFrp(user) {
    if (user.role === 'administrator') return true;
    if (Number(user.jobLevelRank || 0) >= 4) return true;

    const departmentClass = String(
        user.departmentClass ||
        user.selectedDivision ||
        ''
    ).trim();

    const [rows] = await db.query(`
        SELECT 1 FROM budget_access_policies
        WHERE module = 'FRP'
          AND flow = 'LOOK'
          AND department_class = ?
          AND is_active = 1
        LIMIT 1
    `, [departmentClass]);

    return rows.length > 0;
}

function getFrpApprovalUserDivision(user) {
    return normText(user?.selectedDivision || user?.departmentClass || user?.departmentName);
}

function getFrpApprovalUserJobLevel(user) {
    return normText(user?.selectedJobLevel || user?.jobLevelName || user?.job_level);
}

function getFrpApprovalRequestDivision(request) {
    return normText(
        request?.divisi ||
        request?.division ||
        request?.department_class ||
        request?.departmentClass ||
        request?.department_name ||
        request?.departmentName
    );
}

function isDirectorOrCommissionerJobLevel(jobLevel) {
    return [
        'DIREKTUR',
        'KOMISARIS',
        'COMMISSIONER',
        'PRESIDENT DIRECTOR',
        'FINANCE DIRECTOR',
    ].includes(jobLevel);
}

function isManagerJobLevel(jobLevel) {
    return jobLevel === 'MANAGER' || jobLevel === 'SENIOR MANAGER';
}

function isDivisionRestrictedFrpApprover(user) {
    if (!user || user.role === 'administrator') return false;

    const userDivisions = getUserScopedDivisions(user);
    if (userDivisions.includes('IT')) return false;

    const jobLevel = getFrpApprovalUserJobLevel(user);
    if (isDirectorOrCommissionerJobLevel(jobLevel)) return false;

    return isManagerJobLevel(jobLevel) || Number(user.jobLevelRank || user.job_level_value || 0) >= 4;
}

function canApproveFrpRequest(user, request) {
    if (!user || !request) return false;

    if (user.role === 'administrator') return true;

    const requestCompany = request.companyName || request.company_name || request.company || '';
    const userCompany = user.selectedCompany || user.companyName || user.company || '';
    if (!sameCompanyName(requestCompany, userCompany)) return false;

    const userDivisions = getUserScopedDivisions(user, requestCompany);
    if (userDivisions.includes('IT')) return true;

    const jobLevel = getFrpApprovalUserJobLevel(user);
    if (isDirectorOrCommissionerJobLevel(jobLevel)) return true;

    const isManagerLevel = isManagerJobLevel(jobLevel) || Number(user.jobLevelRank || user.job_level_value || 0) >= 4;
    if (!isManagerLevel) return false;

    const requestDivision = getFrpApprovalRequestDivision(request);
    return Boolean(requestDivision && hasUserDivisionAccess(user, requestDivision, requestCompany));
}

function enrichReqWithRevert(r, u) {
    const userDivisions = getUserScopedDivisions(u, r.companyName || r.company_name || r.company);
    const isIT = userDivisions.includes('IT');
    const frpDeptClass = r.department_class || r.departmentClass || '';
    const isOwnDivision = hasUserDivisionAccess(u, frpDeptClass, r.companyName || r.company_name || r.company);

    return {
        ...r,
        canRevert:
            u.role === 'administrator' ||
            isIT ||
            (Number(u.jobLevelRank || 0) >= 3 && isOwnDivision),
    };
}

// ============================================================
// EXCHANGE RATE
// ============================================================

function getExchangeRateFromGoogle(from, to = 'IDR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.google.com/finance/quote/${from}-${to}`;

        function fetchUrl(currentUrl, depth) {
            if (depth > 5) return reject(new Error('Too many redirects'));
            https.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let nextUrl = res.headers.location;
                    if (!nextUrl.startsWith('http')) nextUrl = new URL(nextUrl, currentUrl).href;
                    return fetchUrl(nextUrl, depth + 1);
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const pattern = new RegExp(`"${from}\\s*\\/\\s*${to}",\\s*\\d+\\s*,\\s*null\\s*,\\s*\\[\\s*([\\d.]+)`);
                        const match = data.match(pattern);
                        if (match) return resolve(parseFloat(match[1]));

                        const matchClass = data.match(/class="YMlKec fxfa3d"[^>]*>([\d,.]+)</);
                        if (matchClass) return resolve(parseFloat(matchClass[1].replace(/,/g, '')));

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

// ============================================================
// FORM OPTIONS — pre-filter data for current user
// ============================================================

// Divisi yang boleh akses semua budget lintas department
const FULL_ACCESS_DEPT_CLASSES = new Set(['HCGA', 'IT', 'MARKETING', 'PRODUCT']);

function filterDepartmentsForUser(departments, user) {
    if (user.role === 'administrator') return departments;

    const assignments = user.allAssignments || [];
    if (!assignments.length) return departments;

    const allowedIds = new Set(
        assignments.map(a => String(a.department_id || a.departmentId || a.id || '')).filter(Boolean)
    );
    const allowedLabels = new Set(
        assignments
            .flatMap(a => [a.dept_name, a.dept_class, a.class, a.departmentName, a.departmentClass].filter(Boolean))
            .map(v => normText(v))
    );

    const filtered = departments.filter(d =>
        allowedIds.has(String(d.id || '')) ||
        allowedLabels.has(normText(d.name)) ||
        allowedLabels.has(normText(d.class))
    );

    return filtered.length > 0 ? filtered : departments;
}

function filterBudgetsForUser(budgets, user) {
    if (user.role === 'administrator') return budgets;

    const userClass = normText(user.departmentClass || user.selectedDivision || '');
    if (FULL_ACCESS_DEPT_CLASSES.has(userClass)) return budgets;

    const hasFullAccess = (user.allAssignments || []).some(a =>
        FULL_ACCESS_DEPT_CLASSES.has(normText(a.dept_class || a.class || ''))
    );
    if (hasFullAccess) return budgets;

    return budgets.filter(b => isBudgetInUserDepartments(b, user));
}

module.exports = {
    normalizeAssignmentList,
    resolveSelectedScope,
    getFrpSnapshotFromUser,
    normalizeFrpItems,
    replaceFrpItems,
    adjustBudgetUsage,
    normText,
    getUserDepartmentScopes,
    isBudgetInUserDepartments,
    userHasCrossBudgetPolicy,
    userRequiresBudgetCheck,
    getBudgetAccessPolicy,
    validateFrpBudgetAccess,
    canLookAllFrp,
    isDivisionRestrictedFrpApprover,
    canApproveFrpRequest,
    enrichReqWithRevert,
    getExchangeRateFromGoogle,
    filterDepartmentsForUser,
    filterBudgetsForUser,
};
