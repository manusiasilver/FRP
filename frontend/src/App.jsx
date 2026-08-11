import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import BackgroundMain from './components/template/BackgroundMain'
import { UserProvider, useUser } from './contexts/UserContext'
import { PageLoadingProvider } from './contexts/PageLoadingContext'
import DashboardLayout from './components/template/DashboardLayout'
import DocumentPage from './pages/document/DocumentPage'
import SelectCompanyPage from './pages/SelectCompanyPage'
import SelectDivisionPage from './pages/SelectDivisionPage'
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
          const sessionAuth = await fetchAuthUserFromSession()
          if (!cancelled && sessionAuth?.user) {
            setUser(sessionAuth.user, { replaceSelection: true })
          } else if (!cancelled && sessionAuth?.redirect) {
            const redirectPath = sessionAuth.redirect
            if (window.location.pathname !== redirectPath) {
              window.history.replaceState({}, document.title, redirectPath)
            }
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

    const isPublicPath = ['/login', '/select-company', '/select-division'].includes(window.location.pathname)

    if (!isAuthenticated() && !isPublicPath) {
      redirectToPilargroupLogin()
    }
  }, [ready])

  if (!ready) {
    return null
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/select-company" element={<SelectCompanyPage />} />
      <Route
        path="/select-division"
        element={(
          <SelectDivisionPage
            forceFetchUserInfo
            userInfoEndpoint="/api/data/select-division"
          />
        )}
      />
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<DocumentPage view="form" />} />
        <Route path="/document/generate" element={<DocumentPage view="form" />} />
        <Route path="/document/riwayat" element={<DocumentPage view="history" />} />
        <Route path="/document/template" element={<DocumentPage view="templates" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <BackgroundMain />
      <UserProvider>
        <AuthBootstrap>
          <PageLoadingProvider>
            <AppRoutes />
          </PageLoadingProvider>
        </AuthBootstrap>
      </UserProvider>
    </>
  )
}
