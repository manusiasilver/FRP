import { useState } from 'react'

function ButtonApprove({
  children,
  className = '',
  tone = 'approve',
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
        background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white', 
        border: 'none', 
        borderRadius: '24px',
        padding: '4px 12px', 
        fontSize: '11px', 
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : (isHovered ? '0 4px 10px rgba(16,185,129,0.4)' : '0 2px 6px rgba(16,185,129,0.3)'),
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: disabled ? 'translateY(0)' : (isHovered ? 'translateY(-1px)' : 'translateY(0)'),
        opacity: disabled ? 0.72 : 1,
      }}
      disabled={disabled}
      onMouseEnter={() => { if (!disabled) setIsHovered(true) }}
      onMouseLeave={() => setIsHovered(false)}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '14px' }}>
        check
      </span>
      {children}
    </button>
  )
}

export default ButtonApprove
