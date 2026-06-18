import React, { useRef } from 'react'

import SearchableSelect from '../../components/template/SearchableSelect'

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
    : '-'
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
    } catch (_) {
      // Fall back to the native input click below.
    }

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

// Column width definitions — single source of truth.
// Change a value here and it applies to both the wrapper and any inner sizing.
const FIELD_WIDTHS = {
  search:     280,
  date:       160,
  requester:  220,
  budget:     220,
  attachment: 200,
  status:     200,
  division:   220,
}

export default function FilterApprovalFrp({
  isApprovedView,
  isMobile,
  filteredCount,
  filters,
  setFilters,
  requesterOptions,
  budgetOptions,
  divisionOptions,
  statusOptions,
  filterInput,
  onRefresh,
}) {
  const attachmentOptions = [
    { value: 'all',     label: 'All Attachment' },
    { value: 'with',    label: 'With Attachment'   },
    { value: 'without', label: 'Without Attachment'  },
  ]

  /**
   * Merges the parent filterInput style with mandatory sizing rules.
   * width + box-sizing MUST come last so they can never be overridden
   * by whatever the parent passes in.
   */
  const inputStyle = {
    ...filterInput,
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  }

  /**
   * Returns a wrapper style that:
   * - On mobile  → full width, no fixed sizing
   * - On desktop → exact fixed width so columns never shrink / grow
   */
  const col = (key) =>
    isMobile
      ? { width: '100%' }
      : {
          width:    `${FIELD_WIDTHS[key]}px`,
          minWidth: `${FIELD_WIDTHS[key]}px`,
          maxWidth: `${FIELD_WIDTHS[key]}px`,
          flexShrink: 0,
          flexGrow:   0,
          boxSizing:  'border-box',
        }

  return (
    <div
      style={{
        background: 'white',
        padding: isMobile ? '16px 12px' : '20px 24px',
        borderBottom: '1.5px solid #e8edf4',
        flexShrink: 0,
      }}
    >
      {/* ── Header row ─────────────────────────────────────────── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              Approval FRP
            </h2>
            <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              {filteredCount} data sesuai filter aktif
            </p>
          </div>
        </div>

        <button
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
        </button>
      </div>

      {/* ── Filter fields ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',           // uniform gap — horizontal & vertical
          alignItems: 'flex-start',
        }}
      >
        {/* Search */}
        <div style={col('search')}>
          <FilterField label="Search" icon="search">
            <input
              className="filter-input-element"
              style={inputStyle}
              placeholder="No FRP / Vendor..."
              value={filters.search}
              onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
            />
          </FilterField>
        </div>

        {/* Date */}
        <div style={col('date')}>
          <FilterField label="Date" icon="calendar_month">
            <DateField
              value={filters.date}
              onChange={(e) => setFilters((c) => ({ ...c, date: e.target.value }))}
              style={inputStyle}
            />
          </FilterField>
        </div>

        {/* Request By */}
        <div style={col('requester')}>
          <FilterField label="Requesters" icon="person">
            <SearchableSelect
              value={filters.requester}
              onChange={(v) => setFilters((c) => ({ ...c, requester: v }))}
              options={requesterOptions}
              placeholder="All Requesters"
              style={inputStyle}
            />
          </FilterField>
        </div>

        {/* Budget */}
        <div style={col('budget')}>
          <FilterField label="Budget" icon="account_balance_wallet">
            <SearchableSelect
              value={filters.budgetId}
              onChange={(v) => setFilters((c) => ({ ...c, budgetId: v }))}
              options={budgetOptions}
              placeholder="Budget ID"
              style={inputStyle}
            />
          </FilterField>
        </div>

        {/* Attachment */}
        <div style={col('attachment')}>
          <FilterField label="Attachment" icon="attachment">
            <SearchableSelect
              value={filters.attachment}
              onChange={(v) => setFilters((c) => ({ ...c, attachment: v }))}
              options={attachmentOptions}
              placeholder="All Attachments"
              style={inputStyle}
            />
          </FilterField>
        </div>

        {/* Status — only on approved view */}
        {isApprovedView && (
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
        )}

        {/* Division */}
        <div style={col('division')}>
          <FilterField label="Division" icon="business">
            <SearchableSelect
              value={filters.division}
              onChange={(v) => setFilters((c) => ({ ...c, division: v }))}
              options={divisionOptions}
              placeholder="All Divisions"
              style={inputStyle}
            />
          </FilterField>
        </div>
      </div>
    </div>
  )
}
