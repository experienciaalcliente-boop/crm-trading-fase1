import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import AppShell, { NAV } from './components/shared/AppShell'
import LoginPage         from './pages/LoginPage'
import LlamadasPage      from './pages/LlamadasPage'
import RecaudacionPage   from './pages/RecaudacionPage'
import OrientacionPage   from './pages/OrientacionPage'
import DashboardPage     from './pages/DashboardPage'
import OnboardingPage    from './pages/OnboardingPage'
import FichaAlumnoPage   from './pages/FichaAlumnoPage'
import MiPerfilPage      from './pages/MiPerfilPage'
import ImportPage        from './pages/ImportPage'
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
          <Route path="/llamadas"       element={<RequireRole path="/llamadas"><ErrorBoundary><LlamadasPage /></ErrorBoundary></RequireRole>} />
          <Route path="/recaudacion"    element={<RequireRole path="/recaudacion"><RecaudacionPage /></RequireRole>} />
          <Route path="/orientacion"    element={<OrientacionPage />} />
          <Route path="/onboarding"     element={<RequireRole path="/onboarding"><OnboardingPage /></RequireRole>} />
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
  return (
    <Routes>
      <Route path="/setup"  element={<SetupPage />} />
      <Route path="/login"  element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*"      element={<ProtectedApp />} />
    </Routes>
  )
}
