function ButtonDetailStatusRp({ children = 'Detail', type = 'button', ...buttonProps }) {
  return (
    <button
      type={type}
      {...buttonProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        padding: '6px 10px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '12px',
        fontFamily: 'inherit',
        ...buttonProps.style,
      }}
    >
      <span className="material-icons-round" style={{ fontSize: '15px' }}>
        open_in_new
      </span>
      {children}
    </button>
  )
}

export default ButtonDetailStatusRp
