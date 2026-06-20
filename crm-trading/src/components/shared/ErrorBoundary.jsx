import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding:32, color:'#f07070', fontFamily:'monospace', fontSize:13, background:'#0b0e14', minHeight:'100vh' }}>
          <div style={{ marginBottom:16, fontSize:16, fontWeight:700, color:'#e2e8f4' }}>⚠ Error en la aplicación</div>
          <div style={{ marginBottom:12, color:'#f07070' }}>{this.state.error?.toString()}</div>
          <pre style={{ background:'#151c2c', padding:16, borderRadius:8, overflowX:'auto', fontSize:11, color:'#9aaccb', whiteSpace:'pre-wrap' }}>
            {this.state.info?.componentStack}
          </pre>
          <button onClick={() => window.location.reload()}
            style={{ marginTop:20, padding:'10px 20px', background:'#4e8fff', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13 }}>
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
