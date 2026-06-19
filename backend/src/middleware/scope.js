const { sameCompanyName } = require('../utils/company');

function normalizeDivision(value) {
    return String(value || '').trim().toUpperCase();
}

function getUserScopedDivisions(user, companyName = '') {
    const divisions = [];
    const seen = new Set();
    const targetCompany = String(
        companyName ||
        user?.selectedCompany ||
        user?.companyName ||
        user?.company ||
        ''
    ).trim();

    const addDivision = (value) => {
        const normalizedValue = normalizeDivision(value);
        if (!normalizedValue || seen.has(normalizedValue)) return;
        seen.add(normalizedValue);
        divisions.push(normalizedValue);
    };

    const assignmentMatchesCompany = (assignment) => {
        const assignmentCompany = String(
            assignment?.name ||
            assignment?.companyName ||
            assignment?.company ||
            ''
        ).trim();

        if (!targetCompany || !assignmentCompany) return true;
        return sameCompanyName(assignmentCompany, targetCompany);
    };

    const departmentMatchesCompany = (department) => {
        const departmentCompany = String(
            department?.companyName ||
            department?.company ||
            ''
        ).trim();

        if (!targetCompany || !departmentCompany) return true;
        return sameCompanyName(departmentCompany, targetCompany);
    };

    const assignments = Array.isArray(user?.allAssignments) ? user.allAssignments : [];
    const matchingAssignments = assignments.filter(assignmentMatchesCompany);
    const sourceAssignments = matchingAssignments.length > 0 ? matchingAssignments : assignments;

    sourceAssignments.forEach((assignment) => {
        addDivision(assignment?.dept_class || assignment?.departmentClass || assignment?.class);
        addDivision(assignment?.dept_name || assignment?.departmentName || assignment?.department_name);

        if (Array.isArray(assignment?.classes)) {
            assignment.classes.forEach(addDivision);
        }
    });

    if (divisions.length === 0) {
        const departments = Array.isArray(user?.departments) ? user.departments : [];
        const matchingDepartments = departments.filter(departmentMatchesCompany);
        const sourceDepartments = matchingDepartments.length > 0 ? matchingDepartments : departments;

        sourceDepartments.forEach((department) => {
            addDivision(department?.class);
            addDivision(department?.name);
        });
    }

    addDivision(user?.selectedDivision || user?.departmentClass || user?.departmentName);

    return divisions;
}

function hasUserDivisionAccess(user, division, companyName = '') {
    const normalizedDivision = normalizeDivision(division);
    if (!normalizedDivision) return false;

    return getUserScopedDivisions(user, companyName).includes(normalizedDivision);
}

function canViewRpProcessDivision(userDivision, processDivision) {
    const normalizedProcessDivision = normalizeDivision(processDivision);
    const normalizedUserDivisions = (Array.isArray(userDivision) ? userDivision : [userDivision])
        .map(normalizeDivision)
        .filter(Boolean);

    if (!normalizedUserDivisions.length || !normalizedProcessDivision) return false;

    return normalizedUserDivisions.some((normalizedUserDivision) => {
        if (normalizedUserDivision === 'IT') {
            return normalizedProcessDivision === 'IT' || normalizedProcessDivision === 'HCGA';
        }

        return normalizedUserDivision === normalizedProcessDivision;
    });
}

function canUserViewRpProcessDivision(user, processDivision, companyName = '') {
    return canViewRpProcessDivision(
        getUserScopedDivisions(user, companyName),
        processDivision
    );
}

/**
 * Checks if a FRP request is within the logged-in user's scope (company + division).
 */
function isRequestInUserScope(request, user) {
    if (user.role === 'administrator') return true;
    return sameCompanyName(request.companyName, user.selectedCompany) &&
           hasUserDivisionAccess(user, request.divisi, request.companyName);
}

/**
 * Checks if an RP request is within the logged-in user's scope.
 * Optionally includes the "process division" for procurement checks.
 */
function isRpInUserScope(request, user, includeProcessDivision = false) {
    if (user.role === 'administrator') return true;
    if (!sameCompanyName(request.companyName, user.selectedCompany)) return false;
    const requestDivision = request.divisi;
    const requestProcessDivision = request.diprosesOleh || request.divisi;

    return hasUserDivisionAccess(user, requestDivision, request.companyName) ||
           (includeProcessDivision && canUserViewRpProcessDivision(user, requestProcessDivision, request.companyName));
}

module.exports = {
    getUserScopedDivisions,
    hasUserDivisionAccess,
    isRequestInUserScope,
    isRpInUserScope,
    canViewRpProcessDivision,
    canUserViewRpProcessDivision,
};
