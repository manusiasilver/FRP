import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import BackgroundMain from './components/template/BackgroundMain'
import { UserProvider, useUser } from './contexts/UserContext'
import DashboardLayout from './components/template/DashboardLayout'
import SelectCompanyPage from './pages/SelectCompanyPage'
import SelectDivisionPage from './pages/SelectDivisionPage'
import NewFRP from './pages/frp/NewFRP'
import ApprovalPage from './pages/frp/ApprovalPage'
import AdminPage from './pages/AdminPage'
import FrpDetailPage from './pages/frp/FrpDetailPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ReportPage from './pages/report/ReportPage'
import NewRP from './pages/rp/NewRP'
import RpApprovalPage from './pages/rp/RpApprovalPage'
import StatusFRP from './pages/frp/StatusFRP'
import StatusRP from './pages/rp/StatusRP'
import DocumentPage from './pages/document/DocumentPage'
import {
  consumeTokenFromUrl,
  fetchAuthUserFromSession,
  getAuthUser,
  isAuthenticated,
  redirectToPilargroupLogin,
} from './utils/auth'

function AuthBootstrap({ children }) {
  const { setUser } = useUser()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const user = await consumeTokenFromUrl()

        if (!cancelled && user) {
          setUser(user, { replaceSelection: true })
        }

        if (!cancelled && !user) {
          const sessionUser = await fetchAuthUserFromSession()
          if (!cancelled && sessionUser) {
            setUser(sessionUser, { replaceSelection: true })
          } else {
            const storedUser = getAuthUser()
            if (!cancelled && storedUser) {
              setUser(storedUser)
            }
          }
        }
      } catch (error) {
        console.error('[Auth Bootstrap Error]', error)
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    }

    boot()

    return () => {
      cancelled = true
    }
  }, [setUser])

  useEffect(() => {
    if (!ready) return

    const isPublicPath = window.location.pathname === '/login'

    if (!isAuthenticated() && !isPublicPath) {
      redirectToPilargroupLogin()
    }
  }, [ready])

  if (!ready) {
    return null
  }

  return children
}

function RpApprovalRedirect() {
  return <Navigate to="/rp-approval" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/frp/:id" element={<FrpDetailPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/select-company" element={<SelectCompanyPage />} />
        <Route path="/select-division" element={<SelectDivisionPage />} />
        <Route path="/" element={<NewFRP />} />
        <Route path="/frp" element={<NewFRP />} />
        <Route path="/approval" element={<ApprovalPage />} />
        <Route path="/approved" element={<ApprovalPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/laporan-frp" element={<ReportPage type="frp" />} />
        <Route path="/laporan-rp" element={<ReportPage type="rp" />} />
        <Route path="/admin/:type" element={<AdminPage />} />
        <Route path="/rp" element={<NewRP />} />
        <Route path="/rp-approval" element={<RpApprovalPage />} />
        <Route path="/rp-approval/manager" element={<RpApprovalRedirect />} />
        <Route path="/rp-approval/staff" element={<RpApprovalRedirect />} />
        <Route path="/rp-approval/*" element={<RpApprovalRedirect />} />
        <Route path="/rp-approved" element={<RpApprovalPage />} />
        <Route path="/status_frp" element={<StatusFRP />} />
        <Route path="/status_rp" element={<StatusRP />} />
        <Route path="/document/generate" element={<DocumentPage view="form" />} />
        <Route path="/document/riwayat" element={<DocumentPage view="history" />} />
        <Route path="/document/template" element={<DocumentPage view="templates" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <BackgroundMain />
      <UserProvider>
        <AuthBootstrap>
          <AppRoutes />
        </AuthBootstrap>
      </UserProvider>
    </>
  )
}
