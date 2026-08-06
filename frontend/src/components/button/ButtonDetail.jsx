import { useState } from 'react'

function ButtonDetail({
  children,
  className = '',
  variant = 'action',
  type = 'button',
  ...buttonProps
}) {
  const [isHovered, setIsHovered] = useState(false)

  if (variant === 'approve') {
    return (
      <button
        type={type}
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white', 
          border: 'none', 
          borderRadius: '24px',
          padding: '4px 12px', 
          fontSize: '11px', 
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: isHovered ? '0 4px 10px rgba(16,185,129,0.4)' : '0 2px 6px rgba(16,185,129,0.3)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...buttonProps}
      >
        <span className="material-icons-round" style={{ fontSize: '14px' }}>
          open_in_new
        </span>
        {children}
      </button>
    )
  }

  return (
    <button
      type={type}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white', 
        border: 'none', 
        borderRadius: '24px',
        padding: '4px 12px', 
        fontSize: '11px', 
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: isHovered ? '0 4px 10px rgba(59,130,246,0.4)' : '0 2px 6px rgba(59,130,246,0.3)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '14px' }}>
        open_in_new
      </span>
      {children}
    </button>
  )
}

export default ButtonDetail
