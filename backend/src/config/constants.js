// ============================================================
// CONSTANTS & SQL TEMPLATES
// ============================================================

const COMPANY_MAP = {
    'PNM': 'PT PILAR NIAGA MAKMUR',
    'PKS': 'PT PILAR KARANG SAMUDERA',
    'PKP': 'PT PILAR KARGO PERKASA',
};

const COMPANY_CODE_BY_NAME = Object.entries(COMPANY_MAP).reduce((acc, [code, name]) => {
    acc[name] = code;
    return acc;
}, {});

// --- SQL Queries ---

// --- USERS ---

// all users
const USER_SQL = `
    SELECT cu.id, cu.name, cu.email, cu.username, cu.job_position,
           cud.department_id,
           cud.is_primary AS department_is_primary,
           md.name AS dept_name, md.class AS dept_class, md.code AS dept_code,
           mc.id AS department_company_id,
           mc.code AS department_company_code,
           mc.name AS department_company_name,
           cuc.company_id AS assigned_company_id,
           uc.code AS assigned_company_code,
           uc.name AS assigned_company_name,
           COALESCE(cuc.is_primary, 0) AS company_is_primary,
           mjl.name AS job_level_name, mjl.level AS job_level_rank
    FROM central_users cu
    LEFT JOIN central_user_departments cud ON cud.user_id = cu.id
    LEFT JOIN master_departments md ON cud.department_id = md.id
    LEFT JOIN master_companies mc ON md.company_id = mc.id
    LEFT JOIN central_user_companies cuc ON cuc.user_id = cu.id
    LEFT JOIN master_companies uc ON cuc.company_id = uc.id
    LEFT JOIN master_job_levels mjl ON cu.job_level_id = mjl.id
    WHERE cu.is_active = 1
`;

// user departement
const USER_DEPARTEMENT_SQL = `
    SELECT 
    cu.id, 
    cu.name, 
    cu.email, 
    cu.username, 
    cu.job_position,
    cud.department_id,
    cud.is_primary AS department_is_primary,
    md.name AS dept_name, 
    md.class AS dept_class, 
    md.code AS dept_code,
    mc.id AS department_company_id,
    mc.code AS department_company_code,
    mc.name AS department_company_name,
    cuc.company_id AS assigned_company_id,
    uc.code AS assigned_company_code,
    uc.name AS assigned_company_name,
    COALESCE(cuc.is_primary, 0) AS company_is_primary,
    mjl.name AS job_level_name, 
    mjl.level AS job_level_rank
FROM central_users cu
LEFT JOIN central_user_departments cud 
    ON cud.user_id = cu.id
LEFT JOIN master_departments md 
    ON cud.department_id = md.id
LEFT JOIN master_companies mc 
    ON md.company_id = mc.id
LEFT JOIN central_user_companies cuc 
    ON cuc.user_id = cu.id 
LEFT JOIN master_companies uc 
    ON cuc.company_id = uc.id
LEFT JOIN master_job_levels mjl 
    ON cu.job_level_id = mjl.id
WHERE cu.is_active = 1
  AND cud.department_id IN (
      SELECT department_id 
      FROM central_user_departments 
      WHERE user_id = ?
  )
`;

const LOGIN_SQL = `
    SELECT
        cu.id,
        cu.internal_id,
        cu.name,
        cu.email,
        cu.phone,
        cu.username,
        cu.password,
        cu.job_position,
        cu.token_version,

        cud.department_id,
        cud.is_primary AS department_is_primary,

        md.name AS dept_name,
        md.class AS dept_class,
        md.code AS dept_code,

        mc.id AS department_company_id,
        mc.code AS department_company_code,
        mc.name AS department_company_name,
        cuc.company_id AS assigned_company_id,
        uc.code AS assigned_company_code,
        uc.name AS assigned_company_name,
        COALESCE(cuc.is_primary, 0) AS company_is_primary,

        mjl.name AS job_level_name,
        mjl.level AS job_level_rank
    FROM central_users cu
    LEFT JOIN central_user_departments cud ON cud.user_id = cu.id
    LEFT JOIN master_departments md ON cud.department_id = md.id
    LEFT JOIN master_companies mc ON md.company_id = mc.id
    LEFT JOIN central_user_companies cuc ON cuc.user_id = cu.id
    LEFT JOIN master_companies uc ON cuc.company_id = uc.id
    LEFT JOIN master_job_levels mjl ON cu.job_level_id = mjl.id
    WHERE cu.is_active = 1 AND cu.username = ?
`;

const DEPARTMENT_SQL = `
    SELECT md.id, md.name, md.class, md.code AS kodeFrp, md.parent_id,
           mc.id AS companyId, mc.code AS companyCode, mc.name AS companyRawName
    FROM master_departments md
    LEFT JOIN master_companies mc ON md.company_id = mc.id
`;

module.exports = {
    COMPANY_MAP,
    COMPANY_CODE_BY_NAME,
    USER_SQL,
    LOGIN_SQL,
    DEPARTMENT_SQL,
    USER_DEPARTEMENT_SQL,
};
