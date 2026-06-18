import { useState } from 'react'

function ButtonReject({
  children,
  className = '',
  tone = 'danger',
  type = 'button',
  disabled = false,
  ...buttonProps
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type={type}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: disabled ? '#f8fafc' : (isHovered ? '#fee2e2' : 'white'),
        color: disabled ? '#94a3b8' : (isHovered ? '#dc2626' : '#ef4444'), 
        border: '1px solid transparent', 
        borderColor: disabled ? '#e2e8f0' : (isHovered ? '#fca5a5' : 'transparent'),
        borderRadius: '24px',
        padding: '4px 10px', 
        fontSize: '11px', 
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.72 : 1,
      }}
      disabled={disabled}
      onMouseEnter={() => { if (!disabled) setIsHovered(true) }}
      onMouseLeave={() => setIsHovered(false)}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '14px' }}>
        close
      </span>
      {children}
    </button>
  )
}

export default ButtonReject
