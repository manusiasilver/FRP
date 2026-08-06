import React from 'react'

function FilterField({ label, icon, children }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            left: '12px',
            background: 'white',
            padding: '0 6px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#64748b',
            zIndex: 3,
            pointerEvents: 'none',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span
            className="material-icons-round"
            style={{
              position: 'absolute',
              left: '12px',
              color: '#64748b',
              fontSize: '18px',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

export default function FilterVendor({ filters, setFilters }) {
  const filterInput = {
    width: '100%',
    padding: '9px 12px 9px 36px',
    borderRadius: '12px',
    border: '1.5px solid #dbe5f0',
    fontSize: '13px',
    background: 'white',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1e293b',
    minHeight: '42px',
  }

  return (
    <>
      <style>{`
        .filter-input-element {
          transition: all 0.2s ease-in-out;
        }
        .filter-input-element:focus, .filter-input-element:hover {
          border-color: #1e5e4d !important;
          box-shadow: 0 0 0 3px rgba(30, 94, 77, 0.15) !important;
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          width: '100%',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 400px)',
            gap: '12px',
            flex: 1,
          }}
        >
          {/* Search */}
          <FilterField label="Cari" icon="search">
            <input
              className="filter-input-element"
              style={filterInput}
              placeholder="Nama Vendor / Bank / Rekening..."
              value={filters?.search || ''}
              onChange={(e) => setFilters?.((c) => ({ ...c, search: e.target.value }))}
            />
          </FilterField>
        </div>
      </div>
    </>
  )
}
