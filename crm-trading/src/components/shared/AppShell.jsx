import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Phone, Upload, Settings, BarChart2, CreditCard, MonitorSmartphone, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const NAV = [
  { to: '/llamadas', icon: Phone,  label: 'Seguimiento', sub: 'Registro de llamadas' },
  { to: '/importar', icon: Upload, label: 'Importar',    sub: 'CSV / Excel' },
]

const NAV_PRONTO = [
  { icon: CreditCard,        label: 'Recaudación',     sub: 'Fase 2 — próximamente' },
  { icon: MonitorSmartphone, label: 'Orient. Técnica',  sub: 'Fase 3 — próximamente' },
  { icon: BarChart2,         label: 'Dashboard',        sub: 'Fase 4 — próximamente' },
]

export default function AppShell() {
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

      {/* ── SIDEBAR ── */}
      <aside className="w-[220px] flex-shrink-0 bg-bg-2 border-r border-line flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-display font-bold text-white text-sm">A</div>
            <div>
              <div className="font-display font-bold text-white text-sm leading-none">AcademiaCRM</div>
              <div className="text-[10px] text-muted mt-0.5">Trading School</div>
            </div>
          </div>
        </div>

        {/* Nav activo */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2 mb-2 mt-1">Módulos activos</div>
          {NAV.map(({ to, icon: Icon, label, sub }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all group border
                 ${isActive ? 'text-brand' : 'text-sub hover:text-white border-transparent'}`
              }
              style={({ isActive }) => isActive
                ? { backgroundColor:'rgba(78,143,255,0.1)', borderColor:'rgba(78,143,255,0.25)' }
                : {}}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium leading-none">{label}</div>
                    <div className="text-[10px] mt-0.5 text-muted">{sub}</div>
                  </div>
                  {isActive && <ChevronRight size={12} className="flex-shrink-0 opacity-60" />}
                </>
              )}
            </NavLink>
          ))}

          <div className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2 mb-2 mt-4">Próximamente</div>
          {NAV_PRONTO.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 opacity-35 cursor-not-allowed border border-transparent">
              <Icon size={15} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-none text-sub">{label}</div>
                <div className="text-[10px] text-muted mt-0.5">{sub}</div>
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-line">
          <div className="text-[11px] text-muted capitalize">{hoy}</div>
          <div className="text-[10px] text-muted mt-0.5 opacity-60">Fase 1 — en producción</div>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-bg">
        <Outlet />
      </main>
    </div>
  )
}
