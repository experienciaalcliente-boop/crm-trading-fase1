import { Outlet, NavLink } from 'react-router-dom'
import { Phone, Upload, BarChart2, CreditCard, MonitorSmartphone, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const NAV = [
  { to: '/llamadas', icon: Phone,  label: 'Seguimiento', sub: 'Registro de llamadas' },
  { to: '/importar', icon: Upload, label: 'Importar',    sub: 'CSV / Excel' },
]
const NAV_PRONTO = [
  { icon: CreditCard,        label: 'Recaudación',    sub: 'Fase 2 — próximamente' },
  { icon: MonitorSmartphone, label: 'Orient. Técnica', sub: 'Fase 3 — próximamente' },
  { icon: BarChart2,         label: 'Dashboard',      sub: 'Fase 4 — próximamente' },
]

export default function AppShell() {
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f6fb' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e4e9f2', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}
        className="flex-shrink-0 flex flex-col">

        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e4e9f2' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4e8fff' }}
              className="flex items-center justify-center font-bold text-white text-sm">A</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#1a2035', fontSize: 14, lineHeight: 1 }}>AcademiaCRM</div>
              <div style={{ fontSize: 10, color: '#a0acc4', marginTop: 3 }}>Trading School</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a0acc4', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 8px' }}>
            Módulos activos
          </div>
          {NAV.map(({ to, icon: Icon, label, sub }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
              borderRadius: 10, marginBottom: 2, textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? '#eef4ff' : 'transparent',
              border: `1px solid ${isActive ? '#bdd1ff' : 'transparent'}`,
              color: isActive ? '#2563eb' : '#6b7a99',
            })}>
              {({ isActive }) => (<>
                <Icon size={15} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 10, marginTop: 3, color: isActive ? '#93b4ff' : '#b0bcd4' }}>{sub}</div>
                </div>
                {isActive && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
              </>)}
            </NavLink>
          ))}

          <div style={{ fontSize: 10, fontWeight: 700, color: '#a0acc4', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 8px 8px' }}>
            Próximamente
          </div>
          {NAV_PRONTO.map(({ icon: Icon, label, sub }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, marginBottom: 2, opacity: 0.35, cursor: 'not-allowed' }}>
              <Icon size={15} style={{ flexShrink: 0, color: '#6b7a99' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7a99', lineHeight: 1 }}>{label}</div>
                <div style={{ fontSize: 10, color: '#b0bcd4', marginTop: 3 }}>{sub}</div>
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #e4e9f2' }}>
          <div style={{ fontSize: 11, color: '#a0acc4', textTransform: 'capitalize' }}>{hoy}</div>
          <div style={{ fontSize: 10, color: '#c4cde0', marginTop: 2 }}>Fase 1 — en producción</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto" style={{ background: '#f4f6fb' }}>
        <Outlet />
      </main>
    </div>
  )
}
