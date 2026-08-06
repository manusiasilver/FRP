import api from '../api.js'

export async function getBudgetsByCode(code,companyId) {
  const response = await api.get(`/budgets?code=${code}&company_id=${companyId}`)
  return response.data
}