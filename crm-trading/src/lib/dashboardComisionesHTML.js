// Genera el HTML autocontenido del "Dashboard de comisiones del equipo" que
// descarga el supervisor desde Mi Perfil (ver DescargarDashboardComisiones.jsx).
// Es un archivo suelto pensado para compartir con gerencia y/o imprimir a PDF
// al solicitar el pago de comisiones — por eso va todo inline (sin CSS ni JS
// externos) y en paleta clara apta para impresión.

const fmtSoles = (n) => `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtNum = (n) => (Number(n) || 0).toLocaleString('es-PE')
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Mismos tramos que TABLA_COMISION en comisiones.js — status por color según
// si comisionó y cuánto, no un juicio de desempeño aparte.
function colorTramo(monto) {
  if (monto >= 500) return { bg: '#e7f6e7', border: '#0ca30c', text: '#0a5c0a' }
  if (monto >= 300) return { bg: '#e7f6e7', border: '#0ca30c', text: '#0a5c0a' }
  if (monto >= 150) return { bg: '#fff3d9', border: '#c98500', text: '#8a5b00' }
  return { bg: '#f2f1ee', border: '#898781', text: '#52514e' }
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function statTile(label, value, sub) {
  return `
    <div class="stat-tile">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${value}</div>
      ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}
    </div>`
}

function tablaResumenObjetivos(porObjetivos) {
  const filas = porObjetivos.map(p => {
    const c = colorTramo(p.comisionMonto)
    return `
      <tr>
        <td class="col-nombre">${esc(p.nombre)}</td>
        <td class="col-muted">${esc(p.rol)}</td>
        <td class="col-num">${p.cumplimientoTotal}%</td>
        <td class="col-muted">${esc(p.comisionLabel)}</td>
        <td class="col-num"><span class="badge" style="background:${c.bg};border-color:${c.border};color:${c.text}">${fmtSoles(p.comisionMonto)}</span></td>
      </tr>`
  }).join('')
  return `
    <table class="tabla">
      <thead><tr><th>Nombre</th><th>Rol</th><th>Cumplimiento</th><th>Tramo alcanzado</th><th>Comisión</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="5" class="vacio">Sin datos para este mes</td></tr>'}</tbody>
    </table>`
}

function tablaDetalleIndicadores(persona) {
  const filas = persona.detalle.map(ind => `
    <tr>
      <td>${esc(ind.titulo)}</td>
      <td class="col-num">${ind.peso}%</td>
      <td class="col-num">${ind.hayDatos ? `${ind.valor}${ind.unidad}` : '—'}</td>
      <td class="col-muted">${esc(ind.rango || 'Sin datos')}</td>
      <td class="col-num">${ind.cumpl}%</td>
      <td class="col-num">${ind.aporte.toFixed(1)} / ${ind.peso}</td>
    </tr>`).join('')
  return `
    <div class="subbloque">
      <div class="subbloque-titulo">${esc(persona.nombre)} <span class="col-muted">— ${esc(persona.rol)}</span></div>
      <table class="tabla tabla-chica">
        <thead><tr><th>Indicador</th><th>Peso</th><th>Valor</th><th>Rango</th><th>Cumpl.</th><th>Aporte</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`
}

function tablaVentasPorAsesora(porComplementosAsesora) {
  const filas = porComplementosAsesora.map(a => `
    <tr>
      <td class="col-nombre">${esc(a.nombre)}</td>
      <td class="col-num">${fmtNum(a.cantidad)}</td>
      <td class="col-num">${fmtSoles(a.monto)}</td>
    </tr>`).join('')
  return `
    <table class="tabla">
      <thead><tr><th>Asesora / Orientador</th><th>N° de ventas</th><th>Comisión</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="3" class="vacio">Sin ventas registradas este mes</td></tr>'}</tbody>
    </table>`
}

function tablaVentasPorTipo(porComplementoTipo) {
  const filas = porComplementoTipo.map(c => `
    <tr>
      <td>${esc(c.complemento)}</td>
      <td class="col-num">${fmtNum(c.cantidad)}</td>
      <td class="col-num">${fmtSoles(c.monto)}</td>
    </tr>`).join('')
  return `
    <table class="tabla">
      <thead><tr><th>Complemento</th><th>N° de ventas</th><th>Comisión</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="3" class="vacio">Sin ventas registradas este mes</td></tr>'}</tbody>
    </table>`
}

function tablaDetalleVentas(detalleVentas) {
  const filas = detalleVentas.map(v => `
    <tr>
      <td>${formatFecha(v.fecha_registro)}</td>
      <td>${esc(v.asesora?.nombre || '—')}</td>
      <td>${esc(v.alumno?.nombre || '—')}</td>
      <td>${esc(v.complemento)}</td>
      <td class="col-num">$ ${fmtNum(v.valor_producto)}</td>
      <td class="col-num">${fmtSoles(v.valor_comision)}</td>
      <td class="col-muted">${esc(v.nro_operacion || '—')}</td>
    </tr>`).join('')

  const totalValorProducto = detalleVentas.reduce((s, v) => s + (parseFloat(v.valor_producto) || 0), 0)
  const totalComision = detalleVentas.reduce((s, v) => s + (parseFloat(v.valor_comision) || 0), 0)

  return `
    <table class="tabla tabla-chica">
      <thead><tr><th>Fecha</th><th>Asesora</th><th>Alumno</th><th>Complemento</th><th>Valor producto</th><th>Comisión</th><th>N° operación</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="7" class="vacio">Sin ventas registradas este mes</td></tr>'}</tbody>
      ${detalleVentas.length > 0 ? `
      <tfoot>
        <tr>
          <td colspan="4" class="col-total">TOTAL DEL MES (${fmtNum(detalleVentas.length)} ventas)</td>
          <td class="col-num col-total">$ ${fmtNum(totalValorProducto)}</td>
          <td class="col-num col-total">${fmtSoles(totalComision)}</td>
          <td></td>
        </tr>
      </tfoot>` : ''}
    </table>`
}

function tablaResumenPago(totalesPorPersona, totalGeneralObjetivos, totalGeneralComplementos, totalGeneralPagar) {
  const filas = totalesPorPersona.map(p => `
    <tr>
      <td class="col-nombre">${esc(p.nombre)}</td>
      <td class="col-muted">${esc(p.rol)}</td>
      <td class="col-num">${fmtSoles(p.comisionObjetivos)}</td>
      <td class="col-num">${fmtNum(p.cantidadComplementos)} vta. — ${fmtSoles(p.comisionComplementos)}</td>
      <td class="col-num col-total">${fmtSoles(p.totalAPagar)}</td>
    </tr>`).join('')
  return `
    <table class="tabla tabla-pago">
      <thead><tr><th>Nombre</th><th>Rol</th><th>Comisión por objetivos</th><th>Comisión por complementos</th><th>TOTAL A PAGAR</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="5" class="vacio">Sin datos para este mes</td></tr>'}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="col-total">TOTAL EQUIPO</td>
          <td class="col-num col-total">${fmtSoles(totalGeneralObjetivos)}</td>
          <td class="col-num col-total">${fmtSoles(totalGeneralComplementos)}</td>
          <td class="col-num col-total col-total-grande">${fmtSoles(totalGeneralPagar)}</td>
        </tr>
      </tfoot>
    </table>`
}

export function generarHTMLDashboardComisiones(data, meta) {
  const {
    porObjetivos, porComplementosAsesora, porComplementoTipo, detalleVentas,
    totalesPorPersona, totalGeneralObjetivos, totalGeneralComplementos, totalGeneralVentas, totalGeneralPagar,
  } = data
  const { mesLabel, generadoPor, fechaGeneracion } = meta

  const comisionaron = porObjetivos.filter(p => p.comisionMonto > 0).length

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Comisiones del equipo — ${esc(mesLabel)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --surface: #fcfcfb;
    --plane: #f9f9f7;
    --ink: #0b0b0b;
    --ink-2: #52514e;
    --muted: #898781;
    --grid: #e1e0d9;
    --border: rgba(11,11,11,0.12);
    --accent: #1c5cab;
    --accent-2: #256abf;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px; background: var(--plane); color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 13px; line-height: 1.5;
  }
  .hoja { max-width: 1100px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 36px 40px; }
  header.doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--accent); padding-bottom: 18px; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .marca { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
  h1 { font-size: 22px; margin: 4px 0 4px; }
  .subtitulo { color: var(--ink-2); font-size: 13px; text-transform: capitalize; }
  .meta { text-align: right; font-size: 11px; color: var(--muted); }
  .meta div { margin-bottom: 2px; }

  .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
  .stat-tile { background: var(--plane); border: 1px solid var(--grid); border-radius: 10px; padding: 14px 16px; }
  .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; }
  .stat-value { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .stat-sub { font-size: 11px; color: var(--ink-2); margin-top: 2px; }

  section { margin-bottom: 32px; }
  h2 { font-size: 16px; border-bottom: 1px solid var(--grid); padding-bottom: 8px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  h2 .num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 800; }
  h3.bloque-titulo { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-2); margin: 18px 0 8px; }
  p.nota { font-size: 11.5px; color: var(--muted); margin-top: 6px; }

  table.tabla { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 4px; }
  table.tabla th { text-align: left; background: var(--plane); color: var(--ink-2); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 10px; border-bottom: 1px solid var(--grid); border-top: 1px solid var(--grid); }
  table.tabla td { padding: 8px 10px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; }
  table.tabla tr:nth-child(even) td { background: rgba(11,11,11,0.015); }
  table.tabla .col-num { text-align: right; }
  table.tabla .col-muted { color: var(--muted); }
  table.tabla .col-nombre { font-weight: 600; }
  table.tabla.tabla-chica { font-size: 11.5px; }
  table.tabla .vacio { text-align: center; color: var(--muted); padding: 16px; }

  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-weight: 700; border: 1px solid; font-size: 12px; }

  .subbloque { margin-bottom: 14px; }
  .subbloque-titulo { font-size: 12.5px; font-weight: 700; margin-bottom: 6px; }

  table.tabla tfoot td { border-top: 2px solid var(--accent); border-bottom: none; padding-top: 10px; font-weight: 800; background: var(--plane); }
  .col-total { font-weight: 800; }
  .col-total-grande { font-size: 15px; color: var(--accent); }

  footer.doc-footer { border-top: 1px solid var(--grid); margin-top: 28px; padding-top: 16px; font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; }
  .firma-linea { border-top: 1px solid var(--ink); margin-top: 40px; padding-top: 6px; font-size: 11.5px; text-align: center; color: var(--ink-2); }

  .no-print { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .btn-print { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; }

  @media print {
    body { padding: 0; background: #fff; }
    .hoja { border: none; border-radius: 0; max-width: none; padding: 0; }
    .no-print { display: none; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="hoja">
    <div class="no-print"><button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button></div>

    <header class="doc-header">
      <div>
        <div class="marca">Burs Advisory · Experiencia al Cliente</div>
        <h1>Dashboard de comisiones del equipo</h1>
        <div class="subtitulo">${esc(mesLabel)}</div>
      </div>
      <div class="meta">
        <div>Generado por: <b>${esc(generadoPor)}</b></div>
        <div>Fecha de generación: ${esc(fechaGeneracion)}</div>
        <div>Incluye: cumplimiento de objetivos + venta de complementos</div>
      </div>
    </header>

    <div class="stats-row">
      ${statTile('Total a pagar', `<span style="color:var(--accent)">${fmtSoles(totalGeneralPagar)}</span>`, 'Objetivos + complementos')}
      ${statTile('Comisión por objetivos', fmtSoles(totalGeneralObjetivos), `${comisionaron} de ${porObjetivos.length} comisionaron`)}
      ${statTile('Comisión por complementos', fmtSoles(totalGeneralComplementos), `${fmtNum(totalGeneralVentas)} ventas registradas`)}
      ${statTile('Personas en el equipo', fmtNum(porObjetivos.length), 'Asesoras + orientador')}
      ${statTile('Ventas de complementos', fmtNum(totalGeneralVentas), 'En el mes')}
    </div>

    <section>
      <h2><span class="num">1</span> Comisión por cumplimiento de objetivos (Bono de Incentivos)</h2>
      ${tablaResumenObjetivos(porObjetivos)}
      <p class="nota">Cálculo 100% automático a partir de los datos del CRM del mes (NPS, CSAT, contactabilidad / efectividad y testimonios aprobados). Tramos: &lt;80% no comisiona · 80%–89.99% = S/ 150 · 90%–99.99% = S/ 300 · 100% o más = S/ 500.</p>

      <h3 class="bloque-titulo">Detalle por indicador</h3>
      ${porObjetivos.map(tablaDetalleIndicadores).join('')}
    </section>

    <section>
      <h2><span class="num">2</span> Comisión por venta de complementos</h2>
      <h3 class="bloque-titulo">Por asesora / orientador</h3>
      ${tablaVentasPorAsesora(porComplementosAsesora)}

      <h3 class="bloque-titulo">Por tipo de complemento</h3>
      ${tablaVentasPorTipo(porComplementoTipo)}

      <h3 class="bloque-titulo">Detalle de todas las ventas del mes</h3>
      ${tablaDetalleVentas(detalleVentas)}
    </section>

    <section>
      <h2><span class="num">3</span> Resumen para solicitud de pago</h2>
      ${tablaResumenPago(totalesPorPersona, totalGeneralObjetivos, totalGeneralComplementos, totalGeneralPagar)}
      <p class="nota">Este cuadro es el que resume lo que corresponde pagar a cada persona del equipo (comisión por objetivos + comisión por venta de complementos) para el mes indicado.</p>
    </section>

    <div class="firmas">
      <div class="firma-linea">Elaborado por (Supervisor)</div>
      <div class="firma-linea">Aprobado por (Gerencia)</div>
    </div>

    <footer class="doc-footer">
      <div>Reporte generado automáticamente desde el CRM de Experiencia al Cliente — Burs Advisory.</div>
      <div>${esc(mesLabel)} · ${esc(fechaGeneracion)}</div>
    </footer>
  </div>
</body>
</html>`
}
