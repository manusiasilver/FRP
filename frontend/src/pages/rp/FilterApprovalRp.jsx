import React, { useRef } from 'react'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function DateField({ value, onChange, placeholder = 'Select Date', style }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!inputRef.current) return
    try {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker()
        return
      }
    } catch (_) { }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onClick={openPicker}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />
      <div
        className="filter-input-element"
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          color: value ? '#1e293b' : '#94a3b8',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDate(value) : placeholder}
        </span>
      </div>
    </div>
  )
}

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
            zIndex: 1000000,
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
              zIndex: 1000000,
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

// Column width definitions - single source of truth.
// Change a value here and it applies to both the wrapper and any inner sizing.
const FIELD_WIDTHS = {
  search: 280,
  date: 160,
  creator: 220,
  status: 200,
  division: 220,
  processor: 220,
}

export default function FilterApprovalRp({
  filters,
  setFilters,
  searchValue = '',
  onSearchChange,
  creatorOptions,
  statusOptions,
  divisionOptions,
  processorOptions,
  isMobile,
  filteredCount = 0,
  onRefresh,
}) {
  const filterInput = {
    width: '100%',
    padding: '10px 14px 10px 40px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: '#f8fafc',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#0f172a',
    minHeight: '44px',
    transition: 'all 0.2s ease',
  }

  const inputStyle = {
    ...filterInput,
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  }

  const col = (key) =>
    isMobile
      ? { width: '100%' }
      : {
          width: `${FIELD_WIDTHS[key]}px`,
          minWidth: `${FIELD_WIDTHS[key]}px`,
          maxWidth: `${FIELD_WIDTHS[key]}px`,
          flexShrink: 0,
          flexGrow: 0,
          boxSizing: 'border-box',
        }

  return (
    <>
      <style>{`
        .filter-input-element {
          transition: all 0.2s ease-in-out;
        }
        .filter-input-element:focus, .filter-input-element:hover {
          background: white !important;
          border-color: #1f4e8c !important;
          box-shadow: 0 0 0 3px rgba(31, 78, 140, 0.15) !important;
        }
      `}</style>
      <div
        style={{
          background: 'white',
          padding: isMobile ? '16px 12px' : '20px 24px',
          borderBottom: '1.5px solid #e8edf4',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#e6f2f0',
                display: 'grid',
                placeItems: 'center',
                color: '#1e5e4d',
                flexShrink: 0,
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px' }}>filter_alt</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                Approval RP
              </h2>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {filteredCount} data sesuai filter aktif
              </p>
            </div>
          </div> */}

          {/* <button
            type="button"
            onClick={onRefresh}
            title="Segarkan data"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1.5px solid #dbe5f0',
              background: 'white',
              color: '#475569',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.borderColor = '#dbe5f0'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
          </button> */}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'flex-start',
          }}
        >
          <div style={col('search')}>
            <FilterField label="Cari" icon="search">
              <input
                className="filter-input-element"
                style={inputStyle}
                placeholder="No RP / Vendor..."
                value={onSearchChange ? searchValue : filters.search}
                onChange={(e) => onSearchChange ? onSearchChange(e.target.value) : setFilters((c) => ({ ...c, search: e.target.value }))}
              />
            </FilterField>
          </div>

          <div style={col('date')}>
            <FilterField label="Tanggal" icon="calendar_month">
              <DateField
                value={filters.date}
                onChange={(e) => setFilters((c) => ({ ...c, date: e.target.value }))}
                style={inputStyle}
              />
            </FilterField>
          </div>

          <div style={col('creator')}>
            <FilterField label="Requester" icon="person">
              <SearchableSelect
                value={filters.creator}
                onChange={(v) => setFilters((c) => ({ ...c, creator: v }))}
                options={creatorOptions}
                placeholder="All Requester"
                style={inputStyle}
              />
            </FilterField>
          </div>

          <div style={col('status')}>
            <FilterField label="Status" icon="rule">
              <SearchableSelect
                value={filters.status}
                onChange={(v) => setFilters((c) => ({ ...c, status: v }))}
                options={statusOptions}
                placeholder="All Status"
                style={inputStyle}
              />
            </FilterField>
          </div>

          <div style={col('division')}>
            <FilterField label="Dvision" icon="business">
              <SearchableSelect
                value={filters.division}
                onChange={(v) => setFilters((c) => ({ ...c, division: v }))}
                options={divisionOptions}
                placeholder="All Divisions"
                style={inputStyle}
              />
            </FilterField>
          </div>

          <div style={col('processor')}>
            <FilterField label="Diproses" icon="engineering">
              <SearchableSelect
                value={filters.processor}
                onChange={(v) => setFilters((c) => ({ ...c, processor: v }))}
                options={processorOptions}
                placeholder="All Process"
                style={inputStyle}
              />
            </FilterField>
          </div>
        </div>
      </div>
    </>
  )
}
