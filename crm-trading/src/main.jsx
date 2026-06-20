import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background:'#1e2840', color:'#e2e8f4', border:'1px solid rgba(255,255,255,0.1)', fontSize:13 },
            success: { iconTheme: { primary:'#2dd4a0', secondary:'#fff' } },
            error:   { iconTheme: { primary:'#f07070', secondary:'#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
