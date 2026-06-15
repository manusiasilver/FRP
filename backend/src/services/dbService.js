const db = require('../../db');
const { centralDb } = require('../../db');

// const CENTRAL_DB_NAME = process.env.CENTRAL_DB_NAME || 'pilargroup';
const { normalizeCompanyCode, normalizeCompanyName } = require('../utils/company');
const { COMPANY_MAP, USER_SQL, DEPARTMENT_SQL } = require('../config/constants');

// ============================================================
// MAPPING HELPERS
// ============================================================

function mapJobLevel(name) {
    if (!name) return 'Staff';
    if (name === 'Commissioner') return 'Komisaris';
    if (['President Director', 'Finance Director'].includes(name)) return 'Direktur';
    if (['Senior Manager', 'Manager'].includes(name)) return 'Manager';
    return name;
}

function buildCompanyRecord(id, code, name, isPrimary = 0) {
    const companyId = String(id || '').trim();
    const rawCode = String(code || '').trim();
    const rawName = String(name || '').trim();

    if (!companyId && !rawCode && !rawName) {
        return null;
    }

    const companyCode = normalizeCompanyCode(rawCode || rawName);
    const companyName = normalizeCompanyName(rawCode || companyCode, rawName);

    return {
        id: companyId,
        code: companyCode,
        name: companyName,
        is_primary: Number(isPrimary || 0),
    };
}

function dbRowToDepartment(row) {
    return {
        id: row.id,
        name: row.name,
        class: row.class,
        kodeFrp: row.kodeFrp,
        company: normalizeCompanyName(row.companyCode, row.companyRawName),
        companyCode: normalizeCompanyCode(row.companyCode || row.companyRawName),
        companyId: row.companyId,
        originalIndex: row.originalIndex ?? row.id,
    };
}

function dbRowsToEmployees(rows) {
    const grouped = new Map();

    rows.forEach(row => {
        if (!grouped.has(row.id)) {
            grouped.set(row.id, {
                row,
                departments: [],
                companies: [],
                departmentMap: new Map(),
                companyMap: new Map(),
            });
        }

        const entry = grouped.get(row.id);

        const hasAssignedCompany =
            Boolean(row.assigned_company_id) ||
            Boolean(row.assigned_company_code) ||
            Boolean(row.assigned_company_name);

        const departmentCompany = buildCompanyRecord(
            row.department_company_id ?? row.company_id,
            row.department_company_code ?? row.company_code,
            row.department_company_name ?? row.company_name,
            hasAssignedCompany ? 0 : (row.department_is_primary || 0)
        );
        const assignedCompany = buildCompanyRecord(
            row.assigned_company_id,
            row.assigned_company_code,
            row.assigned_company_name,
            row.company_is_primary || 0
        );

        const companyId = departmentCompany?.id || assignedCompany?.id || '';
        const companyCode = departmentCompany?.code || assignedCompany?.code || '';
        const companyName = departmentCompany?.name || assignedCompany?.name || '';

        const departmentId = row.department_id || null;
        const departmentName = row.dept_name || '';
        const departmentClass = row.dept_class || '';
        const departmentCode = row.dept_code || '';

        if (departmentId || departmentName || departmentClass || departmentCode) {
            const departmentKey = String(departmentId || `${departmentName}|${departmentClass}|${departmentCode}`);

            if (!entry.departmentMap.has(departmentKey)) {
                const department = {
                    id: departmentId,
                    name: departmentName,
                    class: departmentClass,
                    code: departmentCode,
                    companyId,
                    companyCode,
                    companyName,
                    is_primary: Number(row.department_is_primary || 0),
                };

                entry.departmentMap.set(departmentKey, department);
                entry.departments.push(department);
            }
        }

        const addCompany = (company) => {
            if (!company) return;

            const companyKey = String(company.id || company.code || company.name);
            const existing = entry.companyMap.get(companyKey);

            if (existing) {
                existing.id = existing.id || company.id;
                existing.code = existing.code || company.code;
                existing.name = existing.name || company.name;
                existing.is_primary = Math.max(Number(existing.is_primary || 0), Number(company.is_primary || 0));
                return;
            }

            entry.companyMap.set(companyKey, company);
            entry.companies.push(company);
        };

        if (departmentCompany || assignedCompany) {
            if (departmentCompany) {
                addCompany(departmentCompany);
            }

            if (assignedCompany) {
                addCompany(assignedCompany);
            }
        } else if (companyId || companyCode || companyName) {
            const companyKey = String(companyId || companyCode || companyName);

            if (!entry.companyMap.has(companyKey)) {
                const company = {
                    id: companyId,
                    code: companyCode,
                    name: companyName,
                    is_primary: Number(row.company_is_primary || 0),
                };

                entry.companyMap.set(companyKey, company);
                entry.companies.push(company);
            }
        }
    });

    return [...grouped.values()].map(({ row, departments, companies }) => {
        const primaryDepartment =
            departments.find(d => Number(d.is_primary) === 1) ||
            departments[0] ||
            {};

        const primaryCompany =
            companies.find(c => (
                primaryDepartment.companyId &&
                String(c.id || '') === String(primaryDepartment.companyId)
            )) ||
            companies.find(c => Number(c.is_primary) === 1) ||
            companies[0] ||
            {};

        const jobLevelName = mapJobLevel(row.job_level_name);
        const jobLevelRank = row.job_level_rank ?? null;

        return {
            id: row.id,
            internal_id: row.internal_id ?? null,
            username: row.username,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,

            departments,
            companies,

            department_id: primaryDepartment.id || null,
            department: primaryDepartment.name || '',

            company_id: primaryCompany.id || '',
            company: primaryCompany.name || '',

            job_position: row.job_position || '',
            job_level: jobLevelName,
            job_level_value: jobLevelRank,

            cv: row.token_version ?? null,

            // Compatibility fields for Papertrail internal logic
            fullName: row.name,
            role:
                departments.some(d =>
                    Number(d.id) === 8 ||
                    String(d.class || '').toUpperCase() === 'IT' ||
                    String(d.name || '').toUpperCase() === 'IT'
                )
                    ? 'administrator'
                    : 'user',

            companyId: primaryCompany.id || '',
            companyCode: primaryCompany.code || '',
            companyName: primaryCompany.name || '',
            selectedCompany: primaryCompany.name || '',

            departmentId: primaryDepartment.id || null,
            departmentCode: primaryDepartment.code || '',
            departmentName: primaryDepartment.name || '',
            departmentClass: primaryDepartment.class || '',
            selectedDivision: primaryDepartment.class || primaryDepartment.name || '',

            jobLevelName,
            jobLevelRank,
            selectedJobLevel: jobLevelName,

            allAssignments: departments.map(d => ({
                id: d.companyId || primaryCompany.id || '',
                code: d.companyCode || primaryCompany.code || '',
                name: d.companyName || primaryCompany.name || '',
                companyId: d.companyId || primaryCompany.id || '',
                companyCode: d.companyCode || primaryCompany.code || '',
                companyName: d.companyName || primaryCompany.name || '',
                class: d.class || '',
                department_id: d.id || null,
                dept_name: d.name || '',
                dept_class: d.class || '',
                dept_code: d.code || '',
                job_level_name: jobLevelName,
                job_level_rank: jobLevelRank,
                classes: d.class ? [d.class] : [],
            })),
        };
    });
}

function userFromLoginRows(rows) {
    return dbRowsToEmployees(rows)[0] || null;
}

function getPrimaryAssignment(assignments) {
    const list = Array.isArray(assignments) ? assignments : Object.values(assignments || {});
    return list[0] || {};
}

// ============================================================
// DATABASE QUERIES (DELEGATED TO QUERIES FILE)
// ============================================================
const queries = require('../queries');

async function getCompanies() {
    return queries.getCompanies(centralDb);
}

async function getCompanyRow(companyName, client = centralDb) {
    return queries.getCompanyRow(client, companyName);
}

async function getCompanyId(companyName, client = centralDb) {
    return queries.getCompanyId(client, companyName);
}

async function getDepartmentRows() {
    return queries.getDepartmentRows(centralDb, dbRowToDepartment);
}

async function getDepartmentCompanyId(companyName, client = centralDb) {
    return queries.getDepartmentCompanyId(client, companyName);
}

async function getDeptCode(deptName, companyName) {
    return queries.getDeptCode(centralDb, deptName, companyName);
}

async function getDeptId(deptClass, companyName, client = centralDb) {
    return queries.getDeptId(client, deptClass, companyName);
}

async function getJobLevelId(jobLevelName, client = centralDb) {
    return queries.getJobLevelId(client, jobLevelName);
}

async function getAllEmployees() {
    return queries.getAllEmployees(centralDb, dbRowsToEmployees);
}

async function getDepartmentEmployeesByUserId(userId) {
    return queries.getDepartmentEmployeesByUserId(centralDb, dbRowsToEmployees, userId);
}

async function saveUserAssignments(client, userId, assignments) {
    return queries.saveUserAssignments(client, userId, assignments);
}

async function fetchAllFrpRequests() {
    const [rows] = await db.query(`
        SELECT f.*
        FROM frp_request f
    `);

    const requestIds = rows.map(r => r.id);

    let itemsByRequestId = {};

    if (requestIds.length > 0) {
        const [itemRows] = await db.query(`
            SELECT i.*, mb.project_name
            FROM items_frp i
            LEFT JOIN master_budgets mb ON i.budget_id = mb.id
            WHERE i.frp_request_id IN (?)
            ORDER BY i.created_at ASC
        `, [requestIds]);

        itemsByRequestId = itemRows.reduce((acc, item) => {
            if (!acc[item.frp_request_id]) acc[item.frp_request_id] = [];

            acc[item.frp_request_id].push({
                id: item.id,
                budgetId: item.budget_id || '',
                projectName: item.project_name || '',
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                amount: Number(item.amount || 0),
            });

            return acc;
        }, {});
    }

    return rows.map(r => ({
        id: r.id,
        frpNo: r.frp_no || '',
        status: r.status,

        companyId: r.company_id || '',
        companyCode: r.company_code || '',
        companyName: r.company_name || '',

        departmentId: r.department_id || null,
        departmentName: r.department_name || '',
        departmentClass: r.department_class || '',
        departmentCode: r.department_code || '',
        divisi: r.department_class || '',

        jobLevelId: r.job_level_id || null,
        jobLevelName: r.job_level_name || '',
        jobLevelRank: r.job_level_rank || null,

        frpDate: r.frp_date ? new Date(r.frp_date).toISOString().slice(0, 10) : (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''),
        tanggalFrp: r.frp_date ? new Date(r.frp_date).toISOString().slice(0, 10) : (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''),
        requestedBy: r.requested_by || '',
        dimintaOleh: r.requested_by || '',

        currency: r.currency || 'IDR',
        exchangeRate: String(r.kurs || '1'),

        vendor: r.vendor || '',
        internalPoNumber: r.internal_po_number || '',
        externalDocumentType: r.ext_doc_type || '',
        externalDocumentNumber: r.ext_doc_number || '',

        paymentMethod: r.payment_method || 'Transfer',
        paymentDate: r.payment_date ? new Date(r.payment_date).toISOString().slice(0, 10) : '',

        destinationBank: r.destination_bank || '',
        destinationBankAccount: r.destination_bank_account || '',

        frpDescription: r.frp_description || '',
        attachLink: r.attachment_link || '',

        checkDocs: typeof r.check_docs === 'string' ? JSON.parse(r.check_docs) : (r.check_docs || []),
        items: itemsByRequestId[r.id] || [],

        createdAt: r.created_at,
        createdBy: r.created_by,
        createdByUserId: r.created_by_user_id || '',
        createdByUserName: r.created_by_user_name || '',

        approvedByActual: r.approved_by_actual,
        approvedBy: r.approved_by,
        approvedAt: r.approved_at
    }));
}

async function fetchAllRpRequests() {
    const [rows] = await db.query(`
        SELECT r.*
        FROM rp_request r
    `);

    const requestIds = rows.map(r => r.id);

    let itemsByRequestId = {};

    if (requestIds.length > 0) {
        const [itemRows] = await db.query(`
            SELECT i.*, mb.project_name
            FROM items_rp i
            LEFT JOIN master_budgets mb ON i.budget_id = mb.id
            WHERE i.rp_request_id IN (?)
            ORDER BY i.created_at ASC
        `, [requestIds]);

        itemsByRequestId = itemRows.reduce((acc, item) => {
            if (!acc[item.rp_request_id]) acc[item.rp_request_id] = [];

            acc[item.rp_request_id].push({
                id: item.id,
                budgetId: item.budget_id || '',
                projectName: item.project_name || '',
                memo: item.memo || '',
                qty: Number(item.qty || 0),
                price: Number(item.price || 0),
                estimatedValue: Number(item.price || 0),
                amount: Number(item.amount || 0),
                link_item: item.link_item || '',
                linkPembelian: item.link_item || '',
            });

            return acc;
        }, {});
    }

    return rows.map(r => ({
        id: r.id,
        rpNo: r.rp_no || '',
        status: r.status,

        companyId: r.company_id || '',
        companyCode: r.company_code || '',
        companyName: r.company_name || '',

        departmentId: r.department_id || null,
        departmentName: r.department_name || '',
        departmentClass: r.department_class || '',
        departmentCode: r.department_code || '',
        divisi: r.department_class || r.department_name || '',

        classId: r.class_id || null,
        className: r.class_name || '',
        classClass: r.class_class || '',
        classCode: r.class_code || '',

        jobLevelId: r.job_level_id || null,
        jobLevelName: r.job_level_name || '',
        jobLevelRank: r.job_level_rank || null,

        requestedBy: r.requested_by || '',
        purchaseCategory: r.purchase_category || '',
        kategoriPembelian: r.purchase_category || '',
        description: r.description || '',

        processedByDepartment: r.processed_by_department || '',
        diprosesOleh: r.processed_by_department || '',

        requiredDate: r.required_date ? new Date(r.required_date).toISOString().slice(0, 10) : '',

        vendorSuggestion: r.vendor_suggestion || '',
        receiverPic: r.receiver_pic || '',

        items: itemsByRequestId[r.id] || [],

        createdAt: r.created_at,
        createdBy: r.created_by,
        createdByUserId: r.created_by_user_id || '',
        createdByUserName: r.created_by_user_name || '',
        dibuatOleh: r.created_by_user_name || r.created_by || '',

        managerApprovedBy: r.manager_approved_by,
        managerApprovedAt: r.manager_approved_at,

        processChanges: typeof r.process_changes === 'string' ? JSON.parse(r.process_changes) : (r.process_changes || []),
        processUpdatedBy: r.process_updated_by,
        processUpdatedAt: r.process_updated_at,

        processManagerApprovedBy: r.process_manager_approved_by,
        processManagerApprovedAt: r.process_manager_approved_at,

        rejectedBy: r.rejected_by,
        rejectedAt: r.rejected_at,
        rejectedReason: r.rejected_reason,
        rejectedStage: r.rejected_stage
    }));
}

module.exports = {
    // Mappers
    mapJobLevel,
    dbRowToDepartment,
    dbRowsToEmployees,
    userFromLoginRows,
    getPrimaryAssignment,
    // Queries
    getCompanies,
    getCompanyRow,
    getCompanyId,
    getDepartmentRows,
    getDepartmentCompanyId,
    getDeptCode,
    getDeptId,
    getJobLevelId,
    getAllEmployees,
    getDepartmentEmployeesByUserId,
    saveUserAssignments,
    fetchAllRpRequests,
    fetchAllFrpRequests,
};
