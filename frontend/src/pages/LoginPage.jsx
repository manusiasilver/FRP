import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const S = {
  body: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  card: { background: 'white', padding: '3rem', borderRadius: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '450px', textAlign: 'center', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  iconBox: { width: '80px', height: '80px', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 2rem', boxShadow: '0 10px 25px rgba(79,70,229,0.3)' },
  h1: { fontSize: '1.875rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem' },
  subtitle: { color: '#64748b', margin: '0 0 2.5rem' },
  formGroup: { textAlign: 'left', marginBottom: '1.5rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' },
  input: { width: '100%', padding: '1rem', border: '1.5px solid #e2e8f0', borderRadius: '1rem', fontSize: '1rem', boxSizing: 'border-box', background: '#f8fafc', outline: 'none' },
  btn: { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', color: 'white', border: 'none', borderRadius: '1rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' },
  error: { background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 },
}

export default function LoginPage() {
  const [params] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(params.get('error') ? 'Nama atau Password salah' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (data.success) window.location.href = data.redirect
      else setError(data.error || 'Login gagal')
    } catch { setError('Gagal terhubung ke server') }
    finally { setLoading(false) }
  }

  return (
    <div style={S.body}>
      <div style={S.card}>
        <div style={S.iconBox}><span className="material-icons-round" style={{ fontSize: '2.5rem' }}>lock_person</span></div>
        <h1 style={S.h1}>FRP System</h1>
        <p style={S.subtitle}>Silakan masuk untuk melanjutkan</p>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={S.formGroup}>
            <label style={S.label}>Username</label>
            <input style={S.input} placeholder="Contoh: budi.santoso" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Password</label>
            <input type="password" style={S.input} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>
    </div>
  )
}
