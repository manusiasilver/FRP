import api from "../api";

export async function getUserDepartement() {
    try {
        const data = await api.get('/api/user/departement');
        return data;
    } catch (error) {
        throw error;
    }
}
