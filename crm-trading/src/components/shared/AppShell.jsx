// v-20260622-1614
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Phone, Upload, BarChart2, CreditCard, MonitorSmartphone, ChevronRight, ChevronDown, GraduationCap, LogOut, UserCircle, Sun, Moon, ShoppingBag, CalendarCheck, Award, RotateCcw, HeartHandshake, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { tieneProximaPromocion } from '../../lib/api'
import BuscadorGlobal from './BuscadorGlobal'
import BrandMark from './BrandMark'

export const NAV = [
  { to:'/dashboard',   icon:BarChart2,        label:'Dashboard',       sub:'Vista ejecutiva',      roles:['supervisor','asesora','orientador'], group:null },

  { to:'/llamadas',    icon:Phone,             label:'Seguimiento',     sub:'Registro de llamadas', roles:['supervisor','asesora'], group:'Gestión de Experiencia' },
  { to:'/seguimiento-semanal', icon:CalendarCheck, label:'Seg. Semanal', sub:'Contacto por semana',  roles:['supervisor','asesora'], group:'Gestión de Experiencia' },
  { to:'/orientacion', icon:MonitorSmartphone, label:'Orient. Técnica', sub:'Agenda y sesiones',    roles:['supervisor','asesora','orientador'], group:'Gestión de Experiencia' },
  { to:'/onboarding',  icon:GraduationCap,     label:'Onboarding',      sub:'Próximas promociones', roles:['supervisor','asesora'], group:'Gestión de Experiencia' },
  { to:'/recaudacion', icon:CreditCard,        label:'Recaudación',     sub:'Cuotas y pagos',       roles:['supervisor'], group:'Gestión de Experiencia' },

  { to:'/complementos',icon:ShoppingBag,       label:'Complementos',    sub:'Venta de complementos', roles:['supervisor','asesora','orientador'], group:'Ventas y Comisiones' },
  { to:'/comisiones',  icon:Award,             label:'Comisiones',      sub:'Bono de incentivos',   roles:['supervisor','asesora','orientador'], group:'Ventas y Comisiones' },

  { to:'/reactivate',  icon:RotateCcw,         label:'Reactivate Burs', sub:'Exalumnos retirados',  roles:['supervisor'], group:'Plan Reactivate' },

  { to:'/importar',    icon:Upload,            label:'Importar',        sub:'CSV / Excel',          roles:['supervisor'], group:null },
]

const ROL_COLORS = {
  supervisor: '#f5b93a',
  asesora:    '#7ab3ff',
  orientador: '#b89eff',
}

const GROUP_ICONS = {
  'Gestión de Experiencia': HeartHandshake,
  'Ventas y Comisiones':    Wallet,
  'Plan Reactivate':        RotateCcw,
}

// Convierte la lista plana de NAV (ya filtrada por rol) en entradas para
// renderizar: los ítems sin group van sueltos, y los que comparten group
// consecutivo se agrupan bajo una sola "pestaña" plegable.
function agruparNav(navFiltrado) {
  const entradas = []
  let grupoActual = null
  for (const item of navFiltrado) {
    if (!item.group) {
      entradas.push({ tipo: 'item', item })
      grupoActual = null
      continue
    }
    if (grupoActual && grupoActual.nombre === item.group) {
      grupoActual.items.push(item)
    } else {
      grupoActual = { tipo: 'grupo', nombre: item.group, items: [item] }
      entradas.push(grupoActual)
    }
  }
  return entradas
}

function ItemNav({ to, Icon, label, sub }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
      borderRadius:10, marginBottom:2, textDecoration:'none', transition:'all 0.15s',
      background: isActive ? 'var(--accent-light)' : 'transparent',
      border:`1px solid ${isActive ? 'rgba(78,143,255,0.4)' : 'transparent'}`,
      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    })}>
      {({ isActive }) => (<>
        <Icon size={14} style={{ flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, lineHeight:1 }}>{label}</div>
          <div style={{ fontSize:10, marginTop:2, color: isActive ? 'rgba(101,167,166,0.6)' : 'var(--text-faint)' }}>{sub}</div>
        </div>
        {isActive && <ChevronRight size={12} style={{ opacity:0.5 }} />}
      </>)}
    </NavLink>
  )
}

export default function AppShell() {
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const rol = user?.rol || 'supervisor'

  // Onboarding solo se muestra a la asesora si tiene un alumno propio con
  // un programa por iniciar (ej. está en julio, tiene un alumno de agosto).
  // Supervisor lo ve siempre, sin esta condición.
  const [tieneProximaPromo, setTieneProximaPromo] = useState(rol !== 'asesora')
  useEffect(() => {
    if (rol !== 'asesora') { setTieneProximaPromo(true); return }
    let activo = true
    tieneProximaPromocion(user?.asesora_id).then(r => { if (activo) setTieneProximaPromo(r) })
    return () => { activo = false }
  }, [rol, user?.asesora_id])

  const navFiltrado = NAV
    .filter(n => n.roles.includes(rol))
    .filter(n => n.to !== '/onboarding' || tieneProximaPromo)

  const navAgrupado = agruparNav(navFiltrado)

  // La pestaña que contiene la ruta activa arranca abierta (por ejemplo, al
  // recargar la página estando en /recaudacion, "Gestión de Experiencia" ya
  // aparece desplegada en vez de tener que abrirla a mano).
  const grupoDeRutaActiva = navFiltrado.find(n => location.pathname.startsWith(n.to))?.group ?? null
  const [grupoAbierto, setGrupoAbierto] = useState(grupoDeRutaActiva)
  useEffect(() => { setGrupoAbierto(grupoDeRutaActiva) }, [grupoDeRutaActiva])

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-base)' }}>
      <aside style={{ width:220, flexShrink:0, background:'var(--bg-surface)', borderRight:'1px solid var(--border-default)', display:'flex', flexDirection:'column' }}>
        {/* Logo */}
        <div style={{ padding:'16px', borderBottom:'1px solid var(--border-default)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <BrandMark size={32} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text-primary)', fontSize:13, lineHeight:1.15 }}>Experiencia al Cliente</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:2 }}>Burs Advisory</div>
            </div>
          </div>
          {/* Buscador */}
          <BuscadorGlobal />
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:10, overflowY:'auto' }}>
          {navAgrupado.map((entrada) => {
            if (entrada.tipo === 'item') {
              const { to, icon:Icon, label, sub } = entrada.item
              return <ItemNav key={to} to={to} Icon={Icon} label={label} sub={sub} />
            }

            const { nombre, items } = entrada
            const abierto = grupoAbierto === nombre
            const GroupIcon = GROUP_ICONS[nombre] ?? ChevronRight
            return (
              <div key={nombre} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => setGrupoAbierto(abierto ? null : nombre)}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                    borderRadius:10, border:'1px solid transparent', background:'transparent', cursor:'pointer',
                    color:'var(--text-muted)', textAlign:'left', font:'inherit',
                  }}>
                  <GroupIcon size={14} style={{ flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    {nombre}
                  </div>
                  {abierto ? <ChevronDown size={13} style={{ opacity:0.6 }} /> : <ChevronRight size={13} style={{ opacity:0.6 }} />}
                </button>
                {abierto && (
                  <div style={{ paddingLeft:10, marginTop:2, display:'flex', flexDirection:'column', gap:2 }}>
                    {items.map(({ to, icon:Icon, label, sub }) => (
                      <ItemNav key={to} to={to} Icon={Icon} label={label} sub={sub} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border-default)' }}>
          {user && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{user.nombre}</div>
                <div style={{ fontSize:10, color: ROL_COLORS[user.rol] || 'var(--text-muted)', marginTop:1, fontWeight:600, textTransform:'capitalize' }}>{user.rol}</div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={toggle} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button onClick={() => navigate('/perfil')} title="Mi perfil / Cambiar PIN"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                  <UserCircle size={14} />
                </button>
                <button onClick={logout} title="Cerrar sesión"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}
          <div style={{ fontSize:10, color:'var(--text-faint)', textTransform:'capitalize' }}>{hoy}</div>
        </div>
      </aside>

      <main style={{ flex:1, overflowY:'auto', background:'var(--bg-base)' }}>
        <Outlet />
      </main>
    </div>
  )
}
