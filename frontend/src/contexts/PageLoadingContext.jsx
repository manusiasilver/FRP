import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import DialogLoading from '../components/Dialog/DialogLoading.jsx'

const DEFAULT_DIALOG = {
  eyebrow: 'Mohon Tunggu',
  title: 'Memuat Halaman',
  message: 'Sistem sedang menyiapkan data halaman Anda.',
  tone: 'primary',
}

const PageLoadingContext = createContext(null)

export function PageLoadingProvider({ children }) {
  const [entries, setEntries] = useState({})

  const register = useCallback((id, options = {}) => {
    setEntries((currentEntries) => ({
      ...currentEntries,
      [id]: {
        ...DEFAULT_DIALOG,
        ...options,
        isOpen: true,
        updatedAt: Date.now(),
      },
    }))
  }, [])

  const unregister = useCallback((id) => {
    setEntries((currentEntries) => {
      if (!currentEntries[id]) {
        return currentEntries
      }

      const nextEntries = { ...currentEntries }
      delete nextEntries[id]
      return nextEntries
    })
  }, [])

  const activeDialog = useMemo(() => {
    const dialogs = Object.values(entries)
    if (dialogs.length === 0) {
      return null
    }

    return dialogs.reduce((latestDialog, currentDialog) => {
      if (!latestDialog) return currentDialog
      return currentDialog.updatedAt > latestDialog.updatedAt ? currentDialog : latestDialog
    }, null)
  }, [entries])

  const contextValue = useMemo(
    () => ({ register, unregister }),
    [register, unregister],
  )

  return (
    <PageLoadingContext.Provider value={contextValue}>
      {children}
      <DialogLoading
        isOpen={Boolean(activeDialog)}
        eyebrow={activeDialog?.eyebrow ?? DEFAULT_DIALOG.eyebrow}
        title={activeDialog?.title ?? DEFAULT_DIALOG.title}
        message={activeDialog?.message ?? DEFAULT_DIALOG.message}
        tone={activeDialog?.tone ?? DEFAULT_DIALOG.tone}
        isLoading
        allowClose={false}
        showCloseButton={false}
        showActions={false}
      />
    </PageLoadingContext.Provider>
  )
}

export function usePageLoadingDialog(isOpen, options = {}) {
  const context = useContext(PageLoadingContext)
  const idRef = useRef(null)

  if (idRef.current === null) {
    idRef.current = `page-loading-${Math.random().toString(36).slice(2)}`
  }

  const {
    eyebrow = DEFAULT_DIALOG.eyebrow,
    title = DEFAULT_DIALOG.title,
    message = DEFAULT_DIALOG.message,
    tone = DEFAULT_DIALOG.tone,
  } = options

  useEffect(() => {
    if (!context) return undefined

    const id = idRef.current

    if (isOpen) {
      context.register(id, { eyebrow, title, message, tone })
      return () => context.unregister(id)
    }

    context.unregister(id)
    return undefined
  }, [context, eyebrow, isOpen, message, title, tone])
}
