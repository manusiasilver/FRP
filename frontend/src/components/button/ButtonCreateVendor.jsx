import React from 'react'
import ButtonTemplate from './ButtonTemplate.jsx'

function ButtonCreateVendor({
  label, // Destructured to avoid passing it down to the DOM
  value,
  icon,
  children,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  return (
    <ButtonTemplate
      variant="primary"
      type={type}
      className={className}
      {...buttonProps}
    >
      {icon || (
        <span className="material-icons-round" style={{ fontSize: '20px' }}>
          add_circle
        </span>
      )}
      <span>{value || children || 'Create Vendor'}</span>
    </ButtonTemplate>
  )
}

export default ButtonCreateVendor
