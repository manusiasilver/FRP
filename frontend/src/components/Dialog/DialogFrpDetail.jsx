import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../template/TemplateIcons.jsx'

function DialogFrpDetail({
  isOpen = false,
  request = null,
  title = 'Detail FRP',
  eyebrow = 'Request Detail',
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !request || typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup dashboard-popup--frp-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-frp-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-frp-detail-title">
              {title}
            </h2>
          </div>
          <div className="frp-detail-header-actions">
            <button
              type="button"
              className="dashboard-popup__close"
              aria-label="Tutup dialog"
              onClick={onClose}
            >
              <XClose size={18} />
            </button>
          </div>
        </div>

        <div className="dashboard-popup__body dashboard-popup__body--frp-detail">
          <div className="frp-detail-frame-shell">
            <div className="frp-detail-frame">
              <iframe
                src={`/frp/${request.id}?embedded=approval`}
                title={`Detail ${request.frpNo || 'FRP'}`}
                className="frp-detail-frame__iframe"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogFrpDetail
