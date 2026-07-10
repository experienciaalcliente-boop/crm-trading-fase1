// Lógica de cálculo del Bono de Incentivos (Experiencia al Cliente) — tablas
// de conversión, pesos y tramos de comisión tal como se definieron en el
// diseño "Calculadora Bono CX". A diferencia del mockup original, acá no se
// ingresan datos a mano: cada indicador se calcula automáticamente desde lo
// que ya existe en el CRM (ver useComisiones.js).

// --- NPS (score = %Promotores - %Detractores) ---
const TABLA_NPS = [
  { rango: 'Menor a 50', cumpl: 0,   test: v => v < 50 },
  { rango: '50 – 59',    cumpl: 70,  test: v => v >= 50 && v < 60 },
  { rango: '60 – 69',    cumpl: 80,  test: v => v >= 60 && v < 70 },
  { rango: '70 – 79',    cumpl: 90,  test: v => v >= 70 && v < 80 },
  { rango: '80 – 94',    cumpl: 95,  test: v => v >= 80 && v < 95 },
  { rango: '95 o más',   cumpl: 100, test: v => v >= 95 },
]

// --- CSAT (porcentaje 0-100) ---
const TABLA_CSAT = [
  { rango: 'Menor a 70%', cumpl: 0,   test: v => v < 70 },
  { rango: '70% – 79%',   cumpl: 70,  test: v => v >= 70 && v < 80 },
  { rango: '80% – 89%',   cumpl: 80,  test: v => v >= 80 && v < 90 },
  { rango: '90% – 94%',   cumpl: 90,  test: v => v >= 90 && v < 95 },
  { rango: '95% o más',   cumpl: 100, test: v => v >= 95 },
]

// --- Seguimiento (contactabilidad, porcentaje 0-100) ---
const TABLA_SEGUIMIENTO = [
  { rango: 'Menor a 80%',  cumpl: 0,   test: v => v < 80 },
  { rango: '80% – 89.99%', cumpl: 80,  test: v => v >= 80 && v < 90 },
  { rango: '90% – 94.99%', cumpl: 90,  test: v => v >= 90 && v < 95 },
  { rango: '95% – 100%',   cumpl: 100, test: v => v >= 95 },
]

// --- Testimonios (cantidad de videos aprobados en el mes) ---
const TABLA_TESTIMONIOS = [
  { rango: '0 a 2 testimonios', cumpl: 0,   test: v => v <= 2 },
  { rango: '3 a 5 testimonios', cumpl: 80,  test: v => v >= 3 && v <= 5 },
  { rango: '6 a 7 testimonios', cumpl: 90,  test: v => v >= 6 && v <= 7 },
  { rango: '8 o más',           cumpl: 100, test: v => v >= 8 },
]

// --- Efectividad técnica (porcentaje 0-100) ---
const TABLA_EFECTIVIDAD = [
  { rango: 'Menor a 75%', cumpl: 0,   test: v => v < 75 },
  { rango: '75% – 84%',   cumpl: 70,  test: v => v >= 75 && v < 85 },
  { rango: '85% – 92%',   cumpl: 85,  test: v => v >= 85 && v < 93 },
  { rango: '93% – 96%',   cumpl: 95,  test: v => v >= 93 && v < 97 },
  { rango: '97% – 100%',  cumpl: 100, test: v => v >= 97 },
]

// Tramos de comisión final (compartidos por ambos perfiles)
const TABLA_COMISION = [
  { min: 0,   max: 80,    monto: 0,   label: 'Cumplimiento < 80%' },
  { min: 80,  max: 90,    monto: 150, label: 'Cumplimiento 80% – 89.99%' },
  { min: 90,  max: 100,   monto: 300, label: 'Cumplimiento 90% – 99.99%' },
  { min: 100, max: 99999, monto: 500, label: 'Cumplimiento 100% o más' },
]

// Devuelve el % de cumplimiento de un indicador según su tabla. `hayDatos`
// distingue "sin datos aún este mes" (0%, pero no es que le vaya mal) de un
// valor real bajo — el llamador decide cómo mostrarlo.
function evaluarTabla(tabla, valor, hayDatos) {
  if (!hayDatos) return { cumpl: 0, rango: null }
  const fila = tabla.find(f => f.test(valor))
  return fila ? { cumpl: fila.cumpl, rango: fila.rango } : { cumpl: 0, rango: null }
}

export function evaluarComision(pctCumplimiento) {
  const fila = TABLA_COMISION.find(t => pctCumplimiento >= t.min && pctCumplimiento < t.max)
    || TABLA_COMISION[TABLA_COMISION.length - 1]
  return { monto: fila.monto, label: fila.label }
}

// Indicadores por perfil: id, título, peso, tabla de conversión y unidad de
// la métrica bruta (solo para mostrarla con el símbolo correcto).
export const INDICADORES_ATC = [
  { id: 'nps',          titulo: 'NPS de Atención',       peso: 30, tabla: TABLA_NPS,          unidad: '' },
  { id: 'csat',         titulo: 'CSAT de Atención',      peso: 30, tabla: TABLA_CSAT,         unidad: '%' },
  { id: 'seguimiento',  titulo: 'Seguimiento (Contactabilidad)', peso: 20, tabla: TABLA_SEGUIMIENTO, unidad: '%' },
  { id: 'testimonios',  titulo: 'Testimonios',           peso: 20, tabla: TABLA_TESTIMONIOS,  unidad: ' videos' },
]

export const INDICADORES_ORIENTADOR = [
  { id: 'nps',          titulo: 'NPS Técnico',           peso: 30, tabla: TABLA_NPS,        unidad: '' },
  { id: 'csat',         titulo: 'CSAT Técnico',          peso: 30, tabla: TABLA_CSAT,       unidad: '%' },
  { id: 'efectividad',  titulo: 'Efectividad Técnica',   peso: 40, tabla: TABLA_EFECTIVIDAD, unidad: '%' },
]

// `valores` = { [indicadorId]: { valor: number|null, hayDatos: boolean } }
// Devuelve { cumplimientoTotal, comision, detalle: [{...indicador, cumpl, aporte, rango}] }
export function calcularComision(definicion, valores) {
  let cumplimientoTotal = 0
  const detalle = definicion.map(ind => {
    const v = valores[ind.id] || { valor: null, hayDatos: false }
    const ev = evaluarTabla(ind.tabla, v.valor, v.hayDatos)
    const aporte = (ev.cumpl / 100) * ind.peso
    cumplimientoTotal += aporte
    return { ...ind, valor: v.valor, hayDatos: v.hayDatos, cumpl: ev.cumpl, rango: ev.rango, aporte }
  })
  cumplimientoTotal = Math.round(cumplimientoTotal * 100) / 100
  const comision = evaluarComision(cumplimientoTotal)
  return { cumplimientoTotal, comisionMonto: comision.monto, comisionLabel: comision.label, detalle }
}
