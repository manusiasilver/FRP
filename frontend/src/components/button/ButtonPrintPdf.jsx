import { useState } from 'react'

function ButtonPrintPdf({
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
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: isHovered ? '#f8fafc' : 'white',
        color: isHovered ? '#1e293b' : '#334155', 
        border: '1px solid transparent', 
        borderColor: isHovered ? '#cbd5e1' : 'transparent',
        borderRadius: '24px',
        padding: '4px 10px', 
        fontSize: '11px', 
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '16px' }}>
        print
      </span>
      {children}
    </button>
  )
}

export default ButtonPrintPdf
