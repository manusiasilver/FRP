import { useState } from 'react'

function ButtonPreview({
  children,
  className = '',
  tone = 'neutral',
  type = 'button',
  ...buttonProps
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type={type}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: isHovered ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
        color: '#4f46e5',
        border: `1.5px solid ${isHovered ? 'rgba(99, 102, 241, 0.6)' : 'rgba(99, 102, 241, 0.4)'}`,
        borderRadius: '24px',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: isHovered ? '0 6px 16px rgba(99,102,241,0.1)' : '0 4px 12px rgba(99,102,241,0.05)',
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '16px' }}>
        visibility
      </span>
      {children}
    </button>
  )
}

export default ButtonPreview
