import { useEffect } from 'react'
import { createPortal } from 'react-dom'

function formatLoadingLabel(label) {
  if (!label) return 'Memuat...'

  const trimmedLabel = label.trim()
  if (!trimmedLabel) return 'Memuat...'
  if (trimmedLabel.endsWith('...') || /[.!?]$/.test(trimmedLabel)) return trimmedLabel

  return `${trimmedLabel}...`
}

export default function DialogLoading({
  isOpen = false,
  eyebrow = 'Mohon Tunggu',
  title = 'Sedang Memproses',
  message = 'Permintaan Anda sedang diproses. Mohon tunggu sebentar.',
  statusLabel,
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

  const loadingAccent = {
    approve: '#15803d',
    reject: '#dc2626',
    warning: '#d97706',
    primary: '#49b6aa',
    danger: '#dc2626',
  }[tone] || '#49b6aa'

  const loadingHeading = formatLoadingLabel(statusLabel || title)

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
          width: 'min(480px, calc(100vw - 24px))',
          maxHeight: '90vh',
          margin: 'auto',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid rgba(148, 163, 184, 0.32)',
          boxShadow: '0 26px 80px rgba(15, 23, 42, 0.32)',
        }}
      >
        <div
          className="dashboard-popup__header"
          style={{
            padding: '20px 22px 18px',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'flex-start',
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
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.16)',
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
            padding: '34px 24px 30px',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'grid',
              justifyItems: 'center',
              gap: '16px',
              padding: '0',
              textAlign: 'center',
            }}
            role="status"
            aria-live="polite"
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: loadingAccent,
              }}
            >
              <span
                className="material-icons-round dashboard-popup__spinner"
                style={{ fontSize: '34px' }}
              >
                autorenew
              </span>
            </div>
            <div style={{ display: 'grid', gap: '0.7rem', minWidth: 0, width: '100%' }}>
              <p
                style={{
                  margin: 0,
                  color: '#243b77',
                  fontSize: '1.1rem',
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {loadingHeading}
              </p>
              <p
                className="dashboard-popup__text"
                style={{
                  margin: '0 auto',
                  maxWidth: '340px',
                  lineHeight: 1.7,
                  fontWeight: 500,
                  color: '#31477f',
                }}
              >
                {message}
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
              padding: '0 24px 24px',
              background: '#ffffff',
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
