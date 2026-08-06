const buttonClassNames = {
  detail: 'users-table__detail-button',
  accordion: 'users-table__accordion-button',
  icon: 'users-table__icon-button',
  pagination: 'users-table-pagination__button',
  primary: 'dashboard-popup__button dashboard-popup__button--primary',
}

function ButtonTemplate({
  children,
  className = '',
  variant = 'primary',
  tone = 'default',
  active = false,
  hasIndicator = false,
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    buttonClassNames[variant] ?? buttonClassNames.primary,
    variant === 'accordion' && tone === 'danger' ? 'users-table__accordion-button--danger' : '',
    variant === 'accordion' && tone === 'warning' ? 'users-table__accordion-button--warning' : '',
    variant === 'detail' && hasIndicator ? 'users-table__detail-button--indicator' : '',
    variant === 'accordion' && hasIndicator ? 'users-table__accordion-button--indicator' : '',
    variant === 'icon' && tone === 'danger' ? 'users-table__icon-button--danger' : '',
    variant === 'pagination' && active ? 'users-table-pagination__button--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <style>{`
        .users-table__detail-button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.55rem 0.9rem;
          border: 1px solid rgba(42, 157, 143, 0.22);
          border-radius: 999px;
          background: rgba(42, 157, 143, 0.08);
          color: #18786e;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .users-table__detail-button:hover {
          transform: translateY(-1px);
          border-color: rgba(42, 157, 143, 0.35);
          background: rgba(42, 157, 143, 0.14);
          box-shadow: 0 10px 20px rgba(26, 42, 87, 0.08);
        }

        .users-table__detail-button:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 4px rgba(42, 157, 143, 0.14),
            0 10px 20px rgba(26, 42, 87, 0.08);
        }

        .users-table__accordion-button {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 0.9rem;
          border: 1px solid rgba(42, 157, 143, 0.22);
          border-radius: 12px;
          background: rgba(42, 157, 143, 0.09);
          color: #18786e;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .users-table__accordion-button:hover {
          transform: translateY(-1px);
          border-color: rgba(42, 157, 143, 0.35);
          background: rgba(42, 157, 143, 0.14);
          box-shadow: 0 12px 20px rgba(26, 42, 87, 0.08);
        }

        .users-table__accordion-button:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 4px rgba(42, 157, 143, 0.14),
            0 12px 20px rgba(26, 42, 87, 0.08);
        }

        .users-table__accordion-button--danger {
          border-color: rgba(239, 68, 68, 0.22);
          background: rgba(239, 68, 68, 0.09);
          color: #b42318;
        }

        .users-table__accordion-button--danger:hover {
          border-color: rgba(239, 68, 68, 0.34);
          background: rgba(239, 68, 68, 0.14);
        }

        .users-table__accordion-button--warning {
          border-color: rgba(233, 196, 106, 0.38);
          background: rgba(233, 196, 106, 0.12);
          color: #8a680f;
        }

        .users-table__accordion-button--warning:hover {
          border-color: rgba(233, 196, 106, 0.54);
          background: rgba(233, 196, 106, 0.18);
        }

        .users-table__detail-button--indicator,
        .users-table__accordion-button--indicator {
          position: relative;
        }

        .users-table__detail-button--indicator::after,
        .users-table__accordion-button--indicator::after {
          content: '';
          position: absolute;
          top: -4px;
          right: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #f59e0b;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
          animation: pulse-gold-indicator 2s infinite;
          z-index: 2;
        }

        .users-table__icon-button {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(233, 196, 106, 0.38);
          border-radius: 12px;
          background: rgba(233, 196, 106, 0.12);
          color: var(--accent-gold);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .users-table__icon-button:hover {
          transform: translateY(-1px);
          border-color: rgba(233, 196, 106, 0.54);
          background: rgba(233, 196, 106, 0.18);
          box-shadow: 0 10px 20px rgba(233, 196, 106, 0.18);
        }

        .users-table__icon-button:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 4px rgba(233, 196, 106, 0.2),
            0 10px 20px rgba(233, 196, 106, 0.18);
        }

        .users-table__icon-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .users-table__icon-button--danger {
          border-color: rgba(239, 68, 68, 0.22);
          background: rgba(239, 68, 68, 0.09);
          color: #b42318;
        }

        .users-table__icon-button--danger:hover {
          border-color: rgba(239, 68, 68, 0.34);
          background: rgba(239, 68, 68, 0.14);
          box-shadow: 0 10px 20px rgba(180, 35, 24, 0.14);
        }

        .users-table-pagination__button {
          min-width: 42px;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.65rem 0.95rem;
          border: 1px solid rgba(26, 42, 87, 0.12);
          border-radius: 12px;
          background: #fff;
          color: var(--primary-blue);
          font-weight: 600;
          cursor: pointer;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .users-table-pagination__button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(42, 157, 143, 0.35);
          box-shadow: 0 10px 20px rgba(26, 42, 87, 0.08);
        }

        .users-table-pagination__button:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 4px rgba(42, 157, 143, 0.14),
            0 10px 20px rgba(26, 42, 87, 0.08);
        }

        .users-table-pagination__button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .users-table-pagination__button--active {
          border-color: transparent;
          background: linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-teal-dark) 100%);
          color: #fff;
          box-shadow: 0 12px 24px rgba(42, 157, 143, 0.22);
        }

        .dashboard-popup__button {
          min-width: 104px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.75rem 1.2rem;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .dashboard-popup__button:hover {
          transform: translateY(-1px);
        }

        .dashboard-popup__button--primary {
          border: none;
          background: linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-teal-dark) 100%);
          color: #fff;
          box-shadow: 0 10px 24px rgba(42, 157, 143, 0.28);
        }

        .dashboard-popup__button--primary:hover {
          box-shadow: 0 14px 30px rgba(42, 157, 143, 0.34);
        }
      `}</style>
      <button type={type} className={buttonClassName} {...buttonProps}>
        {children}
      </button>
    </>
  )
}

export default ButtonTemplate
