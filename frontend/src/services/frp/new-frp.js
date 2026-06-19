import api from '../api'

// ── Lookup ──────────────────────────────────────────────────
const getEmployees   = ()        => api.get('/api/employees')
const getMyTeam      = ()        => api.get('/api/user/departement')
const getDepartments = ()        => api.get('/api/departments')
const getCompanies   = ()        => api.get('/api/company')
const getVendors     = ()        => api.get('/api/vendors')
const getBudgets     = ()        => api.get('/api/frp/budgets')
const getUserInfo    = async ()  => {
  const data = await api.get('/api/auth/me')
  return data?.user || data || null
}
const getJobLevels   = ()        => api.get('/api/job-levels')

// ── FRP ─────────────────────────────────────────────────────
const getFrpById       = (id)       => api.get(`/api/frp/${id}`)
const getNextFrpNumber = (dept, co) => api.get(`/api/next-frp-number/${dept}?company=${co || ''}`)
const saveFrp          = (payload)  => api.post('/api/frp/save', payload)
const frpAction        = (id, act)  => api.post(`/api/frp/${id}/${act}`)

// ── RP ──────────────────────────────────────────────────────
const getRpData = (rpId) => api.get(`/api/rp/${rpId}`)

// ── Kurs ────────────────────────────────────────────────────
const getKurs = (currency) => api.get(`/api/kurs/${currency}`)

// ── Attachment ──────────────────────────────────────────────
const uploadAttachment = async (id, file) => {
  const formData = new FormData()
  formData.append('attachment', file)
  const response = await fetch(`/api/frp/${id}/attachment`, { method: 'POST', body: formData })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to upload attachment')
  }
  return response.json()
}

const deleteAttachment = (id) => api.delete(`/api/frp/${id}/attachment`)

// ── Aggregate: panggil semua endpoint secara parallel ───────
const getFormData = async (query = '') => {
  const revisiId = new URLSearchParams(query.replace(/^\?/, '')).get('revisi')

  const [employees, departments, companies, vendors, budgets, user, editDataRaw] = await Promise.all([
    getEmployees(),
    getDepartments(),
    getCompanies(),
    getVendors(),
    getBudgets(),
    getUserInfo(),
    revisiId ? getFrpById(revisiId) : Promise.resolve(null),
  ])

  const divisionList = [...new Set((departments || []).map(d => d.name).filter(Boolean))].sort()

  return {
    employees,
    departments,
    companies,
    vendors,
    budgets,
    divisionList,
    editData: editDataRaw?.data ?? null,
    user,
    selectedCompany:  user?.selectedCompany  ?? '',
    selectedDivision: user?.selectedDivision ?? '',
    selectedJobLevel: user?.selectedJobLevel ?? '',
  }
}

export const frpService = {
  getEmployees,
  getMyTeam,
  getDepartments,
  getCompanies,
  getVendors,
  getBudgets,
  getUserInfo,
  getJobLevels,
  getFrpById,
  getNextFrpNumber,
  saveFrp,
  frpAction,
  getRpData,
  getKurs,
  uploadAttachment,
  deleteAttachment,
  getFormData,
}
