const express = require('express');
const bcrypt = require('bcryptjs');
const { centralDb } = require('../../db');
const { checkAuth } = require('../middleware/auth');
const { userFromLoginRows } = require('../services/dbService');
const { LOGIN_SQL } = require('../config/constants');
const {
    findAssignment,
    findCompany,
    getUserCompanies,
    applySelectedAssignment,
    getUserAccessOptions,
} = require('../utils/accessScope');

const router = express.Router();

function respondAfterSessionSave(req, res, onSuccess) {
    req.session.save((error) => {
        if (error) {
            console.error('[Auth Session Save Error]', error);

            if (req.path.startsWith('/api/')) {
                return res.status(500).json({ success: false, error: 'Failed to save session' });
            }

            return res.redirect('/');
        }

        return onSuccess();
    });
}

function saveSelectedAuthScope(req, res, next) {
    const user = req.session.user;
    const requestedCompany = req.body.company || user.selectedCompany;
    const requestedDivision = req.body.division;
    
    console.log('[Auth Backend] saveSelectedAuthScope called:', {
        userId: user?.id,
        requestedCompany,
        requestedDivision,
        currentSession: {
            selectedCompany: user?.selectedCompany,
            selectedDivision: user?.selectedDivision,
            selectedJobLevel: user?.selectedJobLevel,
        },
    })
    
    const assignment = findAssignment(user, requestedCompany, requestedDivision);
    const companyMatch = findCompany(user, requestedCompany);

    console.log('[Auth Backend] Assignment lookup result:', {
        found: !!assignment,
        assignment: assignment ? { id: assignment.id, company: assignment.name, division: assignment.class } : null,
        hasCompany: !!companyMatch,
    })

    if (assignment || companyMatch) {
        applySelectedAssignment(req.session.user, assignment, requestedCompany, requestedDivision);
        console.log('[Auth Backend] Applied selected assignment, new session:', {
            selectedCompany: req.session.user?.selectedCompany,
            selectedDivision: req.session.user?.selectedDivision,
            selectedJobLevel: req.session.user?.selectedJobLevel,
        })
    } else {
        console.warn('[Auth Backend] No assignment or company found for requested scope', {
            requestedCompany,
            requestedDivision,
            availableAccess: getUserAccessOptions(user).map((item) => ({
                company: item.name,
                division: item.class,
            })),
        })

        return res.status(400).json({
            success: false,
            error: 'Requested company or division is not available for this user session',
            requestedCompany,
            requestedDivision,
            availableAccess: getUserAccessOptions(user).map((item) => ({
                company: item.name,
                division: item.class,
            })),
        });
    }

    respondAfterSessionSave(req, res, () => {
        console.log('[Auth Backend] Responding with updated user:', {
            userId: req.session.user?.id,
            selectedCompany: req.session.user?.selectedCompany,
            selectedDivision: req.session.user?.selectedDivision,
        })
        res.json({
            success: true,
            user: req.session.user,
        });
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
    respondAfterSessionSave(req, res, () => res.redirect('/select-division'));
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
        applySelectedAssignment(req.session.user, assignment, requestedCompany, req.body.division);
    }
    respondAfterSessionSave(req, res, () => res.redirect('/'));
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
    const user = req.session.user;
    console.log('[Auth Backend] GET /api/auth/me called:', {
        userId: user?.id,
        selectedCompany: user?.selectedCompany,
        selectedDivision: user?.selectedDivision,
        selectedJobLevel: user?.selectedJobLevel,
    })
    
    res.json({
        success: true,
        user: user,
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
    respondAfterSessionSave(req, res, () => res.json({
        success: true,
        redirect: '/select-division',
        user: req.session.user,
    }));
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

router.post('/api/auth/me', checkAuth, saveSelectedAuthScope);

router.post('/api/auth/select-division', checkAuth, saveSelectedAuthScope);

module.exports = router;
