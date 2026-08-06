function getTextValue(...values) {
  return values.find((value) => String(value || '').trim()) || ''
}

export function isStaffRpUser(user) {
  if (!user) return false

  // ✅ FIX: fallback ke allAssignments[0] jika jobLevelRank tidak ada di root
  const assignmentRank = Number(user?.allAssignments?.[0]?.job_level_rank || 0)
  const jobLevelRank = Number(user?.jobLevelRank || user?.job_level_rank || assignmentRank || 0)

  const jobLevelName = String(getTextValue(
    user?.selectedJobLevel,
    user?.jobLevelName,
    user?.allAssignments?.[0]?.job_level_name  // ✅ FIX: fallback ke allAssignments
  )).trim().toLowerCase()

  const role = String(getTextValue(user?.role, user?.userRole, user?.selectedRole)).trim().toLowerCase()

  return jobLevelRank <= 1 || /\bstaff\b/.test(jobLevelName) || role === 'staff'
}

export function getRpApprovalPath(user) {
  return '/rp-approval'
}

export function getRpApprovalMode(user) {
  return isStaffRpUser(user) ? 'staff' : 'manager'
}