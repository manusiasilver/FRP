import { Routes, Route } from 'react-router-dom'
import BackgroundMain from './components/BackgroundMain'
import LoginPage from './pages/LoginPage'
import SelectCompanyPage from './pages/SelectCompanyPage'
import SelectDivisionPage from './pages/SelectDivisionPage'
import FormPage from './pages/FormPage'
import ApprovalPage from './pages/ApprovalPage'
import AdminPage from './pages/AdminPage'
import FrpDetailPage from './pages/FrpDetailPage'
import DashboardPage from './pages/DashboardPage'
import LaporanPage from './pages/LaporanPage'

export default function App() {
  return (
    <>
      <BackgroundMain />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/select-company" element={<SelectCompanyPage />} />
      <Route path="/select-division" element={<SelectDivisionPage />} />
      <Route path="/" element={<FormPage />} />
      <Route path="/approval" element={<ApprovalPage />} />
      <Route path="/approved" element={<ApprovalPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/laporan" element={<LaporanPage />} />
      <Route path="/admin/:type" element={<AdminPage />} />
      <Route path="/frp/:id" element={<FrpDetailPage />} />
    </Routes>
    </>
  )
}
