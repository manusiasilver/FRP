const express = require('express');
const { checkAuth, checkIT } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/json');
const { getCompanies, getDepartmentRows } = require('../services/dbService');
const db = require('../../db');

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function parseAmount(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;

    return Number(
        String(value)
            .replace(/\./g, '')
            .replace(/,/g, '')
            .replace(/[^\d.-]/g, '')
    ) || 0;
}

function mapBudgetRow(row, index = 0) {
    return {
        id: row.id,

        departmentId: row.department_id,
        departmentName: row.department_name || '',
        departmentClass: row.department_class || '',
        departmentCode: row.department_code || '',

        projectName: row.project_name || '',
        budgetType: row.budget_type || '',

        budgetAmount: Number(row.budget_amount || 0),
        budgetUsed: Number(row.budget_used || 0),
        budgetRemaining: Number(row.budget_remaining || 0),

        isActive: Number(row.is_active) === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        originalIndex: index,
    };
}

// ============================================================
// ADMIN PAGE
// ============================================================

router.get('/admin/:type', checkAuth, checkIT, (req, res) => res.sendSPA());

// ============================================================
// ADMIN DATA
// ============================================================

router.get('/api/data/admin', checkAuth, checkIT, async (req, res) => {
    const type = req.query.type;
    const VALID_TYPES = ['vendors', 'budgets'];

    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    const u = req.session.user;

    try {
        let listData = [];

        if (type === 'budgets') {
            const [rows] = await db.query(`
                SELECT
                    id,
                    department_id,
                    department_name,
                    department_class,
                    department_code,
                    project_name,
                    budget_type,
                    budget_amount,
                    budget_used,
                    budget_remaining,
                    is_active,
                    created_at,
                    updated_at
                FROM master_budgets
                ORDER BY department_name ASC, id ASC
            `);

            listData = rows.map(mapBudgetRow);
        } else if (type === 'vendors') {
            const [rows] = await db.query(`
                SELECT id, name, bank, no_rekening
                FROM master_vendor
                ORDER BY id ASC
            `);
            listData = rows.map((item, index) => ({
                ...item,
                originalIndex: index,
            }));
        }

        const [companies, departments] = await Promise.all([
            getCompanies(),
            getDepartmentRows(),
        ]);

        res.json({
            activeType: type,
            listData,
            companies,
            departments,
            user: {
                id: u.id,
                username: u.username,
                fullName: u.fullName,
                role: u.role,
                companyId: u.companyId,
                companyCode: u.companyCode,
                companyName: u.companyName,
                departmentId: u.departmentId,
                departmentName: u.departmentName,
                departmentClass: u.departmentClass,
                departmentCode: u.departmentCode,
                jobLevelName: u.jobLevelName,
                jobLevelRank: u.jobLevelRank,
                allAssignments: u.allAssignments || [],
            },
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// ADMIN ADD
// ============================================================

router.post('/api/admin/:type/add', checkAuth, checkIT, async (req, res) => {
    const type = req.params.type;
    const VALID_TYPES = ['vendors', 'budgets'];

    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        if (type === 'budgets') {
            const newItem = req.body;

            const budgetAmount = parseAmount(
                newItem.budgetAmount ?? newItem.totalAmount
            );

            // Accept both form field names (description/type/class/department)
            // and API field names (projectName/budgetType/departmentClass/departmentName)
            const projectName   = newItem.projectName   ?? newItem.description  ?? '';
            const budgetType    = newItem.budgetType     ?? newItem.type         ?? '';
            const departmentName  = newItem.departmentName  ?? newItem.department  ?? '';
            const departmentClass = newItem.departmentClass ?? newItem.class       ?? '';
            const departmentCode  = newItem.departmentCode  ?? newItem.code        ?? '';

            const budgetId = newItem.id;

            if (!budgetId) {
                return res.status(400).json({
                    success: false,
                    error: 'Budget ID is required',
                });
            }

            if (!projectName) {
                return res.status(400).json({
                    success: false,
                    error: 'Project name / Deskripsi is required',
                });
            }

            await db.query(`
                INSERT INTO master_budgets (
                    id,
                    department_id,
                    department_name,
                    department_class,
                    department_code,
                    project_name,
                    budget_type,
                    budget_amount,
                    budget_used,
                    budget_remaining,
                    is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            `, [
                budgetId,
                newItem.departmentId || null,
                departmentName,
                departmentClass,
                departmentCode,
                projectName,
                budgetType,
                budgetAmount,
                budgetAmount,
                newItem.isActive === false ? 0 : 1,
            ]);

            return res.json({ success: true, id: budgetId });
        }

        if (type === 'vendors') {
            const newItem = req.body;
            await db.query(`
                INSERT INTO master_vendor (name, bank, no_rekening)
                VALUES (?, ?, ?)
            `, [newItem.name || '', newItem.bank || '', newItem.no_rekening || '']);
            return res.json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ============================================================
// ADMIN DELETE
// ============================================================

router.post('/api/admin/:type/delete/:index', checkAuth, checkIT, async (req, res) => {
    const { type, index } = req.params;
    const VALID_TYPES = ['vendors', 'budgets'];

    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        if (type === 'budgets') {
            const [rows] = await db.query(`
                SELECT id
                FROM master_budgets
                ORDER BY department_name ASC, id ASC
            `);

            const targetId = rows[parseInt(index, 10)]?.id;

            if (!targetId) {
                return res.status(400).json({ success: false, error: 'Item not found' });
            }

            await db.query(`
                UPDATE master_budgets
                SET is_active = 0
                WHERE id = ?
            `, [targetId]);

            return res.json({ success: true, id: targetId });
        }

        if (type === 'vendors') {
            const [rows] = await db.query(`
                SELECT id FROM master_vendor ORDER BY id ASC
            `);
            const targetId = rows[parseInt(index, 10)]?.id;
            if (!targetId) {
                return res.status(400).json({ success: false, error: 'Item not found' });
            }
            await db.query(`DELETE FROM master_vendor WHERE id = ?`, [targetId]);
            return res.json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ============================================================
// ADMIN EDIT
// ============================================================

router.post('/api/admin/:type/edit/:index', checkAuth, checkIT, async (req, res) => {
    const { type, index } = req.params;
    const VALID_TYPES = ['vendors', 'budgets'];

    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        if (type === 'budgets') {
            const [rows] = await db.query(`
                SELECT
                    id,
                    budget_amount,
                    budget_used,
                    budget_remaining
                FROM master_budgets
                ORDER BY department_name ASC, id ASC
            `);

            const oldItem = rows[parseInt(index, 10)];

            if (!oldItem) {
                return res.status(400).json({ success: false, error: 'Item not found' });
            }

            const updatedItem = req.body;
            const budgetAmount = parseAmount(
                updatedItem.budgetAmount ?? updatedItem.totalAmount ?? oldItem.budget_amount
            );

            // Accept both form field names and API field names
            const projectName     = updatedItem.projectName   ?? updatedItem.description  ?? '';
            const budgetType      = updatedItem.budgetType     ?? updatedItem.type         ?? '';
            const departmentName  = updatedItem.departmentName  ?? updatedItem.department  ?? '';
            const departmentClass = updatedItem.departmentClass ?? updatedItem.class       ?? '';
            const departmentCode  = updatedItem.departmentCode  ?? updatedItem.code        ?? '';

            await db.query(`
                UPDATE master_budgets
                SET
                    id = ?,
                    department_id = ?,
                    department_name = ?,
                    department_class = ?,
                    department_code = ?,
                    project_name = ?,
                    budget_type = ?,
                    budget_amount = ?,
                    budget_remaining = ? - budget_used,
                    is_active = ?
                WHERE id = ?
            `, [
                updatedItem.id || oldItem.id,
                updatedItem.departmentId || null,
                departmentName,
                departmentClass,
                departmentCode,
                projectName,
                budgetType,
                budgetAmount,
                budgetAmount,
                updatedItem.isActive === false ? 0 : 1,
                oldItem.id,
            ]);

            return res.json({
                success: true,
                id: updatedItem.id || oldItem.id,
            });
        }

        if (type === 'vendors') {
            const [rows] = await db.query(`
                SELECT id FROM master_vendor ORDER BY id ASC
            `);
            const targetId = rows[parseInt(index, 10)]?.id;
            if (!targetId) {
                return res.status(400).json({ success: false, error: 'Item not found' });
            }
            const updatedItem = req.body;
            await db.query(`
                UPDATE master_vendor
                SET name = ?, bank = ?, no_rekening = ?
                WHERE id = ?
            `, [updatedItem.name || '', updatedItem.bank || '', updatedItem.no_rekening || '', targetId]);
            return res.json({ success: true });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;