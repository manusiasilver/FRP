import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function DialogFailAction({
  isOpen = false,
  title = 'Gagal!',
  message,
  subMessage,
  rpNo,
  referenceLabel = 'Nomor Request Purchase',
  onConfirm,
  buttonText = 'Lanjutkan',
  icon = 'cancel',
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        onConfirm?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onConfirm])

  if (!isOpen || typeof document === 'undefined') return null

  const handleOverlayClick = () => {
    onConfirm?.()
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleOverlayClick}>
      <style>{`
        @keyframes failPop {
          0% { transform: scale(0.9) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes iconPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fail-dialog-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          animation: 'failPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Ditolak</p>
            <h2 className="dashboard-popup__title" id="fail-dialog-title">{title}</h2>
          </div>
          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={onConfirm}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background: '#fee2e2',
                color: '#dc2626',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
              }}
            >
              <div style={{ animation: 'iconPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.2s', opacity: 0 }}>
                <span className="material-icons-round" style={{ fontSize: '40px' }}>{icon}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.65rem', minWidth: 0, marginTop: '8px' }}>
              <p className="dashboard-popup__text" style={{ margin: 0, fontWeight: 500, color: '#334155' }}>
                {message}
              </p>
              {rpNo && (
                <p className="dashboard-popup__text" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  {referenceLabel}: <strong style={{ color: '#334155' }}>{rpNo}</strong>
                </p>
              )}
              {subMessage && (
                <p className="dashboard-popup__text" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  {subMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button"
            onClick={onConfirm}
            style={{
              border: 'none',
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: '#fff',
              boxShadow: '0 10px 24px rgba(220, 38, 38, 0.28)',
            }}
          >
            {buttonText}
            <span className="material-icons-round" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}
