import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell        from './components/shared/AppShell'
import LlamadasPage    from './pages/LlamadasPage'
import RecaudacionPage from './pages/RecaudacionPage'
import OrientacionPage from './pages/OrientacionPage'
import DashboardPage   from './pages/DashboardPage'
import OnboardingPage  from './pages/OnboardingPage'
import ImportPage      from './pages/ImportPage'
import SetupPage       from './pages/SetupPage'
import { useLlamadasProgramadas } from './hooks/useLlamadasProgramadas'
import RecordatorioModal from './components/modules/RecordatorioModal'

function AppWithRecordatorio() {
  const lp = useLlamadasProgramadas()

  const handleAccion = (id, tipo) => {
    if (tipo === 'realizada' || tipo === 'no_contacto') {
      lp.registrarResultado(id, tipo)
    } else if (tipo === 'iniciar') {
      lp.cerrarRecordatorio()
      // Redirigir a llamadas — el popup cierra y la asesora trabaja
      window.location.href = '/llamadas'
    } else if (tipo === 'reprogramar') {
      lp.cerrarRecordatorio()
    }
  }

  return (
    <>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/llamadas"    element={<LlamadasPage />} />
          <Route path="/recaudacion" element={<RecaudacionPage />} />
          <Route path="/orientacion" element={<OrientacionPage />} />
          <Route path="/onboarding"  element={<OnboardingPage />} />
          <Route path="/importar"    element={<ImportPage />} />
        </Route>
      </Routes>

      {/* Recordatorio global — visible en cualquier página */}
      {lp.recordatorio && (
        <RecordatorioModal
          llamada={lp.recordatorio}
          onAccion={handleAccion}
          onCerrar={lp.cerrarRecordatorio}
        />
      )}
    </>
  )
}

export default function App() {
  return <AppWithRecordatorio />
}
