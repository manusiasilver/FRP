import { useState, useEffect, useRef } from 'react'

export default function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  style,
  dropdownStyle,
  disabled = false,
  menuPosition = 'absolute',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const [menuRect, setMenuRect] = useState(null)

  const normalizedOptions = options.map(option =>
    typeof option === 'string'
      ? { value: option, label: option, keywords: option }
      : {
          value: option.value,
          label: option.label,
          keywords: option.keywords || option.label || option.value,
        },
  )

  const selectedOption = normalizedOptions.find(option => option.value === value)
  const filteredOptions = normalizedOptions.filter(option =>
    String(option.keywords || '').toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const handleOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (!open || menuPosition !== 'fixed' || !triggerRef.current) return undefined

    const updateMenuRect = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const renderUpward = spaceBelow < 320
      setMenuRect({
        top: renderUpward ? null : rect.bottom + 6,
        bottom: renderUpward ? window.innerHeight - rect.top + 6 : null,
        left: rect.left,
        width: rect.width,
      })
    }

    updateMenuRect()
    window.addEventListener('resize', updateMenuRect)
    window.addEventListener('scroll', updateMenuRect, true)

    return () => {
      window.removeEventListener('resize', updateMenuRect)
      window.removeEventListener('scroll', updateMenuRect, true)
    }
  }, [open, menuPosition])

  const menuBaseStyle = menuPosition === 'fixed'
    ? {
        position: 'fixed',
        ...(menuRect?.top !== null ? { top: menuRect?.top || 0 } : { bottom: menuRect?.bottom || 0 }),
        left: menuRect?.left || 0,
        width: menuRect?.width || 0,
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
      }

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 40 : 1 }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          minHeight: style?.minHeight || '42px',
          boxShadow: style?.boxShadow || 'inset 0 1px 0 rgba(255,255,255,0.65)',
        }}
        disabled={disabled}
      >
        <span
          style={{
            display: 'block',
            flex: 1,
            color: value ? '#1e293b' : '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '12px',
          }}
        >
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div
          style={{
            background: 'white',
            border: '1.5px solid #dbe5f0',
            borderRadius: '12px',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            zIndex: 200,
            overflow: 'hidden',
            ...menuBaseStyle,
            ...dropdownStyle,
          }}
        >
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1.5px solid #d7e0ea',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                outline: 'none',
                background: '#f8fafc',
                color: '#1e293b',
              }}
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              style={{
                width: '100%',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false) }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid #f8fafc',
                  background: option.value === value ? '#eff6ff' : 'white',
                  color: option.value === value ? '#1f4e8c' : '#1e293b',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: option.value === value ? 700 : 500,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}

      <input type="hidden" name={name} value={value} />
    </div>
  )
}
