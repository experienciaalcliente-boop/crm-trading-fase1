import { Outlet, NavLink } from 'react-router-dom'
import { Phone, Upload, BarChart2, CreditCard, MonitorSmartphone, ChevronRight, GraduationCap } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const NAV = [
  { to:'/dashboard',   icon:BarChart2,          label:'Dashboard',       sub:'Vista ejecutiva'      },
  { to:'/llamadas',    icon:Phone,               label:'Seguimiento',     sub:'Registro de llamadas' },
  { to:'/recaudacion', icon:CreditCard,          label:'Recaudación',     sub:'Cuotas y pagos'       },
  { to:'/orientacion', icon:MonitorSmartphone,   label:'Orient. Técnica', sub:'Agenda y sesiones'    },
  { to:'/onboarding',  icon:GraduationCap,       label:'Onboarding',      sub:'Próximas promociones' },
  { to:'/importar',    icon:Upload,              label:'Importar',        sub:'CSV / Excel'          },
]

export default function AppShell() {
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#0b0e14' }}>
      <aside style={{ width:220, flexShrink:0, background:'#0f1520', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' }}>

        {/* Logo */}
        <div style={{ padding:'18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#4e8fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:14 }}>A</div>
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, color:'#fff', fontSize:14, lineHeight:1 }}>AcademiaCRM</div>
              <div style={{ fontSize:10, color:'#3d5070', marginTop:3 }}>Trading School</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:12, overflowY:'auto' }}>
          {NAV.map(({ to, icon:Icon, label, sub }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'9px 10px',
              borderRadius:10, marginBottom:2, textDecoration:'none', transition:'all 0.15s',
              background: isActive ? 'rgba(78,143,255,0.12)' : 'transparent',
              border:`1px solid ${isActive ? 'rgba(78,143,255,0.25)' : 'transparent'}`,
              color: isActive ? '#4e8fff' : '#506080',
            })}>
              {({ isActive }) => (<>
                <Icon size={15} style={{ flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, lineHeight:1 }}>{label}</div>
                  <div style={{ fontSize:10, marginTop:3, color: isActive ? 'rgba(78,143,255,0.6)' : '#2e3d5c' }}>{sub}</div>
                </div>
                {isActive && <ChevronRight size={12} style={{ opacity:0.5 }} />}
              </>)}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:11, color:'#3d5070', textTransform:'capitalize' }}>{hoy}</div>
          <div style={{ fontSize:10, color:'#2a3450', marginTop:2 }}>v3.1 · Fase C activa</div>
        </div>
      </aside>

      <main style={{ flex:1, overflowY:'auto', background:'#0b0e14' }}>
        <Outlet />
      </main>
    </div>
  )
}
