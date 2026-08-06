import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import BackgroundDialog from '../components/template/BackgroundDialog'
import { XClose } from '../components/template/TemplateIcons.jsx'

export default function ChoicePage({
  isOpen = true,
  onClose,
}) {
  const navigate = useNavigate()
  const { setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (typeof onClose === 'function') {
          onClose()
        } else {
          navigate('/', { replace: true })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, navigate, onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    let cancelled = false

    fetch('/api/form-data')
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/'
          throw new Error('Failed to load form data')
        }

        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        setUser(data?.user)
        setError('')
      })
      .catch((fetchError) => {
        if (cancelled) return
        console.error('[ChoicePage] Failed to load form data', fetchError)
        setError('Gagal memuat data pilihan request.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, setUser])

  if (!isOpen || typeof document === 'undefined') return null

  const closeDialog = () => {
    if (typeof onClose === 'function') {
      onClose()
      return
    }

    navigate('/', { replace: true })
  }

  const selectChoice = (path) => {
    if (typeof onClose === 'function') {
      onClose()
    }

    navigate(path)
  }

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={closeDialog}
      style={{
        backdropFilter: 'blur(10px)',
        background: 'rgba(15, 23, 42, 0.45)',
      }}
    >
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-dialog-title"
        aria-describedby="choice-dialog-description"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(820px, calc(100vw - 32px))',
          maxHeight: '90vh',
          margin: 'auto',
          borderRadius: '28px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 30px 90px rgba(15, 23, 42, 0.35)',
        }}
      >
        <BackgroundDialog />

        <div
          className="dashboard-popup__header"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <p className="dashboard-popup__eyebrow" style={{ margin: '0 0 4px 0' }}>Choice page</p>
            <h2
              className="dashboard-popup__title"
              id="choice-dialog-title"
              style={{ margin: 0, fontSize: '1.2rem' }}
            >
              Pilih Jenis Request
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={closeDialog}
          >
            <XClose size={18} />
          </button>
        </div>

        <div
          className="dashboard-popup__body"
          id="choice-dialog-description"
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 20px 20px',
            overflowY: 'auto',
          }}
        >
          <p style={{ margin: '0 0 18px', color: '#475569', lineHeight: 1.6 }}>
            Pilih salah satu jenis request untuk mulai membuat form yang sesuai.
          </p>

          {loading && (
            <div style={{ padding: '28px 0', color: '#64748b', textAlign: 'center' }}>
              Memuat data...
            </div>
          )}

          {!loading && error && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              marginBottom: '18px',
            }}
            >
              {error}
            </div>
          )}

          {!loading && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => selectChoice('/frp')}
                style={{
                  appearance: 'none',
                  border: '1px solid #dbe4f0',
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = 'translateY(-4px)'
                  event.currentTarget.style.boxShadow = '0 18px 36px rgba(31, 78, 140, 0.12)'
                  event.currentTarget.style.borderColor = '#1f4e8c'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = 'translateY(0)'
                  event.currentTarget.style.boxShadow = '0 12px 30px rgba(15, 23, 42, 0.05)'
                  event.currentTarget.style.borderColor = '#dbe4f0'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, rgba(31, 78, 140, 0.12), rgba(31, 78, 140, 0.04))',
                    color: '#1f4e8c',
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '34px' }}>payments</span>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>FRP</h3>
                  <p style={{ margin: 0, color: '#64748b', lineHeight: 1.55, fontSize: '0.95rem' }}>
                    Formulir Request Pembayaran untuk operasional dan kebutuhan non-pengadaan.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectChoice('/rp')}
                style={{
                  appearance: 'none',
                  border: '1px solid #dbe4f0',
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = 'translateY(-4px)'
                  event.currentTarget.style.boxShadow = '0 18px 36px rgba(22, 163, 74, 0.12)'
                  event.currentTarget.style.borderColor = '#16a34a'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = 'translateY(0)'
                  event.currentTarget.style.boxShadow = '0 12px 30px rgba(15, 23, 42, 0.05)'
                  event.currentTarget.style.borderColor = '#dbe4f0'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(22, 163, 74, 0.04))',
                    color: '#16a34a',
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '34px' }}>shopping_cart</span>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Request Purchase</h3>
                  <p style={{ margin: 0, color: '#64748b', lineHeight: 1.55, fontSize: '0.95rem' }}>
                    Formulir Request Purchase untuk pengadaan atau pembelian barang dan jasa.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}
