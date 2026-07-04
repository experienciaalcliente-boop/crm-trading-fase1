import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LlamadasProgramadasProvider } from './context/LlamadasProgramadasContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
      <LlamadasProgramadasProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background:'var(--bg-input)', color:'var(--text-primary)', border:'1px solid var(--border-default)', fontSize:13 },
            success: { iconTheme: { primary:'#2dd4a0', secondary:'#fff' } },
            error:   { iconTheme: { primary:'#f07070', secondary:'#fff' } },
          }}
        />
      </LlamadasProgramadasProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
