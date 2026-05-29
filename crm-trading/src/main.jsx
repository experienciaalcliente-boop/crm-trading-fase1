import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2840',
            color: '#e2e8f4',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#2dd4a0', secondary: '#0b0e14' } },
          error:   { iconTheme: { primary: '#f05c5c', secondary: '#0b0e14' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
