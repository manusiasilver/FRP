function normalizeScopeText(value) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function sameScopeText(a, b) {
    return normalizeScopeText(a) === normalizeScopeText(b);
}

function getCompanyName(item) {
    if (typeof item === 'string') {
        return String(item).trim();
    }

    return String(
        item?.name ||
        item?.companyName ||
        item?.company ||
        item?.company_name ||
        ''
    ).trim();
}

function getCompanyCode(item) {
    return String(
        item?.code ||
        item?.companyCode ||
        item?.company_code ||
        ''
    ).trim();
}

function getAssignmentClasses(assignment) {
    if (Array.isArray(assignment?.classes) && assignment.classes.length > 0) {
        return assignment.classes.filter(Boolean).map((value) => String(value).trim());
    }

    return [
        assignment?.class,
        assignment?.dept_class,
        assignment?.departmentClass,
        assignment?.department_class,
        assignment?.departmentName,
        assignment?.dept_name,
    ].filter(Boolean).map((value) => String(value).trim());
}

function getUserCompanies(user) {
    const companyMap = new Map();

    const addCompany = (raw) => {
        const name = getCompanyName(raw);
        const code = getCompanyCode(raw);
        const id = String(raw?.companyId || raw?.id || '').trim();

        if (!name && !code && !id) return;

        const key = normalizeScopeText(name || code || id);
        if (companyMap.has(key)) {
            const existing = companyMap.get(key);
            existing.id = existing.id || id;
            existing.code = existing.code || code;
            existing.name = existing.name || name;
            existing.is_primary = Math.max(Number(existing.is_primary || 0), Number(raw?.is_primary || raw?.isPrimary || 0));
            return;
        }

        companyMap.set(key, {
            id,
            code,
            name,
            is_primary: Number(raw?.is_primary || raw?.isPrimary || 0),
        });
    };

    if (Array.isArray(user?.companies)) {
        user.companies.forEach(addCompany);
    }

    if (Array.isArray(user?.allAssignments)) {
        user.allAssignments.forEach(addCompany);
    }

    if (Array.isArray(user?.departments)) {
        user.departments.forEach((department) => {
            addCompany({
                id: department?.companyId || department?.company_id || '',
                code: department?.companyCode || department?.company_code || '',
                name: department?.companyName || department?.company || '',
                is_primary: department?.is_primary || department?.isPrimary || 0,
            });
        });
    }

    if (user?.selectedCompany) {
        addCompany({
            id: user?.selectedCompanyId || '',
            code: user?.selectedCompanyCode || '',
            name: user?.selectedCompany || '',
            is_primary: 1,
        });
    }

    return [...companyMap.values()];
}

function getUserAccessOptions(user) {
    const optionMap = new Map();

    const addOption = (option) => {
        const company = getCompanyName(option);
        const classes = getAssignmentClasses(option);

        if (classes.length === 0) {
            classes.push('');
        }

        classes.forEach((division) => {
            const key = `${normalizeScopeText(company)}::${normalizeScopeText(division)}`;
            if (optionMap.has(key)) return;

            optionMap.set(key, {
                id: String(option?.companyId || option?.id || '').trim(),
                code: getCompanyCode(option),
                name: company,
                class: String(division || '').trim(),
                departmentId: option?.department_id || option?.departmentId || option?.id || null,
                departmentName: String(option?.dept_name || option?.departmentName || option?.name || division || '').trim(),
                jobLevel: option?.jobLevel || option?.job_level_name || option?.selectedJobLevel || user?.selectedJobLevel || '',
                jobLevelRank: option?.jobLevelRank ?? option?.job_level_rank ?? user?.jobLevelRank ?? null,
            });
        });
    };

    if (Array.isArray(user?.allAssignments)) {
        user.allAssignments.forEach(addOption);
    }

    if (Array.isArray(user?.departments)) {
        user.departments.forEach((department) => {
            addOption({
                id: department?.companyId || department?.company_id || '',
                companyId: department?.companyId || department?.company_id || '',
                code: department?.companyCode || department?.company_code || '',
                companyCode: department?.companyCode || department?.company_code || '',
                name: department?.companyName || department?.company || user?.selectedCompany || '',
                companyName: department?.companyName || department?.company || user?.selectedCompany || '',
                class: department?.class || department?.dept_class || department?.departmentClass || department?.name || '',
                departmentId: department?.id || department?.departmentId || null,
                departmentName: department?.name || department?.dept_name || department?.class || '',
                jobLevel: department?.jobLevel || department?.job_level_name || user?.selectedJobLevel || '',
                jobLevelRank: department?.jobLevelRank ?? department?.job_level_rank ?? user?.jobLevelRank ?? null,
            });
        });
    }

    if (user?.selectedCompany || user?.selectedDivision) {
        addOption({
            id: user?.selectedCompanyId || '',
            companyId: user?.selectedCompanyId || '',
            code: user?.selectedCompanyCode || '',
            companyCode: user?.selectedCompanyCode || '',
            name: user?.selectedCompany || '',
            companyName: user?.selectedCompany || '',
            class: user?.selectedDivision || '',
            jobLevel: user?.selectedJobLevel || '',
            jobLevelRank: user?.jobLevelRank ?? null,
        });
    }

    return [...optionMap.values()];
}

function findCompany(user, requestedCompany) {
    const target = normalizeScopeText(requestedCompany);
    if (!target) return null;

    return getUserCompanies(user).find((item) => {
        const name = normalizeScopeText(item.name);
        const code = normalizeScopeText(item.code);
        const id = String(item.id || '').trim();

        return target === name || target === code || String(requestedCompany || '').trim() === id;
    }) || null;
}

function findAssignment(user, requestedCompany, requestedDivision) {
    const company = normalizeScopeText(requestedCompany);
    const division = normalizeScopeText(requestedDivision);

    return getUserAccessOptions(user).find((assignment) => {
        const companyMatches = !company ||
            sameScopeText(assignment.name, requestedCompany) ||
            sameScopeText(assignment.code, requestedCompany);
        const divisionMatches = !division || sameScopeText(assignment.class, requestedDivision);

        return companyMatches && divisionMatches;
    }) || null;
}

function applySelectedAssignment(user, assignment, requestedCompany, requestedDivision) {
    const selectedCompany = findCompany(user, requestedCompany);
    const nextCompany = assignment?.name || selectedCompany?.name || requestedCompany || user.selectedCompany || '';

    user.selectedCompany = nextCompany;
    user.selectedCompanyId = assignment?.id || assignment?.companyId || selectedCompany?.id || user.selectedCompanyId || '';
    user.selectedCompanyCode = assignment?.code || assignment?.companyCode || selectedCompany?.code || user.selectedCompanyCode || '';
    user.selectedDivision = requestedDivision || assignment?.class || user.selectedDivision || '';
    user.selectedJobLevel = assignment?.jobLevel || user.selectedJobLevel || '';
    user.jobLevelRank = assignment?.jobLevelRank ?? user.jobLevelRank ?? null;

    return user;
}

module.exports = {
    normalizeScopeText,
    sameScopeText,
    getCompanyName,
    getAssignmentClasses,
    getUserCompanies,
    getUserAccessOptions,
    findCompany,
    findAssignment,
    applySelectedAssignment,
};
