import { useState, useRef, useEffect, useMemo } from 'react'

/**
 * SelectVendor
 *
 * Props:
 *  - value        : string          — nilai terpilih (vendor name)
 *  - onChange     : (value) => void — callback saat vendor dipilih
 *  - vendors      : Array<{ id, name, category?, status? }>
 *                   atau Array<string>   — sumber data vendor
 *  - placeholder  : string          — teks placeholder (default: "Cari vendor...")
 *  - disabled     : boolean
 *  - className    : string          — class tambahan untuk wrapper
 *  - menuPosition : "absolute" | "fixed"  (default: "fixed")
 *  - style        : CSSProperties
 *
 * Cara pakai:
 *   <SelectVendor
 *     value={values.vendorSuggestion}
 *     onChange={v => updateField('vendorSuggestion', v)}
 *     vendors={D.vendors}
 *   />
 */
export default function SelectVendor({
  value = '',
  onChange,
  vendors = [],
  placeholder = 'Cari vendor...',
  disabled = false,
  className = '',
  menuPosition = 'fixed',
  style,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState({})

  // Normalise vendors → array of { value, label }
  const options = useMemo(() => {
    if (!Array.isArray(vendors) || vendors.length === 0) return []
    const first = vendors[0]
    if (typeof first === 'string') {
      return vendors.map(v => ({ value: v, label: v }))
    }
    return vendors.map(v => ({
      value: v.name ?? v.value ?? String(v.id ?? ''),
      label: v.name ?? v.label ?? String(v.id ?? ''),
      sub: v.category ?? v.type ?? '',
      status: v.status ?? '',
    }))
  }, [vendors])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        (o.sub && o.sub.toLowerCase().includes(q))
    )
  }, [options, search])

  const selectedLabel = options.find(o => o.value === value)?.label ?? value

  // Position menu under input when menuPosition === 'fixed'
  const updateMenuStyle = () => {
    if (menuPosition !== 'fixed' || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }),
    })
  }

  const openDropdown = () => {
    if (disabled) return
    updateMenuStyle()
    setSearch('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const closeDropdown = () => {
    setOpen(false)
    setSearch('')
  }

  const select = option => {
    onChange?.(option.value)
    closeDropdown()
  }

  const clear = e => {
    e.stopPropagation()
    onChange?.('')
    closeDropdown()
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keyboard: Escape closes
  const handleKeyDown = e => {
    if (e.key === 'Escape') closeDropdown()
  }

  const hasValue = Boolean(value)

  return (
    <>
      {/* ── Trigger ── */}
      <div
        ref={wrapperRef}
        className={`sv-wrapper${className ? ' ' + className : ''}${disabled ? ' sv-disabled' : ''}`}
        style={style}
        onClick={openDropdown}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openDropdown() }}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Pilih vendor"
      >
        <span className="material-icons-round sv-icon-left">storefront</span>

        <span className={`sv-display-value${!hasValue ? ' sv-placeholder' : ''}`}>
          {hasValue ? selectedLabel : placeholder}
        </span>

        <span className="sv-actions">
          {hasValue && !disabled && (
            <button
              type="button"
              className="sv-clear-btn"
              onClick={clear}
              aria-label="Hapus pilihan"
              tabIndex={-1}
            >
              <span className="material-icons-round" style={{ fontSize: 14 }}>close</span>
            </button>
          )}
          <span
            className="material-icons-round sv-chevron"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            expand_more
          </span>
        </span>
      </div>

      {/* ── Dropdown menu ── */}
      {open && (
        <div
          ref={listRef}
          className="sv-menu"
          style={menuStyle}
          role="listbox"
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div className="sv-search-wrap">
            <span className="material-icons-round sv-search-icon">search</span>
            <input
              ref={inputRef}
              type="text"
              className="sv-search-input"
              placeholder="Cari vendor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-label="Cari vendor"
            />
            {search && (
              <button
                type="button"
                className="sv-clear-btn"
                onClick={() => setSearch('')}
                tabIndex={-1}
                aria-label="Hapus pencarian"
              >
                <span className="material-icons-round" style={{ fontSize: 14 }}>close</span>
              </button>
            )}
          </div>

          {/* Options */}
          <ul className="sv-list">
            {filtered.length === 0 && (
              <li className="sv-empty">
                <span className="material-icons-round" style={{ fontSize: 20, opacity: 0.4 }}>search_off</span>
                Vendor tidak ditemukan
              </li>
            )}
            {filtered.map(opt => {
              const active = opt.value === value
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  className={`sv-option${active ? ' sv-option--active' : ''}`}
                  onMouseDown={e => { e.preventDefault(); select(opt) }}
                >
                  <span className="material-icons-round sv-opt-icon">
                    {active ? 'check_circle' : 'storefront'}
                  </span>
                  <span className="sv-opt-text">
                    <span className="sv-opt-label">{opt.label}</span>
                    {opt.sub && <span className="sv-opt-sub">{opt.sub}</span>}
                  </span>
                  {opt.status && (
                    <span className={`sv-badge sv-badge--${opt.status.toLowerCase()}`}>
                      {opt.status}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Scoped styles ── */}
      <style>{`
        /* === Wrapper / trigger === */
        .sv-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-height: 42px;
          padding: 0 10px;
          background: #fff;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          cursor: pointer;
          user-select: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          outline: none;
          box-sizing: border-box;
        }
        .sv-wrapper:hover:not(.sv-disabled) {
          border-color: #1f4e8c;
        }
        .sv-wrapper:focus:not(.sv-disabled) {
          border-color: #1f4e8c;
          box-shadow: 0 0 0 3px rgba(31,78,140,0.12);
        }
        .sv-wrapper[aria-expanded="true"] {
          border-color: #1f4e8c;
          box-shadow: 0 0 0 3px rgba(31,78,140,0.12);
        }
        .sv-disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* === Icons & text inside trigger === */
        .sv-icon-left {
          font-size: 17px;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .sv-display-value {
          flex: 1;
          font-size: 0.875rem;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sv-placeholder {
          color: #94a3b8;
        }

        /* === Right-side actions (clear + chevron) === */
        .sv-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .sv-chevron {
          font-size: 18px;
          color: #64748b;
          transition: transform 0.2s;
        }
        .sv-clear-btn {
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border: none;
          background: #e2e8f0;
          border-radius: 50%;
          cursor: pointer;
          color: #475569;
          padding: 0;
          transition: background 0.15s;
        }
        .sv-clear-btn:hover { background: #cbd5e1; }

        /* === Dropdown menu === */
        .sv-menu {
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 280px;
        }

        /* === Search bar === */
        .sv-search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .sv-search-icon {
          font-size: 16px;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .sv-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.85rem;
          color: #1e293b;
        }
        .sv-search-input::placeholder { color: #94a3b8; }

        /* === Options list === */
        .sv-list {
          margin: 0;
          padding: 6px 0;
          list-style: none;
          overflow-y: auto;
          flex: 1;
        }
        .sv-list::-webkit-scrollbar { width: 5px; }
        .sv-list::-webkit-scrollbar-track { background: transparent; }
        .sv-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }

        .sv-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .sv-option:hover { background: #f1f5f9; }
        .sv-option--active { background: #eff6ff; }
        .sv-option--active:hover { background: #dbeafe; }

        .sv-opt-icon {
          font-size: 16px;
          color: #94a3b8;
          flex-shrink: 0;
        }
        .sv-option--active .sv-opt-icon { color: #1f4e8c; }

        .sv-opt-text {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .sv-opt-label {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sv-option--active .sv-opt-label { color: #1f4e8c; font-weight: 600; }

        .sv-opt-sub {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 1px;
        }

        /* === Badge (status) === */
        .sv-badge {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 99px;
          flex-shrink: 0;
          text-transform: capitalize;
        }
        .sv-badge--active   { background: #dcfce7; color: #16a34a; }
        .sv-badge--inactive { background: #fee2e2; color: #dc2626; }
        .sv-badge--pending  { background: #fef9c3; color: #ca8a04; }

        /* === Empty state === */
        .sv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 24px 16px;
          color: #94a3b8;
          font-size: 0.82rem;
          text-align: center;
        }
      `}</style>
    </>
  )
}