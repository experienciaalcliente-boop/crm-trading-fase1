// Resumen general (todo el histórico) de una encuesta de satisfacción, al
// estilo del reporte nativo de respuestas de Google Forms: por cada
// pregunta, la distribución completa de respuestas (conteo + %), no solo el
// indicador derivado. NPS/CSAT se muestran como número grande arriba de su
// propia distribución.

function BarraDistribucion({ label, count, pct, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{count} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3 }} />
      </div>
    </div>
  )
}

function PreguntaCard({ titulo, valor, valorColor, distribucion, color }) {
  return (
    <div className="crm-card" style={{ padding:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{titulo}</span>
        {valor != null && <span style={{ fontSize:22, fontWeight:700, color:valorColor, fontFamily:'Syne,sans-serif' }}>{valor}</span>}
      </div>
      {distribucion.length === 0 || distribucion.every(d => d.count === 0) ? (
        <div style={{ fontSize:13, color:'var(--text-muted)' }}>Sin respuestas aún</div>
      ) : distribucion.map(d => (
        <BarraDistribucion key={d.label} label={d.label} count={d.count} pct={d.pct} color={color} />
      ))}
    </div>
  )
}

export default function EncuestaResumen({ titulo, resumen, labelR3, labelR4 }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{titulo}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{resumen.total} respuestas en total</div>
      </div>
      {resumen.total === 0 ? (
        <div className="crm-card" style={{ padding:'30px 18px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
          Aún no hay respuestas de esta encuesta
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <PreguntaCard titulo="NPS" valor={`${resumen.nps}%`} valorColor="var(--text-primary)" distribucion={resumen.npsDist} color="var(--accent)" />
            <PreguntaCard titulo="SAT" valor={`${resumen.csat}%`} valorColor="#2dd4a0" distribucion={resumen.csatDist} color="#2dd4a0" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <PreguntaCard titulo={labelR3} distribucion={resumen.r3Dist} color="#f5b93a" />
            <PreguntaCard titulo={labelR4} distribucion={resumen.r4Dist} color="#b89eff" />
          </div>
        </>
      )}
    </div>
  )
}
