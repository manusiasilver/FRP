import api from '../api'

// ── Lookup ──────────────────────────────────────────────────
const getCompanies       = ()    => api.get('/api/company')
const getVendors         = ()    => api.get('/api/vendors')
const getDepartments     = ()    => api.get('/api/departments')
const getUserInfo        = async () => {
  const data = await api.get('/api/auth/me')
  return data?.user || data || null
}
const getBudgets         = ()    => api.get('/api/budgets')
const getProcessorDepts  = ()    => api.get('/api/rp/processor-departments')
const getCrossBudgetDivs = ()    => api.get('/api/rp/cross-budget-divisions')

// ── RP ──────────────────────────────────────────────────────
const getRpById     = (id)          => api.get(`/api/rp/${id}`)
const getNextRpNo   = (dept)        => api.get(`/api/rp/next-number/${encodeURIComponent(dept)}`)
const saveRp        = (payload)     => api.post('/api/rp/save', payload)
const rpAction      = (id, act)     => api.post(`/api/rp/${id}/${act}`)
const processUpdate = (id, payload) => api.post(`/api/rp/${id}/process-update`, payload)

// ── Aggregate: panggil semua endpoint secara parallel ───────
const getFormData = async (query = '') => {
  const params    = new URLSearchParams(query.replace(/^\?/, ''))
  const revisiId  = params.get('revisi')
  const processId = params.get('process')
  const editId    = revisiId || processId

  const [companiesRaw, vendors, departmentsRaw, user, budgets, processorDepts, crossBudgetDivs, editRaw] = await Promise.all([
    getCompanies(),
    getVendors(),
    getDepartments(),
    getUserInfo(),
    getBudgets(),
    getProcessorDepts(),
    getCrossBudgetDivs(),
    editId ? getRpById(editId) : Promise.resolve(null),
  ])

  const crossBudgetSet = new Set(
    (crossBudgetDivs || []).map(d => String(d).trim().toUpperCase())
  )

  const companies = (companiesRaw || []).map(c => ({
    ...c,
    value: c.name || c.code,
    label: c.name || c.code,
  }))

  const departments = (departmentsRaw || []).map(d => ({
    ...d,
    value: d.originalIndex,
    label: d.class ? `${d.name} - ${d.class}` : (d.name || ''),
    canCrossBudget: crossBudgetSet.has((d.class || '').trim().toUpperCase()) ||
                    crossBudgetSet.has((d.name  || '').trim().toUpperCase()),
  }))

  return {
    companies,
    vendors,
    departments,
    user,
    budgets,
    processorDepts,
    editData:        editRaw?.data ?? editRaw ?? null,
    selectedCompany:  user?.selectedCompany  ?? '',
    selectedDivision: user?.selectedDivision ?? '',
  }
}

export const rpService = {
  getCompanies,
  getVendors,
  getDepartments,
  getUserInfo,
  getBudgets,
  getProcessorDepts,
  getCrossBudgetDivs,
  getRpById,
  getNextRpNo,
  saveRp,
  rpAction,
  processUpdate,
  getFormData,
}
