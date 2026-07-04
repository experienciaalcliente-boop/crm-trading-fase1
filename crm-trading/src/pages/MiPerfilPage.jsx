import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updatePin, fetchAllUsers, resetPin } from '../lib/api'
import { Loader2, KeyRound, RefreshCw, Check } from 'lucide-react'
import toast from 'react-hot-toast'

function CambiarPin({ user }) {
  const [pinActual, setPinActual] = useState('')
  const [pinNuevo,  setPinNuevo]  = useState('')
  const [pinConf,   setPinConf]   = useState('')
  const [saving,    setSaving]    = useState(false)

  const guardar = async () => {
    if (pinNuevo.length < 4) { toast.error('El PIN debe tener al menos 4 dígitos'); return }
    if (pinNuevo !== pinConf) { toast.error('Los PINs nuevos no coinciden'); return }
    setSaving(true)
    try {
      await updatePin(user.dni, pinActual, pinNuevo)
      toast.success('PIN actualizado correctamente ✓')
      setPinActual(''); setPinNuevo(''); setPinConf('')
    } catch (err) {
      toast.error(err.message || 'Error al actualizar PIN')
    } finally { setSaving(false) }
  }

  return (
    <div className="crm-card" style={{ padding:24, maxWidth:400 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <KeyRound size={16} style={{ color:'#7ab3ff' }} />
        <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:15, margin:0 }}>Cambiar mi PIN</h3>
      </div>

      {[
        { label:'PIN actual',       val:pinActual, set:setPinActual },
        { label:'Nuevo PIN',        val:pinNuevo,  set:setPinNuevo  },
        { label:'Confirmar nuevo PIN', val:pinConf, set:setPinConf  },
      ].map(({ label, val, set }) => (
        <div key={label} style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>{label}</label>
          <input
            type="password" maxLength={8}
            value={val} onChange={e => set(e.target.value.replace(/\D/g, ''))}
            placeholder="● ● ● ●"
            style={{ width:'100%', padding:'10px 14px', textAlign:'center', letterSpacing:'0.3em', fontSize:18,
              background:'var(--bg-input)', border:'1.5px solid #2e3d5c', borderRadius:8, color:'var(--text-primary)', outline:'none', boxSizing:'border-box' }}
          />
        </div>
      ))}

      <button onClick={guardar} disabled={saving || !pinActual || !pinNuevo || !pinConf}
        className="crm-btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:4 }}>
        {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Check size={14} /> Actualizar PIN</>}
      </button>
    </div>
  )
}

function GestionUsuarios({ token }) {
  const [usuarios,    setUsuarios]    = useState([])
  const [cargado,     setCargado]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [pinReset,    setPinReset]    = useState({}) // { userId: '1234' }
  const [resetting,   setResetting]   = useState(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await fetchAllUsers(token)
      setUsuarios(data)
      setCargado(true)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }

  const resetear = async (user) => {
    const nuevoPin = pinReset[user.id] || ''
    if (nuevoPin.length < 4) { toast.error('Ingresa un PIN de al menos 4 dígitos'); return }
    setResetting(user.id)
    try {
      await resetPin(token, user.id, nuevoPin)
      toast.success(`PIN de ${user.nombre} reseteado ✓`)
      setPinReset(p => ({ ...p, [user.id]: '' }))
    } catch { toast.error('Error al resetear PIN') }
    finally { setResetting(null) }
  }

  const ROL_COLOR = { supervisor:'#f5b93a', asesora:'#7ab3ff', orientador:'#b89eff' }

  return (
    <div className="crm-card" style={{ padding:24, maxWidth:600 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <RefreshCw size={16} style={{ color:'#f5b93a' }} />
          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:15, margin:0 }}>Gestión de usuarios</h3>
        </div>
        {!cargado && (
          <button className="crm-btn crm-btn-sm" onClick={cargar} disabled={loading}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Cargar usuarios'}
          </button>
        )}
      </div>

      {!cargado ? (
        <p style={{ fontSize:13, color:'var(--text-muted)' }}>Haz clic en "Cargar usuarios" para ver y gestionar los PINs del equipo.</p>
      ) : usuarios.map(u => (
        <div key={u.id} style={{ padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{u.nombre}</div>
            <div style={{ fontSize:11, color: ROL_COLOR[u.rol] || '#506080', marginTop:2, fontWeight:600, textTransform:'capitalize' }}>{u.rol} · DNI: {u.dni}</div>
          </div>
          <input
            type="password" maxLength={8} placeholder="Nuevo PIN"
            value={pinReset[u.id] || ''}
            onChange={e => setPinReset(p => ({ ...p, [u.id]: e.target.value.replace(/\D/g,'') }))}
            style={{ width:110, padding:'6px 10px', textAlign:'center', letterSpacing:'0.2em',
              background:'var(--bg-input)', border:'1px solid #2e3d5c', borderRadius:7, color:'var(--text-primary)',
              fontSize:14, outline:'none' }}
          />
          <button onClick={() => resetear(u)} disabled={resetting === u.id || !pinReset[u.id]}
            style={{ padding:'6px 12px', borderRadius:7, background:'rgba(245,166,35,0.12)',
              border:'1px solid rgba(245,166,35,0.3)', color:'#f5b93a', cursor:'pointer',
              fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            {resetting === u.id ? <Loader2 size={11} className="animate-spin" /> : <><RefreshCw size={11} /> Resetear</>}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function MiPerfilPage() {
  const { user, token } = useAuth()

  return (
    <div style={{ padding:24, maxWidth:700 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:20, margin:0 }}>Mi perfil</h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
          {user?.nombre} · <span style={{ color:'#7ab3ff', textTransform:'capitalize' }}>{user?.rol}</span>
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <CambiarPin user={user} />
        {user?.rol === 'supervisor' && <GestionUsuarios token={token} />}
      </div>
    </div>
  )
}
