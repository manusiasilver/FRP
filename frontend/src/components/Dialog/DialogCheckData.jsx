import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog'
import NewRP from '../../pages/rp/NewRP.jsx'

import { XClose } from '../template/TemplateIcons.jsx'

function DialogFrpDetail({
    isOpen = false,
    request = null,
    title = 'Detail FRP',
    eyebrow = 'Request Detail',
    onClose,
    onSaved,
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
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#ffffff',
                    borderRadius: '24px',
                    height: 'auto',
                    maxHeight: 'calc(120vh - 70px)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <BackgroundDialog />
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

                <div
                    className="dashboard-popup__body dashboard-popup__body--frp-detail"
                    style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflowY: 'auto',
                        padding: '16px',
                        background: '#eef4fb',
                    }}
                >
                    <div
                        style={{
                            padding: '14px',
                            overflow: 'visible',
                            background: '#f8fafc',
                            border: '1px solid #dbe4ef',
                            borderRadius: '18px',
                            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                        }}
                    >
                        <NewRP
                            embedded
                            embeddedProcessId={request.id}
                            embeddedRequest={request}
                            onEmbeddedSuccess={onSaved}
                            onCloseEmbedded={onClose}
                        />
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(dialogNode, document.body)
}

export default DialogFrpDetail
