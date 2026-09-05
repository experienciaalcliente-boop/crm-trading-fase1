import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { buscarAlumnos } from '../../lib/api'
import { RiesgoBadge } from './Badges'

export default function BuscadorGlobal() {
  const [query,       setQuery]       = useState('')
  const [resultados,  setResultados]  = useState([])
  const [abierto,     setAbierto]     = useState(false)
  const [buscando,    setBuscando]    = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const data = await buscarAlumnos(query)
        setResultados(data)
      } catch {}
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const irAFicha = (id) => {
    navigate(`/alumno/${id}`)
    setQuery(''); setResultados([]); setAbierto(false)
  }

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar alumno..."
          style={{ width:'100%', padding:'6px 10px 6px 28px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-default)',
            borderRadius:8, color:'var(--text-primary)', fontSize:12, outline:'none', boxSizing:'border-box' }}
        />
      </div>
      {abierto && (query.length >= 2) && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--bg-input)', border:'1px solid var(--border-default)',
          borderRadius:10, boxShadow:'0 8px 28px rgba(0,0,0,0.5)', zIndex:999, overflow:'hidden', maxHeight:300, overflowY:'auto' }}>
          {buscando ? (
            <div style={{ padding:12, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Buscando...</div>
          ) : resultados.length === 0 ? (
            <div style={{ padding:12, fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>Sin resultados para "{query}"</div>
          ) : resultados.map(al => (
            <div key={al.id} onClick={() => irAFicha(al.id)}
              style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(78,143,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{al.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{al.programa} · Sem. {al.semana_actual || '—'}</div>
                </div>
                {al.riesgo_nivel && al.riesgo_nivel !== 'Bajo' && <RiesgoBadge nivel={al.riesgo_nivel} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
