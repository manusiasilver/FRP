const { sameCompanyName } = require('../utils/company');

function normalizeDivision(value) {
    return String(value || '').trim().toUpperCase();
}

function canViewRpProcessDivision(userDivision, processDivision) {
    const normalizedUserDivision = normalizeDivision(userDivision);
    const normalizedProcessDivision = normalizeDivision(processDivision);

    if (!normalizedUserDivision || !normalizedProcessDivision) return false;

    if (normalizedUserDivision === 'IT') {
        return normalizedProcessDivision === 'IT' || normalizedProcessDivision === 'HCGA';
    }

    return normalizedUserDivision === normalizedProcessDivision;
}

/**
 * Checks if a FRP request is within the logged-in user's scope (company + division).
 */
function isRequestInUserScope(request, user) {
    if (user.role === 'administrator') return true;
    return sameCompanyName(request.companyName, user.selectedCompany) &&
           normalizeDivision(request.divisi) === normalizeDivision(user.selectedDivision || user.departmentClass);
}

/**
 * Checks if an RP request is within the logged-in user's scope.
 * Optionally includes the "process division" for procurement checks.
 */
function isRpInUserScope(request, user, includeProcessDivision = false) {
    if (user.role === 'administrator') return true;
    if (!sameCompanyName(request.companyName, user.selectedCompany)) return false;
    const userDivision = user.selectedDivision || user.departmentClass;
    const requestDivision = request.divisi;
    const requestProcessDivision = request.diprosesOleh || request.divisi;

    return normalizeDivision(requestDivision) === normalizeDivision(userDivision) ||
           (includeProcessDivision && canViewRpProcessDivision(userDivision, requestProcessDivision));
}

module.exports = { isRequestInUserScope, isRpInUserScope, canViewRpProcessDivision };
