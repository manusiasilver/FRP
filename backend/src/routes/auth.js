const express = require('express');
const bcrypt = require('bcryptjs');
const { centralDb } = require('../../db');
const { checkAuth } = require('../middleware/auth');
const { userFromLoginRows } = require('../services/dbService');
const { LOGIN_SQL } = require('../config/constants');

const router = express.Router();

function sameText(a, b) {
    return String(a || '').trim() === String(b || '').trim();
}

function getAssignmentClasses(assignment) {
    if (Array.isArray(assignment?.classes) && assignment.classes.length > 0) {
        return assignment.classes;
    }

    return [
        assignment?.class,
        assignment?.dept_class,
        assignment?.departmentClass,
    ].filter(Boolean);
}

function getUserCompanies(user) {
    const companyMap = new Map();

    const addCompany = (raw) => {
        if (typeof raw === 'string') {
            const name = raw.trim();
            if (!name || companyMap.has(name)) return;
            companyMap.set(name, { id: '', code: '', name, is_primary: 0 });
            return;
        }

        const name = String(raw?.name || raw?.companyName || raw?.company || '').trim();
        if (!name || companyMap.has(name)) return;

        companyMap.set(name, {
            id: raw?.companyId || raw?.id || '',
            code: raw?.companyCode || raw?.code || '',
            name,
            is_primary: raw?.is_primary ?? raw?.isPrimary ?? 0,
        });
    };

    if (Array.isArray(user.companies)) {
        user.companies.forEach(addCompany);
    }

    if (Array.isArray(user.allAssignments)) {
        user.allAssignments.forEach(addCompany);
    }

    return [...companyMap.values()];
}

function findCompany(user, requestedCompany) {
    const company = String(requestedCompany || '').trim();
    return getUserCompanies(user).find(item => sameText(item.name, company));
}

function applySelectedAssignment(req, assignment, requestedCompany, requestedDivision) {
    const selectedCompany = findCompany(req.session.user, requestedCompany);
    const nextCompany = assignment?.name || assignment?.companyName || selectedCompany?.name || requestedCompany || req.session.user.selectedCompany || '';

    req.session.user.selectedCompany = nextCompany;
    req.session.user.selectedCompanyId = assignment?.companyId || assignment?.id || selectedCompany?.id || req.session.user.selectedCompanyId || '';
    req.session.user.selectedCompanyCode = assignment?.companyCode || assignment?.code || selectedCompany?.code || req.session.user.selectedCompanyCode || '';
    req.session.user.selectedDivision = requestedDivision || assignment?.class || assignment?.dept_class || '';
    req.session.user.selectedJobLevel = assignment?.jobLevel || assignment?.job_level_name || req.session.user.selectedJobLevel || '';
    req.session.user.jobLevelRank = assignment?.jobLevelRank || assignment?.job_level_rank || req.session.user.jobLevelRank || null;
}

function findAssignment(user, requestedCompany, requestedDivision) {
    const company = String(requestedCompany || '').trim();
    const division = String(requestedDivision || '').trim();

    return (user.allAssignments || []).find((assignment) => {
        const assignmentCompany = assignment.name || assignment.companyName || '';
        const companyMatches = !company || sameText(assignmentCompany, company);
        const divisionMatches = !division || getAssignmentClasses(assignment).some((item) => sameText(item, division));

        return companyMatches && divisionMatches;
    });
}

// ============================================================
// AUTH PAGES (HTML redirects)
// ============================================================

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.sendSPA();
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await centralDb.query(LOGIN_SQL, [username]);
        if (rows.length) {
            const match = await bcrypt.compare(password, rows[0].password || '');
            if (match) {
                const sessionUser = userFromLoginRows(rows);
                if (sessionUser) {
                    req.session.user = sessionUser;
                    return res.redirect('/');
                }
            }
        }
    } catch (e) {
        console.error('[Login Error]', e.message);
    }
    res.redirect('/?error=1');
});

router.get('/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companies = getUserCompanies(user);
    if (companies.length === 1) {
        req.session.user.selectedCompany = companies[0].name;
        req.session.user.selectedCompanyId = companies[0].id || '';
        req.session.user.selectedCompanyCode = companies[0].code || '';
        return res.redirect('/select-division');
    }
    res.sendSPA();
});

router.post('/select-company', checkAuth, (req, res) => {
    const assignment = (req.session.user.allAssignments || []).find(a => a.name === req.body.company);
    const company = findCompany(req.session.user, req.body.company);
    req.session.user.selectedCompany = req.body.company;
    req.session.user.selectedCompanyId = assignment?.companyId || assignment?.id || company?.id || '';
    req.session.user.selectedCompanyCode = assignment?.companyCode || assignment?.code || company?.code || '';
    res.redirect('/select-division');
});

router.get('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .map(a => ({
            class: a.class || a.dept_class || a.departmentClass || '',
            jobLevel: a.jobLevel || a.job_level_name || '',
            jobLevelRank: a.jobLevelRank || a.job_level_rank || null,
        }));
    if (divisions.length === 1) {
        req.session.user.selectedDivision = divisions[0].class;
        req.session.user.selectedJobLevel = divisions[0].jobLevel;
        req.session.user.jobLevelRank = divisions[0].jobLevelRank || req.session.user.jobLevelRank || null;
        return res.redirect('/');
    }
    res.sendSPA();
});

router.post('/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const requestedCompany = req.body.company || user.selectedCompany;
    const assignment = findAssignment(user, requestedCompany, req.body.division);
    if (assignment || findCompany(user, requestedCompany)) {
        applySelectedAssignment(req, assignment, requestedCompany, req.body.division);
    }
    res.redirect('/');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ============================================================
// AUTH API (JSON responses)
// ============================================================

router.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await centralDb.query(LOGIN_SQL, [username]);
        if (rows.length) {
            const match = await bcrypt.compare(password, rows[0].password || '');
            if (match) {
                const sessionUser = userFromLoginRows(rows);
                if (sessionUser) {
                    req.session.user = sessionUser;
                    return res.json({ success: true, redirect: '/' });
                }
            }
        }
    } catch (e) {
        console.error('[Login Error]', e.message);
    }
    res.json({ success: false, error: 'Username atau Password salah' });
});

router.get('/api/auth/me', checkAuth, (req, res) => {
    res.json({
        success: true,
        user: req.session.user,
    });
});

router.get('/api/data/select-company', checkAuth, (req, res) => {
    const user = req.session.user;
    const companyOptions = getUserCompanies(user);
    const companies = companyOptions.map(company => company.name);
    res.json({
        companies,
        companyOptions,
        user: {
            fullName: user.fullName,
            role: user.role,
            selectedCompany: user.selectedCompany || '',
            selectedCompanyId: user.selectedCompanyId || '',
            selectedCompanyCode: user.selectedCompanyCode || '',
            selectedDivision: user.selectedDivision || '',
            selectedJobLevel: user.selectedJobLevel || '',
            jobLevelRank: user.jobLevelRank || null,
            companies: user.companies || [],
            departments: user.departments || [],
            allAssignments: user.allAssignments || [],
        },
    });
});

router.post('/api/auth/select-company', checkAuth, (req, res) => {
    const assignment = (req.session.user.allAssignments || []).find(a => a.name === req.body.company);
    const company = findCompany(req.session.user, req.body.company);
    req.session.user.selectedCompany = req.body.company;
    req.session.user.selectedCompanyId = assignment?.companyId || assignment?.id || company?.id || '';
    req.session.user.selectedCompanyCode = assignment?.companyCode || assignment?.code || company?.code || '';
    res.json({
        success: true,
        redirect: '/select-division',
        user: req.session.user,
    });
});

router.get('/api/data/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const divisions = user.allAssignments
        .filter(a => a.name === user.selectedCompany)
        .flatMap(a => {
            const classes = a.classes && a.classes.length > 0 ? a.classes : [a.class || a.dept_class].filter(Boolean);
            return classes.map(cls => ({
                class: cls,
                deptName: a.deptName || a.dept_name || cls,
                jobLevel: a.jobLevel || a.job_level_name || '',
                jobLevelRank: a.jobLevelRank || a.job_level_rank || null,
            }));
        });
    res.json({
        divisions,
        selectedCompany: user.selectedCompany,
        selectedCompanyId: user.selectedCompanyId || '',
        selectedCompanyCode: user.selectedCompanyCode || '',
        user: {
            fullName: user.fullName,
            role: user.role,
            selectedCompany: user.selectedCompany || '',
            selectedCompanyId: user.selectedCompanyId || '',
            selectedCompanyCode: user.selectedCompanyCode || '',
            selectedDivision: user.selectedDivision || '',
            selectedJobLevel: user.selectedJobLevel || '',
            jobLevelRank: user.jobLevelRank || null,
            companies: user.companies || [],
            departments: user.departments || [],
            allAssignments: user.allAssignments || [],
        },
    });
});

router.post('/api/auth/select-division', checkAuth, (req, res) => {
    const user = req.session.user;
    const div = req.body.division;
    const requestedCompany = req.body.company || user.selectedCompany;
    const assignment = findAssignment(user, requestedCompany, div);
    if (assignment || findCompany(user, requestedCompany)) {
        applySelectedAssignment(req, assignment, requestedCompany, div);
    }
    res.json({
        success: true,
        redirect: '/',
        user: req.session.user,
    });
});

module.exports = router;
