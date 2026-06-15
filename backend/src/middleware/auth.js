/**
 * Middleware: Verifies user is logged in.
 * Also enforces company & division selection if user has multiple options.
 */
function getCompanyName(item) {
    if (typeof item === 'string') return item.trim();

    return String(item?.name || item?.companyName || item?.company || '').trim();
}

function getUniqueCompanies(user) {
    const companies = new Set();

    if (Array.isArray(user?.companies)) {
        user.companies.forEach((company) => {
            const name = getCompanyName(company);
            if (name) companies.add(name);
        });
    }

    if (Array.isArray(user?.allAssignments)) {
        user.allAssignments.forEach((assignment) => {
            const name = getCompanyName(assignment);
            if (name) companies.add(name);
        });
    }

    return [...companies];
}

const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized', redirect: '/' });
        }
        return res.redirect('/');
    }

    const u = req.session.user;
    const isExempt = [
        '/select-company',
        '/select-division',
        '/logout',
        '/api/auth/select-company',
        '/api/auth/select-division',
        '/api/data/select-company',
        '/api/data/select-division',
    ].includes(req.path);

    if (!isExempt) {
        const uniqueCompanies = getUniqueCompanies(u);

        if (!u.selectedCompany && uniqueCompanies.length > 1) {
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ error: 'Unauthorized', redirect: '/select-company' });
            }
            return res.redirect('/select-company');
        }

        if (Array.isArray(u.allAssignments) && u.allAssignments.length > 0) {
            const divisions = u.allAssignments
                .filter(a => a.name === (u.selectedCompany || uniqueCompanies[0]))
                .flatMap(a => a.classes && a.classes.length > 0 ? a.classes : [a.class].filter(Boolean));

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

/**
 * Middleware: Verifies user has administrator (IT) role.
 */
const checkIT = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

/**
 * Middleware: Verifies user is admin or belongs to an IT division.
 */
const checkLaporan = (req, res, next) => {
    const u = req.session.user;
    const isIT = u && (u.allAssignments || []).some(a => a.class === 'IT');
    if (!u || (u.role !== 'administrator' && !isIT)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

module.exports = { checkAuth, checkIT, checkLaporan };
