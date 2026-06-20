import { Outlet, NavLink } from 'react-router-dom'
import { Phone, Upload, BarChart2, CreditCard, MonitorSmartphone, ChevronRight, GraduationCap, LogOut, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import BuscadorGlobal from './BuscadorGlobal'

const NAV = [
  { to:'/dashboard',   icon:BarChart2,        label:'Dashboard',       sub:'Vista ejecutiva',      roles:['supervisor','asesora','orientador'] },
  { to:'/llamadas',    icon:Phone,             label:'Seguimiento',     sub:'Registro de llamadas', roles:['supervisor','asesora'] },
  { to:'/recaudacion', icon:CreditCard,        label:'Recaudación',     sub:'Cuotas y pagos',       roles:['supervisor'] },
  { to:'/orientacion', icon:MonitorSmartphone, label:'Orient. Técnica', sub:'Agenda y sesiones',    roles:['supervisor','asesora','orientador'] },
  { to:'/onboarding',  icon:GraduationCap,     label:'Onboarding',      sub:'Próximas promociones', roles:['supervisor','asesora'] },
  { to:'/importar',    icon:Upload,            label:'Importar',        sub:'CSV / Excel',          roles:['supervisor'] },
]

const ROL_COLORS = {
  supervisor: '#f5b93a',
  asesora:    '#7ab3ff',
  orientador: '#b89eff',
}

export default function AppShell() {
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const rol = user?.rol || 'supervisor'

  const navFiltrado = NAV.filter(n => n.roles.includes(rol))

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#0b0e14' }}>
      <aside style={{ width:220, flexShrink:0, background:'#0f1520', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' }}>
        {/* Logo */}
        <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#4e8fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:14, flexShrink:0 }}>A</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'#fff', fontSize:13, lineHeight:1 }}>AcademiaCRM</div>
              <div style={{ fontSize:9, color:'#3d5070', marginTop:2 }}>Trading School · V3.1</div>
            </div>
          </div>
          {/* Buscador */}
          <BuscadorGlobal />
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:10, overflowY:'auto' }}>
          {navFiltrado.map(({ to, icon:Icon, label, sub }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
              borderRadius:10, marginBottom:2, textDecoration:'none', transition:'all 0.15s',
              background: isActive ? 'rgba(78,143,255,0.12)' : 'transparent',
              border:`1px solid ${isActive ? 'rgba(78,143,255,0.25)' : 'transparent'}`,
              color: isActive ? '#4e8fff' : '#506080',
            })}>
              {({ isActive }) => (<>
                <Icon size={14} style={{ flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, lineHeight:1 }}>{label}</div>
                  <div style={{ fontSize:10, marginTop:2, color: isActive ? 'rgba(78,143,255,0.6)' : '#2e3d5c' }}>{sub}</div>
                </div>
                {isActive && <ChevronRight size={12} style={{ opacity:0.5 }} />}
              </>)}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          {user && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f4' }}>{user.nombre}</div>
                <div style={{ fontSize:10, color: ROL_COLORS[user.rol] || '#506080', marginTop:1, fontWeight:600, textTransform:'capitalize' }}>{user.rol}</div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={() => navigate('/perfil')} title="Mi perfil / Cambiar PIN"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#3d5070', padding:4, display:'flex' }}>
                  <UserCircle size={14} />
                </button>
                <button onClick={logout} title="Cerrar sesión"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#3d5070', padding:4, display:'flex' }}>
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}
          <div style={{ fontSize:10, color:'#2a3450', textTransform:'capitalize' }}>{hoy}</div>
        </div>
      </aside>

      <main style={{ flex:1, overflowY:'auto', background:'#0b0e14' }}>
        <Outlet />
      </main>
    </div>
  )
}
