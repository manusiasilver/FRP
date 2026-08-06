import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog'
import { XClose } from '../template/TemplateIcons.jsx'

function DialogTemplateInput({
  isOpen = false,
  title = 'Dialog Title',
  eyebrow = 'Form Input',
  labelSimpan = 'Simpan',
  labelBatal = 'Batal',
  onClose,
  onSave,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-template-input-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, calc(100vw - 48px))',
          maxHeight: '85vh',
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BackgroundDialog />

        {/* ── Header ── */}
        <div
          className="dashboard-popup__header"
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: '#94a3b8',
                marginBottom: '3px',
              }}
            >
              {eyebrow}
            </span>
            <h2
              id="dialog-template-input-title"
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#f8fafc',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#f8fafc' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8' }}
          >
            <XClose size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="dashboard-popup__body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Taruh konten / form di sini */}
          {children}
        </div>

        {/* ── Footer ── */}
        <div
          className="dashboard-popup__actions"
          style={{
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            padding: '10px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            borderRadius: '0 0 24px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          {/* Tombol Batal */}
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              minWidth: '80px',
              justifyContent: 'center',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 16px',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.borderColor = '#94a3b8'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
          >
            {labelBatal}
          </button>

          {/* Tombol Simpan */}
          <button
            type="button"
            onClick={onSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              minWidth: '80px',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1e40af 0%, #1e293b 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(30, 64, 175, 0.25)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 64, 175, 0.35)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(30, 64, 175, 0.25)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '14px' }}>save</span>
            {labelSimpan}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogTemplateInput
