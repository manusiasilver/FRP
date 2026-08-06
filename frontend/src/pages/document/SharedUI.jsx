import React, { useEffect, useState } from 'react';

export function useIsMobile(bp = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= bp);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= bp);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bp]);
  return isMobile;
}

export const token = {
  blue:     '#1a2a57',
  blueMid:  '#2d4a8c',
  blueLight:'rgba(26,42,87,0.08)',
  border:   'rgba(26,42,87,0.09)',
  muted:    '#8a93a6',
  text:     '#1e293b',
  surface:  '#ffffff',
};

export const badgeStyles = {
  PNM: { background: '#ede9fe', color: '#5b21b6' },
  PKS: { background: '#dcfce7', color: '#166534' },
  PKP: { background: '#dbeafe', color: '#1e40af' },
};

export function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: token.muted }}>
        {label}
      </span>
      {children}
    </div>
  );
}

const inpStyle = {
  width: '100%', padding: '0.6rem 0.8rem',
  fontSize: '0.88rem', color: token.text,
  background: token.surface,
  border: `1px solid ${token.border}`,
  borderRadius: '0.5rem', outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
};
const inpRO = { ...inpStyle, background: '#f1f5f9', color: token.muted, cursor: 'not-allowed' };

export function Inp(props) {
  return (
    <input
      {...props}
      style={{ ...(props.readOnly ? inpRO : inpStyle), ...props.style }}
      onFocus={e => { if (!props.readOnly) e.target.style.borderColor = token.blueMid; }}
      onBlur={e => { e.target.style.borderColor = token.border; }}
    />
  );
}

export function Sel({ children, ...props }) {
  return <select {...props} style={{ ...inpStyle, cursor: 'pointer', ...props.style }}>{children}</select>;
}

export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.75rem 0 1rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: token.blueMid, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: token.border }} />
    </div>
  );
}

export function Btn({ children, variant = 'default', ...props }) {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${token.blue} 0%, ${token.blueMid} 100%)`, color: '#fff', border: 'none' },
    success: { background: 'linear-gradient(135deg, #057a5a 0%, #10b981 100%)', color: '#fff', border: 'none' },
    ghost:   { background: 'rgba(26,42,87,0.06)', color: token.blue, border: `1px solid ${token.border}` },
    danger:  { background: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.15)' },
    soft:    { background: 'rgba(99,102,241,0.09)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.18)' },
  };
  return (
    <button
      {...props}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.55rem 1.1rem', fontSize: '0.83rem', fontWeight: 600,
        borderRadius: '0.55rem', cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.55 : 1, transition: 'opacity 0.15s, transform 0.1s',
        fontFamily: 'inherit',
        ...(styles[variant] || styles.ghost),
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

export const card = {
  background: token.surface,
  border: '1px solid #dde3ef',
  borderRadius: '1rem',
  boxShadow: '0 2px 8px rgba(26,42,87,0.07), 0 8px 24px rgba(26,42,87,0.09), 0 24px 48px rgba(26,42,87,0.07)',
  padding: '1.5rem',
};

export const wrap = { padding: '1.5rem 1rem' };
