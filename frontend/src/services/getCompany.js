import api from "./api";

export async function getCompany() {
  try {
    const data = await api.get('/api/company');
    return data;
  } catch (error) {
    throw error;
  }
}
