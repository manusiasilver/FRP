import React from 'react'


function ButtonCreateBudgets({
  label, // Destructured to avoid passing it down to the DOM
  value,
  icon,
  children,
  className = '',
  type = 'button',
  compact = false,
  style,
  ...buttonProps
}) {
  return (
    <button
      type={type}
      className={`frp-btn-primary ${className}`.trim()}
      style={{
        ...(compact
          ? {
              width: '52px',
              minWidth: '52px',
              height: '46px',
              padding: 0,
              borderRadius: '12px',
              gap: 0,
              flexShrink: 0,
            }
          : {}),
        ...style,
      }}
      {...buttonProps}
    >
      {icon || (
        <span className="material-icons-round" style={{ fontSize: '16px' }}>
          add
        </span>
      )}
      {!compact && (value || children || 'Add Items')}
    </button>
  )
}

export default ButtonCreateBudgets
