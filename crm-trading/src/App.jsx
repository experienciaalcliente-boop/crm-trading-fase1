import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import AppShell, { NAV } from './components/shared/AppShell'
import { tieneProximaPromocion } from './lib/api'
import { iniciarDeteccionDeActualizaciones } from './lib/updateChecker'
import LoginPage         from './pages/LoginPage'
import LlamadasPage      from './pages/LlamadasPage'
import SeguimientoSemanalPage from './pages/SeguimientoSemanalPage'
import RecaudacionPage   from './pages/RecaudacionPage'
import CuentasRealesPage from './pages/CuentasRealesPage'
import OrientacionPage   from './pages/OrientacionPage'
import DashboardPage     from './pages/DashboardPage'
import PanelCoordinacionPage from './pages/PanelCoordinacionPage'
import OnboardingPage    from './pages/OnboardingPage'
import FichaAlumnoPage   from './pages/FichaAlumnoPage'
import MiPerfilPage      from './pages/MiPerfilPage'
import ImportPage        from './pages/ImportPage'
import VentaComplementosPage from './pages/VentaComplementosPage'
import ComisionesPage    from './pages/ComisionesPage'
import ReactivatePage    from './pages/ReactivatePage'
import ExpCampanaPage    from './pages/ExpCampanaPage'
import SetupPage         from './pages/SetupPage'
import { useLlamadasProgramadas } from './context/LlamadasProgramadasContext'
import RecordatorioModal from './components/modules/RecordatorioModal'

// Bloquea rutas que el rol del usuario no tiene permitidas (según el mismo mapa
// de roles que ya filtra el menú en AppShell). No es la barrera de seguridad real
// -eso lo hace RLS en Supabase- pero evita que quien fuerce la URL vea una
// pantalla rota o datos que su rol no debería ni intentar tocar.
function RequireRole({ path, children }) {
  const { user } = useAuth()
  const navItem = NAV.find(n => n.to === path)
  if (navItem && !navItem.roles.includes(user?.rol)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

// Onboarding, además del rol, requiere que la asesora tenga un alumno propio
// con un programa por iniciar (mismo criterio que el menú en AppShell).
function RequireProximaPromocion({ children }) {
  const { user } = useAuth()
  const [permitido, setPermitido] = useState(() => user?.rol !== 'asesora' ? true : null)
  useEffect(() => {
    if (user?.rol !== 'asesora') { setPermitido(true); return }
    let activo = true
    tieneProximaPromocion(user.asesora_id).then(r => { if (activo) setPermitido(r) })
    return () => { activo = false }
  }, [user])
  if (permitido === false) return <Navigate to="/dashboard" replace />
  if (permitido === true) return children
  return null // cargando
}

function ProtectedApp() {
  const { user } = useAuth()
  const lp = useLlamadasProgramadas()

  if (!user) return <Navigate to="/login" replace />

  const handleAccion = (id, tipo) => {
    if (tipo === 'realizada' || tipo === 'no_contacto') {
      lp.registrarResultado(id, tipo)
    } else if (tipo === 'iniciar') {
      lp.cerrarRecordatorio()
      window.location.href = '/llamadas'
    } else {
      lp.cerrarRecordatorio()
    }
  }

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"      element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/coordinacion"   element={<RequireRole path="/coordinacion"><ErrorBoundary><PanelCoordinacionPage /></ErrorBoundary></RequireRole>} />
          <Route path="/llamadas"       element={<RequireRole path="/llamadas"><ErrorBoundary><LlamadasPage /></ErrorBoundary></RequireRole>} />
          <Route path="/seguimiento-semanal" element={<RequireRole path="/seguimiento-semanal"><ErrorBoundary><SeguimientoSemanalPage /></ErrorBoundary></RequireRole>} />
          <Route path="/recaudacion"    element={<RequireRole path="/recaudacion"><RecaudacionPage /></RequireRole>} />
          <Route path="/cuentas-reales" element={<RequireRole path="/cuentas-reales"><ErrorBoundary><CuentasRealesPage /></ErrorBoundary></RequireRole>} />
          <Route path="/orientacion"    element={<OrientacionPage />} />
          <Route path="/onboarding"     element={<RequireRole path="/onboarding"><RequireProximaPromocion><OnboardingPage /></RequireProximaPromocion></RequireRole>} />
          <Route path="/complementos"   element={<RequireRole path="/complementos"><VentaComplementosPage /></RequireRole>} />
          <Route path="/comisiones"    element={<RequireRole path="/comisiones"><ErrorBoundary><ComisionesPage /></ErrorBoundary></RequireRole>} />
          <Route path="/reactivate"    element={<RequireRole path="/reactivate"><ErrorBoundary><ReactivatePage /></ErrorBoundary></RequireRole>} />
          <Route path="/exalumnos"     element={<RequireRole path="/exalumnos"><ErrorBoundary><ExpCampanaPage /></ErrorBoundary></RequireRole>} />
          <Route path="/alumno/:id"     element={<FichaAlumnoPage />} />
          <Route path="/importar"       element={<RequireRole path="/importar"><ImportPage /></RequireRole>} />
          <Route path="/perfil"         element={<MiPerfilPage />} />
        </Route>
      </Routes>
      {lp.recordatorio && (
        <RecordatorioModal llamada={lp.recordatorio} onAccion={handleAccion} onCerrar={lp.cerrarRecordatorio} />
      )}
    </>
  )
}

export default function App() {
  const { user } = useAuth()

  // Al ser una SPA, una pestaña abierta todo el día se queda con el código
  // viejo aunque se despliegue algo nuevo — el navegador no vuelve a pedir
  // el HTML/JS hasta que alguien recarga. Esto avisa activamente cuando hay
  // una versión nueva, en vez de depender de que cada asesora borre su
  // caché manualmente para ver los cambios.
  useEffect(() => {
    const detener = iniciarDeteccionDeActualizaciones(() => {
      toast.custom(() => (
        <div style={{
          background:'var(--bg-input)', color:'var(--text-primary)',
          border:'1px solid var(--accent)', borderRadius:8, padding:'12px 16px',
          display:'flex', alignItems:'center', gap:14, fontSize:13,
          boxShadow:'0 8px 24px rgba(0,0,0,0.35)', maxWidth:360,
        }}>
          <span>Hay una nueva versión del sistema disponible.</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              background:'var(--accent)', color:'#fff', border:'none', borderRadius:6,
              padding:'6px 14px', fontWeight:600, cursor:'pointer', fontSize:12, whiteSpace:'nowrap',
            }}
          >
            Actualizar ahora
          </button>
        </div>
      ), { duration: Infinity, id:'nueva-version' })
    })
    return detener
  }, [])

  return (
    <Routes>
      <Route path="/setup"  element={<SetupPage />} />
      <Route path="/login"  element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*"      element={<ProtectedApp />} />
    </Routes>
  )
}
