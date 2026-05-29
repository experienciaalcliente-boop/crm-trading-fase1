import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/shared/AppShell'
import LlamadasPage from './pages/LlamadasPage'
import ImportPage from './pages/ImportPage'
import SetupPage from './pages/SetupPage'

export default function App() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/llamadas" replace />} />
        <Route path="/llamadas" element={<LlamadasPage />} />
        <Route path="/importar"  element={<ImportPage />} />
      </Route>
    </Routes>
  )
}
