import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog'

export default function DialogLoading({
  isOpen = false,
  eyebrow = 'Mohon Tunggu',
  title = 'Sedang Memproses',
  message = 'Permintaan Anda sedang diproses. Mohon tunggu sebentar.',
  cancelLabel = 'Batal',
  confirmLabel = 'Ya, Lanjutkan',
  icon = 'help',
  tone = 'primary',
  isLoading = false,
  allowClose = false,
  showCloseButton = false,
  showActions = false,
  onClose,
  onConfirm,
  children,
}) {
  const canClose = allowClose && !isLoading

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && canClose) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canClose, isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const confirmToneStyles = {
    approve: {
      border: 'none',
      background: 'linear-gradient(135deg, var(--accent-teal, #15803d) 0%, var(--accent-teal-dark, #166534) 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(42, 157, 143, 0.28)',
    },
    reject: {
      border: 'none',
      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(239, 68, 68, 0.24)',
    },
    warning: {
      border: '1px solid rgba(245, 158, 11, 0.34)',
      background: '#fef3c7',
      color: '#92400e',
      boxShadow: 'none',
    },
    primary: {
      border: 'none',
      background: 'linear-gradient(135deg, var(--accent-blue, #2563eb) 0%, var(--accent-blue-dark, #1d4ed8) 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
    },
    danger: {
      border: 'none',
      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(239, 68, 68, 0.24)',
    }
  }[tone] || {}

  const iconStyles = {
    approve: { background: '#dcfce7', color: '#15803d' },
    reject: { background: '#fee2e2', color: '#dc2626' },
    warning: { background: '#fef3c7', color: '#92400e' },
    primary: { background: '#dbeafe', color: '#1e40af' },
    danger: { background: '#fee2e2', color: '#dc2626' },
  }[tone] || { background: '#dbeafe', color: '#1e40af' }

  const handleOverlayClick = () => {
    if (canClose) onClose?.()
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: '90vh',
          margin: 'auto',
          borderRadius: '28px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 96px rgba(15, 23, 42, 0.28)',
        }}
      >
        <BackgroundDialog />

        <div
          className="dashboard-popup__header"
          style={{
            padding: '16px 18px',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p className="dashboard-popup__eyebrow" style={{ marginBottom: '4px' }}>{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="confirm-dialog-title" style={{ margin: 0 }}>
              {title}
            </h2>
          </div>
          {showCloseButton ? (
            <button
              type="button"
              className="dashboard-popup__close"
              aria-label="Tutup dialog"
              onClick={handleOverlayClick}
              style={{
                flexShrink: 0,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
            </button>
          ) : null}
        </div>

        <div
          className="dashboard-popup__body"
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 18px 18px',
          }}
        >
          <div
            style={{
              display: 'grid',
              justifyItems: 'center',
              gap: '14px',
              padding: '28px 20px',
              borderRadius: '22px',
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
              backdropFilter: 'blur(8px)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                ...iconStyles,
                boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)',
              }}
            >
              <span
                className="material-icons-round dashboard-popup__spinner"
                style={{ fontSize: '34px' }}
              >
                progress_activity
              </span>
            </div>
            <div style={{ display: 'grid', gap: '0.55rem', minWidth: 0, width: '100%' }}>
              <p
                className="dashboard-popup__text"
                style={{ margin: 0, lineHeight: 1.7, fontWeight: 600, color: '#0f172a' }}
              >
                {message}
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Sistem sedang menyiapkan data Anda.
              </p>
              {children}
            </div>
          </div>
        </div>

        {showActions ? (
          <div
            className="dashboard-popup__actions"
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '16px 18px 18px',
              background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.92) 0%, rgba(241, 245, 249, 0.96) 100%)',
              borderTop: '1px solid rgba(226, 232, 240, 0.9)',
              gap: '10px',
            }}
          >
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleOverlayClick}
              disabled={isLoading}
              style={{
                borderRadius: '10px',
                paddingInline: '18px',
                boxShadow: 'none',
                border: '1px solid #cbd5e1',
                background: '#fff',
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="dashboard-popup__button"
              onClick={onConfirm}
              disabled={isLoading}
              style={confirmToneStyles}
            >
              {isLoading ? (
                <span className="material-icons-round dashboard-popup__spinner" style={{ fontSize: '18px' }}>progress_activity</span>
              ) : (
                <span className="material-icons-round" style={{ fontSize: '18px' }}>{icon}</span>
              )}
              {isLoading ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}
