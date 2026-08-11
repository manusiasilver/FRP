import { useEffect } from 'react'
import BackgroundDialog from '../template/BackgroundDialog'

export default function DialogChangeAccess({
  isOpen = false,
  eyebrow = 'Select Access',
  title = 'Pilih Akses',
  labelBatal = 'Batal',
  labelSimpan = 'Simpan',
  onClose,
  onSave,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-access-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: '90vh',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BackgroundDialog />

        <div className="dashboard-popup__header" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="change-access-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div
          className="dashboard-popup__body"
          style={{
            position: 'relative',
            zIndex: 1,
            overflowY: 'auto',
            padding: '0 20px 20px',
          }}
        >
          {children}
        </div>

        <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
          >
            {labelBatal}
          </button>
          <button
            type="button"
            className="dashboard-popup__button"
            onClick={onSave}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>check</span>
            {labelSimpan}
          </button>
        </div>
      </div>
    </div>
  )
}
