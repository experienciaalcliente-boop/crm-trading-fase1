import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'
import BrandMark from '../components/shared/BrandMark'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const pinRef = useRef(null)

  const handleSubmit = async () => {
    if (!dni || pin.length < 4) return
    await login(dni, pin)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <BrandMark size={64} />
          </div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:24, margin:0 }}>Experiencia al Cliente</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:6 }}>Burs Advisory</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-default)', borderRadius:16, padding:28 }}>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:24, textAlign:'center' }}>
            Ingresa tu DNI y PIN de acceso
          </p>

          {/* DNI input */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>DNI</label>
            <input
              type="text"
              maxLength={15}
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && pinRef.current?.focus()}
              autoFocus
              placeholder="Ingresa tu DNI"
              style={{
                width:'100%', padding:'12px 16px', background:'var(--bg-input)',
                border:'1.5px solid var(--border-input)', borderRadius:10,
                color:'var(--text-primary)', outline:'none', boxSizing:'border-box', fontSize:15,
              }}
            />
          </div>

          {/* PIN input */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>PIN</label>
            <input
              ref={pinRef}
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKey}
              placeholder="● ● ● ●"
              style={{
                width:'100%', padding:'12px 16px', textAlign:'center', letterSpacing:'0.4em',
                fontSize:20, background:'var(--bg-input)', border:'1.5px solid var(--border-input)', borderRadius:10,
                color:'var(--text-primary)', outline:'none', boxSizing:'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(240,92,92,0.1)', border:'1px solid rgba(240,92,92,0.25)', color:'#f07070', fontSize:12, marginBottom:16, textAlign:'center' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !dni || pin.length < 4}
            style={{ width:'100%', padding:'12px 0', borderRadius:10, background: (dni && pin.length >= 4) ? 'var(--accent)' : 'var(--bg-input)',
              border:'none', color: (dni && pin.length >= 4) ? '#fff' : 'var(--text-faint)', fontSize:14, fontWeight:700, cursor: (dni && pin.length >= 4) ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : 'Ingresar'}
          </button>
        </div>

        <p style={{ textAlign:'center', color:'var(--text-faint)', fontSize:11, marginTop:20 }}>
          Burs Advisory · Acceso restringido
        </p>
      </div>
    </div>
  )
}
