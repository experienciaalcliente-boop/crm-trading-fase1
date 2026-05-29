import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell        from './components/shared/AppShell'
import LlamadasPage    from './pages/LlamadasPage'
import RecaudacionPage from './pages/RecaudacionPage'
import OrientacionPage from './pages/OrientacionPage'
import DashboardPage   from './pages/DashboardPage'
import ImportPage      from './pages/ImportPage'
import SetupPage       from './pages/SetupPage'

export default function App() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/llamadas"    element={<LlamadasPage />} />
        <Route path="/recaudacion" element={<RecaudacionPage />} />
        <Route path="/orientacion" element={<OrientacionPage />} />
        <Route path="/importar"    element={<ImportPage />} />
      </Route>
    </Routes>
  )
}
