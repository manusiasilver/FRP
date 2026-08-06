const buttonClassNames = {
  detail: 'users-table__detail-button',
  accordion: 'users-table__accordion-button',
  icon: 'users-table__icon-button',
  pagination: 'users-table-pagination__button',
}

function CreateButton({
  children,
  className = '',
  variant = 'accordion',
  tone = 'default',
  active = false,
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    buttonClassNames[variant] ?? buttonClassNames.accordion,
    variant === 'accordion' && tone === 'danger' ? 'users-table__accordion-button--danger' : '',
    variant === 'accordion' && tone === 'primary' ? 'users-table__accordion-button--primary' : '',
    variant === 'accordion' && tone === 'warning' ? 'users-table__accordion-button--warning' : '',
    variant === 'accordion' && tone === 'neutral' ? 'users-table__accordion-button--neutral' : '',
    variant === 'icon' && tone === 'danger' ? 'users-table__icon-button--danger' : '',
    variant === 'pagination' && active ? 'users-table-pagination__button--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={buttonClassName} {...buttonProps}>
      {children}
    </button>
  )
}

export default CreateButton
