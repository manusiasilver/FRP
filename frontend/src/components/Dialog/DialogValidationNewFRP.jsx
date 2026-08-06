import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function DialogValidationNewFRP({
  isOpen = false,
  isLoading = false,
  onClose,
  onConfirm,
  frpNo,
  dimintaOleh,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const handleOverlayClick = () => {
    if (!isLoading) onClose?.()
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Konfirmasi Approval</p>
            <h2 className="dashboard-popup__title" id="confirm-dialog-title">Approve FRP?</h2>
          </div>
          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={handleOverlayClick}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background: '#dcfce7',
                color: '#15803d',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '22px' }}>check_circle</span>
            </div>
            <div style={{ display: 'grid', gap: '0.65rem', minWidth: 0, marginTop: '10px' }}>
              <p className="dashboard-popup__text" style={{ margin: 0, fontWeight: 500, color: '#334155' }}>
                FRP akan disetujui.
              </p>
              <p className="dashboard-popup__text" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                {frpNo ? `${frpNo} dari ` : 'FRP Baru dari '}
                <strong style={{ color: '#334155' }}>{dimintaOleh || 'User'}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={handleOverlayClick}
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-teal, #15803d) 0%, var(--accent-teal-dark, #166534) 100%)',
              color: '#fff',
              boxShadow: '0 10px 24px rgba(42, 157, 143, 0.28)',
            }}
          >
            {isLoading ? (
              <span className="material-icons-round dashboard-popup__spinner" style={{ fontSize: '18px' }}>progress_activity</span>
            ) : (
              <span className="material-icons-round" style={{ fontSize: '18px' }}>check_circle</span>
            )}
            {isLoading ? 'Memproses...' : 'Ya, Setujui'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}
