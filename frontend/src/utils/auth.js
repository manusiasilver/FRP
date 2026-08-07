const TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'authUser'
export const POST_LOGIN_ACCESS_DIALOG_KEY = 'frp:post-login-access-dialog'
export const ACCESS_DIALOG_CHECKED_USER_KEY = 'frp:access-dialog-checked-user'
export const ACCESS_CHANGED_EVENT = 'frp:access-changed'

export function isJwtLike(token) {
  if (typeof token !== 'string') return false

  const parts = token.split('.')
  return parts.length === 3 && parts.every(Boolean)
}

export function getToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token || !isJwtLike(token)) {
      if (token) {
        localStorage.removeItem(TOKEN_KEY)
      }
      return null
    }

    return token
  } catch (_) {
    return null
  }
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

export async function fetchAuthUserFromSession() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      if (response.status === 401 && data?.redirect) {
        return { redirect: data.redirect }
      }

      return null
    }

    const data = await response.json()
    return { user: data.user || null }
  } catch (_) {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(getToken() || getAuthUser())
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    sessionStorage.removeItem(POST_LOGIN_ACCESS_DIALOG_KEY)
    sessionStorage.removeItem(ACCESS_DIALOG_CHECKED_USER_KEY)
  } catch (_) {}
}

export function isPageReload() {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return false
  }

  try {
    const navigationEntries = performance.getEntriesByType?.('navigation')
    if (Array.isArray(navigationEntries) && navigationEntries.length > 0) {
      return navigationEntries[0]?.type === 'reload'
    }

    return performance.navigation?.type === 1
  } catch (_) {
    return false
  }
}

export function notifyAccessChanged(user = null) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(ACCESS_CHANGED_EVENT, {
    detail: {
      selectedCompany: user?.selectedCompany || '',
      selectedDivision: user?.selectedDivision || '',
      selectedJobLevel: user?.selectedJobLevel || '',
    },
  }))
}

function cleanUrlAuthParams() {
  const url = new URL(window.location.href)
  url.searchParams.delete('token')
  url.searchParams.delete('source')
  url.searchParams.delete('project')

  const cleanUrl = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, document.title, cleanUrl || '/')
}

export async function consumeTokenFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  if (!token) {
    return null
  }

  if (!isJwtLike(token)) {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch (_) {}
    cleanUrlAuthParams()
    return null
  }

  localStorage.setItem(TOKEN_KEY, token)

  const response = await fetch(`/api/auth/me?token=${encodeURIComponent(token)}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch (_) {}
    cleanUrlAuthParams()
    throw new Error('Unauthorized')
  }

  const data = await response.json()
  const user = data.user || null

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    try {
      sessionStorage.setItem(POST_LOGIN_ACCESS_DIALOG_KEY, '1')
    } catch (_) {}
  }

  cleanUrlAuthParams()

  return user
}

export function redirectToPilargroupLogin() {
  const returnUrl = encodeURIComponent(window.location.href)
  window.location.href = `https://pilargroup.id/login?return_url=${returnUrl}`
}
