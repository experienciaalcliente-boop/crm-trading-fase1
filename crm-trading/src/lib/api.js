// v-20260622-1614
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────
// FECHA "HOY" EN HORA DE LIMA
// ─────────────────────────────────────────
// `new Date().toISOString()` siempre da la fecha en UTC. Lima es UTC-5 sin
// horario de verano, así que entre las 7pm y la medianoche (hora Lima) el
// reloj UTC ya cambió de día — cualquier "hoy" calculado así queda un día
// adelantado justo en esa ventana, y deja de encontrar los registros que sí
// se guardaron correctamente con la fecha de Lima. Esta función usa
// aritmética de epoch (independiente de la zona horaria del navegador o
// servidor donde corra) para devolver siempre la fecha real en Lima.
const OFFSET_LIMA_MS = 5 * 60 * 60 * 1000
export function hoyLima() {
  return new Date(Date.now() - OFFSET_LIMA_MS).toISOString().slice(0, 10)
}

// Rango [00:00, 23:59:59] de un día en Lima, expresado con su offset
// explícito (-05:00) para comparar contra columnas timestamptz — sin el
// offset, Postgres interpreta el string en UTC (zona por defecto de la
// sesión) y el rango queda corrido 5 horas respecto al día real en Lima.
export function rangoDiaLima(fecha) {
  return { inicio: `${fecha}T00:00:00-05:00`, fin: `${fecha}T23:59:59-05:00` }
}

// ─────────────────────────────────────────
// ALUMNOS
// ─────────────────────────────────────────
const DURACION_PROGRAMA_DIAS = 24 * 7 // 24 semanas

// Un alumno deja de considerarse "programa activo" cuando su fecha_inicio +
// 24 semanas ya pasó. Los que no tienen fecha_inicio se consideran NO
// activos: se confirmó en la base que fecha_inicio solo falta en baldes
// históricos genéricos ("ALUMNOS ANTIGUOS", "SEPTIEMBRE 2025", etc.), nunca
// en una cohorte real con nombre "Mes-AA" — antes se trataban como activos
// por defecto, lo que colaba miles de alumnos viejos (y sus asesoras) en
// vistas que deberían mostrar solo la operación vigente. Se exporta para
// que tanto fetchAlumnos() como el Dashboard apliquen la misma regla.
export function programaActivo(alumno) {
  if (!alumno.fecha_inicio) return false
  const fin = new Date(alumno.fecha_inicio + 'T00:00:00')
  fin.setDate(fin.getDate() + DURACION_PROGRAMA_DIAS)
  return fin >= new Date()
}

// soloActivos=true (default) es lo correcto para Seguimiento/Orientación/
// Onboarding — la operativa del día a día. Algunas pantallas (venta de
// complementos) necesitan también alumnos de programas ya culminados, por
// eso se puede desactivar el corte de 24 semanas con soloActivos:false.
export async function fetchAlumnos(asesoraId, { soloActivos = true } = {}) {
  let query = supabase
    .from('alumnos')
    .select('id, nombre, programa, semana_actual, asesora, asesora_id, estado, fecha_inicio')
    .eq('activo', true)
    .order('nombre')
  if (asesoraId) query = query.eq('asesora_id', asesoraId)
  const { data, error } = await query
  if (error) throw error
  return soloActivos ? data.filter(programaActivo) : data
}

// Onboarding solo debe verse si hay al menos un alumno propio con un
// programa por iniciar (fecha_inicio en el futuro). Se usa tanto para
// decidir si mostrar la pestaña en el menú como para bloquear la ruta.
export async function tieneProximaPromocion(asesoraId) {
  const hoy = hoyLima()
  let query = supabase.from('alumnos').select('id', { count: 'exact', head: true }).gt('fecha_inicio', hoy)
  if (asesoraId) query = query.eq('asesora_id', asesoraId)
  const { count, error } = await query
  if (error) { console.warn('tieneProximaPromocion:', error.message); return false }
  return (count || 0) > 0
}

// La relación real de un alumno es por CodAlumno (igual que ya se usa en
// cuotas) — la tabla ya no tiene restricción única por nombre+programa
// (se eliminó: chocaba con altas reales cuando un alumno nuevo compartía
// nombre+programa con uno ya existente). Se deduplica por código dentro
// del lote (quedándose con la última aparición) porque un mismo INSERT no
// puede afectar la misma fila dos veces: eso es justo lo que producía
// "ON CONFLICT DO UPDATE command cannot affect row a second time" cuando
// el Excel traía un alumno repetido. Los pocos alumnos legado sin código
// (hoy 3) se resuelven a mano por nombre+programa, sin restricción de BD.
const CHUNK_ALUMNOS = 500

export async function upsertAlumnos(rows) {
  const conCodigo = new Map()
  const sinCodigo = new Map()
  for (const r of rows) {
    if (r.codigo_alumno) conCodigo.set(r.codigo_alumno, r)
    else sinCodigo.set(`${r.nombre}|||${r.programa}`, r)
  }

  const resultados = []
  const filasConCodigo = [...conCodigo.values()]
  for (let i = 0; i < filasConCodigo.length; i += CHUNK_ALUMNOS) {
    const { data, error } = await supabase
      .from('alumnos')
      .upsert(filasConCodigo.slice(i, i + CHUNK_ALUMNOS), { onConflict: 'codigo_alumno', ignoreDuplicates: false })
      .select()
    if (error) throw error
    resultados.push(...data)
  }

  for (const r of sinCodigo.values()) {
    const { data: existente } = await supabase
      .from('alumnos').select('id').eq('nombre', r.nombre).eq('programa', r.programa).maybeSingle()
    const { data, error } = existente
      ? await supabase.from('alumnos').update(r).eq('id', existente.id).select()
      : await supabase.from('alumnos').insert(r).select()
    if (error) throw error
    resultados.push(...data)
  }
  return resultados
}

// ─────────────────────────────────────────
// ASESORAS — solo las que hacen llamadas
// ─────────────────────────────────────────
export async function fetchAsesoras() {
  const { data, error } = await supabase
    .from('asesoras')
    .select('id, nombre, rol')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

// Hoy hay un solo orientador — se autocompleta al agendar una sesión, no
// hay selector manual (si se suma un segundo orientador habría que revisar
// esto para poder elegir cuál).
export async function fetchOrientadorId() {
  const { data, error } = await supabase.from('asesoras').select('id').eq('rol', 'orientador').limit(1).single()
  if (error) return null
  return data?.id || null
}

// Solo asesoras de llamadas (excluye orientadores)
export async function fetchAsesorasLlamadas() {
  const { data, error } = await supabase
    .from('asesoras')
    .select('id, nombre, rol')
    .eq('activo', true)
    .neq('rol', 'orientador')
    .order('nombre')
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// REGISTROS DE LLAMADAS
// ─────────────────────────────────────────
export async function fetchRegistrosHoy() {
  const hoy = hoyLima()
  const { data, error } = await supabase
    .from('registros_llamadas')
    .select(`
      *,
      alumno:alumnos(nombre, programa, semana_actual),
      asesora:asesoras(nombre, rol)
    `)
    .eq('fecha', hoy)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).filter(r => r.asesora?.rol !== 'orientador')
}

// Llamadas que cada asesora programó HOY (no las que caen hoy, sino las que
// agendó hoy, sin importar la fecha futura) — mide su actividad de agenda
// del día, para el monitoreo diario del supervisor.
export async function fetchAgendadasHoy() {
  const { inicio, fin } = rangoDiaLima(hoyLima())
  const { data, error } = await supabase
    .from('llamadas_programadas')
    .select('id, asesora_id, created_at')
    .gte('created_at', inicio)
    .lte('created_at', fin)
  if (error) throw error
  return data || []
}

// Alumnos cuyo ÚLTIMO registro es "No respondió"
// Si después hubo un "Sí", ya no aparecen
export async function fetchSinResponderAcumulado() {
  const { data, error } = await supabase
    .from('registros_llamadas')
    .select(`
      id, fecha, respondio, alumno_id, created_at,
      alumno:alumnos(id, nombre, programa, semana_actual),
      asesora:asesoras(nombre, rol)
    `)
    .order('created_at', { ascending: false }) // más reciente primero
  if (error) throw error

  // Agrupar por alumno y quedarse solo con el último registro de cada uno
  const porAlumno = {}
  for (const reg of (data || [])) {
    if (reg.asesora?.rol === 'orientador') continue
    if (!porAlumno[reg.alumno_id]) {
      porAlumno[reg.alumno_id] = reg // primer resultado = más reciente
    }
  }

  // Filtrar solo los que su último registro fue "No"
  return Object.values(porAlumno).filter(r => r.respondio === 'No')
}

export async function fetchHistorialAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('registros_llamadas')
    .select('*, asesora:asesoras(nombre)')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []).filter(Boolean)
}

export async function insertRegistroLlamada(payload) {
  const { data, error } = await supabase
    .from('registros_llamadas')
    .insert([payload])
    .select()
    .single()
  if (error) throw error

  // Actualizar último contacto si respondió
  if (payload.respondio === 'Sí' && payload.alumno_id) {
    await actualizarUltimoContacto(payload.alumno_id, 'llamada')
  }

  return data
}

export async function fetchNextCodigo() {
  const { count, error } = await supabase
    .from('registros_llamadas')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return `REG-${String((count || 0) + 1).padStart(6, '0')}`
}

export async function importarHistorialLlamadas(rows) {
  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('registros_llamadas')
      .upsert(chunk, { onConflict: 'codigo', ignoreDuplicates: true })
    if (error) throw error
    inserted += chunk.length
  }
  return inserted
}

// ─────────────────────────────────────────
// REAL TIME
// ─────────────────────────────────────────
export function suscribirRegistrosHoy(callback) {
  const hoy = hoyLima()
  const channel = supabase
    .channel('registros-hoy')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'registros_llamadas', filter: `fecha=eq.${hoy}` },
      callback
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ─────────────────────────────────────────
// RECAUDACIÓN
// ─────────────────────────────────────────

export async function fetchCuotas({ estado, programa, ordenVencidas, mes } = {}) {
  let query = supabase
    .from('cuotas')
    .select(`
      *,
      alumno:alumnos(id, nombre, programa, asesora)
    `)
    .order('fecha_vence', { ascending: true })

  if (estado && estado !== 'Todos') query = query.eq('estado', estado)

  // Filtro por mes — busca cuotas cuya fecha_vence cae en ese mes
  if (mes) {
    const [anio, mesNum] = mes.split('-').map(Number)
    const inicio = `${mes}-01`
    const finDia = new Date(anio, mesNum, 0).getDate()
    const fin    = `${mes}-${String(finDia).padStart(2,'0')}`
    query = query.gte('fecha_vence', inicio).lte('fecha_vence', fin)
  }

  const { data, error } = await query
  if (error) throw error

  let result = data || []
  if (programa && programa !== 'Todos') {
    result = result.filter(c => c.alumno?.programa === programa)
  }
  if (ordenVencidas) {
    const hoy = hoyLima()
    const vencidas  = result.filter(c => c.fecha_vence < hoy && c.estado !== 'Pagada')
    const resto     = result.filter(c => c.fecha_vence >= hoy || c.estado === 'Pagada')
    result = [...vencidas, ...resto]
  }
  return result
}

export async function fetchCuotasAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('cuotas')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('numero_cuota')
  if (error) throw error
  return data
}

export async function registrarPago(cuotaId, payload) {
  // 1. Insertar en historial de pagos
  const { error: errPago } = await supabase.from('pagos').insert([{
    cuota_id:      cuotaId,
    alumno_id:     payload.alumno_id,
    tipo:          payload.tipo,
    monto:         payload.monto || null,
    moneda:        payload.moneda || null,
    fecha_pago:    payload.fecha_pago,
    nueva_fecha:   payload.nueva_fecha || null,
    motivo:        payload.motivo || null,
    observaciones: payload.observaciones || null,
    registrado_por: payload.registrado_por || null,
  }])
  if (errPago) throw errPago

  // 2. Actualizar estado de la cuota
  const updates = {
    estado:       payload.estado,
    updated_at:   new Date().toISOString(),
  }
  if (payload.monto_pagado !== undefined) updates.monto_pagado = payload.monto_pagado
  if (payload.fecha_pago)   updates.fecha_pago  = payload.fecha_pago
  if (payload.nueva_fecha)  updates.fecha_pago_estimada = payload.nueva_fecha // prórroga: solo cambia fecha estimada de pago, NO fecha_vence
  if (payload.motivo)       updates.motivo_retiro = payload.motivo

  const { error: errCuota } = await supabase
    .from('cuotas').update(updates).eq('id', cuotaId)
  if (errCuota) throw errCuota

  return true
}

export async function upsertCuotas(rows) {
  const CHUNK = 200
  let total = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    // Incluir monto_pagado en el upsert para reflejar pagos parciales ya existentes
    const { error } = await supabase
      .from('cuotas')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'alumno_id,numero_cuota', ignoreDuplicates: false })
    if (error) throw error
    total += rows.slice(i, i + CHUNK).length
  }
  return total
}

export async function fetchResumenRecaudacion() {
  const { data, error } = await supabase
    .from('cuotas')
    .select('estado, monto, monto_pagado, moneda, alumno:alumnos(programa)')
  if (error) throw error
  return data || []
}

// ─────────────────────────────────────────
// ZOOM API
// ─────────────────────────────────────────

// Zoom auth se maneja en /api/zoom-meeting.js (serverless function)

export async function crearReunionZoom({ titulo, fecha, hora, duracion = 45, alumno }) {
  // Llamamos a nuestra función serverless en Vercel
  // que actúa como intermediario para evitar el bloqueo CORS de Zoom
  const res = await fetch('/api/zoom-meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, fecha, hora, alumno, duracion }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear reunión en Zoom')
  }

  return await res.json()
}

// ─────────────────────────────────────────
// SESIONES DE ORIENTACIÓN
// ─────────────────────────────────────────

// Sesiones que se AGENDARON en una fecha dada (por created_at), sin importar
// para qué fecha quedaron programadas — mide la actividad de agenda de cada
// asesora hacia el orientador, para el monitoreo diario del supervisor.
export async function fetchSesionesAgendadasFecha(fecha) {
  const { inicio, fin } = rangoDiaLima(fecha)
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .select('id, agendado_por, estado, created_at')
    .gte('created_at', inicio)
    .lte('created_at', fin)
  if (error) throw error
  return data || []
}

export async function fetchSesionesFecha(fecha) {
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .select('*, alumno:alumnos(nombre, programa)')
    .eq('fecha', fecha)
    .order('hora_inicio')
  if (error) throw error
  return data || []
}

// Historial de un mes completo (todas las fechas de ese mes, no solo un
// día). Si se pasa orientadorId, se limita a las sesiones de ese orientador.
// mes en formato 'YYYY-MM'; por defecto el mes actual.
export async function fetchHistorialSesiones(orientadorId, mes) {
  const m = mes || hoyLima().slice(0, 7)
  const [anio, mesNum] = m.split('-').map(Number)
  const inicio = `${m}-01`
  // OJO: no usar new Date(inicio) para sacar el último día — al parsear un
  // string ISO como UTC y luego leer getFullYear()/getMonth() en hora local
  // (Lima, UTC-5), el mes calculado queda corrido. new Date(anio, mesNum, 0)
  // con números sueltos sí es seguro porque no pasa por UTC.
  const fin = `${m}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`
  let query = supabase
    .from('sesiones_orientacion')
    .select('*, alumno:alumnos(nombre, programa)')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })
  if (orientadorId) query = query.eq('orientador_id', orientadorId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateSesionZoomUrl(id, zoom_join_url) {
  const { error } = await supabase
    .from('sesiones_orientacion')
    .update({ zoom_join_url })
    .eq('id', id)
  if (error) throw error
}

export async function insertSesion(payload) {
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSesion(id, payload) {
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchSesionesAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

export async function cancelarReunionZoom(meetingId) {
  const res = await fetch('/api/zoom-cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: meetingId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al cancelar reunión en Zoom')
  }
  return true
}

export async function deleteSesion(id, zoomMeetingId) {
  if (zoomMeetingId) {
    try { await cancelarReunionZoom(zoomMeetingId) } catch (e) { console.warn('No se pudo cancelar en Zoom:', e.message) }
  }
  const { error } = await supabase.from('sesiones_orientacion').delete().eq('id', id)
  if (error) throw error
  return true
}

// ─────────────────────────────────────────
// DASHBOARD — queries optimizadas
// ─────────────────────────────────────────

export async function fetchDashboardLlamadas() {
  const { data, error } = await supabase
    .from('registros_llamadas')
    .select(`
      id, fecha, respondio, avance, cuenta, capital_real,
      fase_fondeo, beneficio, retiro, monto_retiro,
      alumno:alumnos(nombre, programa),
      asesora:asesoras(nombre, rol)
    `)
    .order('fecha', { ascending: false })
  if (error) throw error
  return (data || []).filter(r => r.asesora?.rol !== 'orientador')
}

export async function fetchDashboardRecaudacion() {
  const { data, error } = await supabase
    .from('cuotas')
    .select(`
      id, estado, monto, monto_pagado, moneda, fecha_vence,
      monto_soles, tipo_cambio,
      alumno:alumnos(nombre, programa)
    `)
  if (error) throw error
  return data || []
}

export async function fetchDashboardOrientacion() {
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .select(`
      id, fecha, estado, motivo,
      tiene_mt5, tiene_tradingview, tiene_broker, tiene_ingreso_trade,
      alumno:alumnos(nombre, programa)
    `)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAlumnosActivos() {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, nombre, programa, estado, semana_actual, asesora, riesgo_nivel, riesgo_score, ultimo_contacto_at, nivel_atencion, estado_operativo, fecha_inicio')
    .in('estado', ['Activo', 'En Curso', 'En Seguimiento', 'en curso', 'en seguimiento', 'activo'])
  if (error) throw error
  return data || []
}

// ─────────────────────────────────────────
// SEGUIMIENTO SEMANAL (contactabilidad por semana de programa)
// ─────────────────────────────────────────

// "Activos" para esta vista es más angosto que fetchAlumnosActivos(): solo
// En Curso o En Seguimiento (no Activo genérico), tal como lo pidió el
// supervisor para esta tabla específica. También se aplica programaActivo
// (24 semanas desde fecha_inicio): se confirmó en la base que el 87% de los
// alumnos con este estado en realidad ya pasaron sus 24 semanas — el campo
// estado nunca se actualizó al cerrar su programa — y sin este filtro la
// tabla quedaría llena de alumnos en "semana 100+", que no aporta nada.
export async function fetchAlumnosEnCursoOSeguimiento(asesoraId) {
  let query = supabase
    .from('alumnos')
    .select('id, nombre, programa, fecha_inicio, asesora_id')
    .in('estado', ['En Curso', 'En Seguimiento', 'en curso', 'en seguimiento'])
    .order('nombre')
  if (asesoraId) query = query.eq('asesora_id', asesoraId)
  const { data, error } = await query
  if (error) throw error
  return (data || []).filter(programaActivo)
}

// Llamadas con contacto exitoso de un set de alumnos — se trae el
// histórico completo (no solo el mes) porque la tabla de seguimiento
// semanal cubre las 24 semanas del programa de cada alumno.
export async function fetchLlamadasContactadasPorAlumnos(alumnoIds) {
  if (!alumnoIds.length) return []
  const { data, error } = await supabase
    .from('registros_llamadas')
    .select('alumno_id, fecha, semana_registro, respondio')
    .in('alumno_id', alumnoIds)
    .eq('respondio', 'Sí')
  if (error) throw error
  return data || []
}

export async function updateBeneficio(registroId, beneficio) {
  const { data, error } = await supabase
    .from('registros_llamadas')
    .update({ beneficio: parseFloat(beneficio) })
    .eq('id', registroId)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────
// FASE A — Último contacto + Compromisos + Onboarding
// ─────────────────────────────────────────────────────────────

// Actualiza ultimo_contacto_at en el alumno
export async function actualizarUltimoContacto(alumnoId, tipo) {
  const hoy = hoyLima()
  const { error } = await supabase
    .from('alumnos')
    .update({ ultimo_contacto_at: hoy, ultimo_contacto_tipo: tipo })
    .eq('id', alumnoId)
  if (error) console.error('Error actualizando último contacto:', error)
}

// Calcula semana_registro para una llamada
export function calcularSemanaRegistro(fechaLlamada, fechaInicioProg) {
  if (!fechaLlamada || !fechaInicioProg) return null
  const inicio = new Date(fechaInicioProg + 'T00:00:00')
  const llamada = new Date(fechaLlamada + 'T00:00:00')
  const diffDias = Math.floor((llamada - inicio) / (1000 * 60 * 60 * 24))
  const semana = Math.ceil((diffDias + 1) / 7)
  if (semana < 1 || semana > 24) return null
  return semana
}

// Compromisos
export async function fetchCompromisosAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('compromisos')
    .select('*, asesora:asesoras(nombre)')
    .eq('alumno_id', alumnoId)
    .order('fecha_limite', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchCompromisosHoy() {
  const hoy = hoyLima()
  const en3dias = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('compromisos')
    .select('*, alumno:alumnos(nombre, programa), asesora:asesoras(nombre)')
    .eq('estado', 'Pendiente')
    .lte('fecha_limite', en3dias)
    .order('fecha_limite')
  if (error) throw error
  return data || []
}

export async function insertCompromiso(payload) {
  const { data, error } = await supabase
    .from('compromisos')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCompromiso(id, payload) {
  const { data, error } = await supabase
    .from('compromisos')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Onboarding
export async function fetchOnboardingAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('onboarding_pasos')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function upsertOnboardingPasos(alumnoId) {
  const PASOS = [
    'terminos_condiciones',
    'ficha_alumno',
    'acceso_aula',
    'evaluacion_dedicacion',
    'asignacion_contenido',
    'ingreso_whatsapp',
  ]
  const rows = PASOS.map(paso => ({ alumno_id: alumnoId, paso, estado: 'Pendiente' }))
  const { error } = await supabase
    .from('onboarding_pasos')
    .upsert(rows, { onConflict: 'alumno_id,paso', ignoreDuplicates: true })
  if (error) throw error
}

export async function updateOnboardingPaso(alumnoId, paso, payload) {
  const { data, error } = await supabase
    .from('onboarding_pasos')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('alumno_id', alumnoId)
    .eq('paso', paso)
    .select()
    .single()
  if (error) throw error
  return data
}

// Fetch alumnos con datos completos para dashboard
export async function fetchAlumnosConRiesgo() {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, nombre, programa, estado, semana_actual, asesora, riesgo_nivel, riesgo_score, ultimo_contacto_at, nivel_atencion, estado_operativo, fecha_inicio')
    .in('estado', ['Activo', 'En Curso', 'En Seguimiento', 'activo', 'en curso', 'en seguimiento'])
    .order('riesgo_score', { ascending: false })
  if (error) throw error
  return data || []
}

// Calcular score de riesgo en el frontend (no requiere tabla nueva)
export function calcularRiesgo(alumno, cuotas = [], llamadas = []) {
  // Guard: si no hay alumno válido, retornar score 0
  if (!alumno) return { score: 0, nivel: 'Bajo' }

  let score = 0
  const hoy = new Date()
  const hoyStr = hoy.toISOString().split('T')[0]

  // Días sin contacto efectivo
  if (alumno.ultimo_contacto_at) {
    const diasSin = Math.floor((hoy - new Date(alumno.ultimo_contacto_at)) / (1000 * 60 * 60 * 24))
    if (diasSin >= 21) score += 40
    else if (diasSin >= 15) score += 25
    else if (diasSin >= 7) score += 15
  } else {
    score += 25
  }

  // Cuotas vencidas — guard contra elementos undefined
  const cuotasSeguras = Array.isArray(cuotas) ? cuotas.filter(c => c && c.fecha_vence) : []
  const cuotasVencidas = cuotasSeguras.filter(c =>
    c.fecha_vence < hoyStr && c.estado !== 'Pagada' && c.estado !== 'Retirado'
  )
  if (cuotasVencidas.length >= 2) score += 25
  else if (cuotasVencidas.length === 1) score += 15

  // Avance bajo en semana avanzada — guard contra llamadas undefined
  const llamadasSeguras = Array.isArray(llamadas) ? llamadas.filter(Boolean) : []
  const semana = parseInt(alumno.semana_actual) || 0
  const ultimaLlamada = llamadasSeguras[0]

  if (ultimaLlamada && semana >= 8) {
    if ((ultimaLlamada.avance || 0) < 30) score += 15
  }

  // En Demo en semana 12+ — acceso seguro
  if (semana >= 12 && ultimaLlamada && ultimaLlamada.cuenta === 'Demo') score += 10

  // Fue crítico antes
  if (alumno.nivel_atencion === 'Crítico') score += 10

  score = Math.min(score, 100)

  let nivel = 'Bajo'
  if (score >= 56) nivel = 'Alto'
  else if (score >= 26) nivel = 'Medio'

  return { score, nivel }
}

// ─────────────────────────────────────────────────────────────
// FASE D — Ficha 360°, Timeline, Validación
// ─────────────────────────────────────────────────────────────

export async function fetchAlumnoCompleto(alumnoId) {
  const [
    { data: alumno },
    { data: llamadas },
    { data: cuotas },
    { data: sesiones },
    { data: compromisos },
    { data: onboarding },
    { data: validacion },
    { data: timeline },
  ] = await Promise.all([
    supabase.from('alumnos').select('*').eq('id', alumnoId).single(),
    supabase.from('registros_llamadas').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending: false }).limit(50),
    supabase.from('cuotas').select('*').eq('alumno_id', alumnoId).order('fecha_vence'),
    supabase.from('sesiones_orientacion').select('*').eq('alumno_id', alumnoId).order('fecha', { ascending: false }),
    supabase.from('compromisos').select('*, asesora:asesoras(nombre)').eq('alumno_id', alumnoId).order('fecha_limite'),
    supabase.from('onboarding_pasos').select('*').eq('alumno_id', alumnoId),
    supabase.from('validaciones').select('*').eq('alumno_id', alumnoId).maybeSingle(),
    supabase.from('timeline_alumno').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending: false }).limit(100),
  ])
  return { alumno, llamadas: llamadas||[], cuotas: cuotas||[], sesiones: sesiones||[], compromisos: compromisos||[], onboarding: onboarding||[], validacion, timeline: timeline||[] }
}

export async function fetchAlumnoById(id) {
  const { data, error } = await supabase.from('alumnos').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function buscarAlumnos(query) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, nombre, programa, estado, asesora, semana_actual, riesgo_nivel, ultimo_contacto_at')
    .ilike('nombre', `%${query}%`)
    .limit(10)
  if (error) throw error
  return data || []
}

// Validación
export async function upsertValidacion(alumnoId, payload) {
  const { data, error } = await supabase
    .from('validaciones')
    .upsert({ alumno_id: alumnoId, ...payload }, { onConflict: 'alumno_id' })
    .select().single()
  if (error) throw error
  return data
}

// Timeline
export async function insertTimeline(payload) {
  const { error } = await supabase.from('timeline_alumno').insert([payload])
  if (error) console.error('Timeline insert error:', error)
}

// Users config (roles)
export async function fetchUserByPin(pin) {
  const { data, error } = await supabase
    .from('users_config')
    .select('*, asesora:asesoras(id, nombre)')
    .eq('pin', pin)
    .eq('activo', true)
    .single()
  if (error) return null
  return data
}

// El login y la gestión de users_config ya no se consultan directo con la
// anon key: users_config no admite acceso de cliente (RLS cerrado), todo pasa
// por las funciones serverless en /api, que usan la service_role key.

export async function updatePin(dni, pinActual, pinNuevo) {
  const res = await fetch('/api/change-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, pinActual, pinNuevo }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al actualizar PIN')
  }
  return true
}

export async function fetchAllUsers(token) {
  const res = await fetch('/api/admin-users', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al cargar usuarios')
  }
  const body = await res.json()
  return body.users || []
}

export async function resetPin(token, userId, pinNuevo) {
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId, pinNuevo }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al resetear PIN')
  }
  return true
}

// ─────────────────────────────────────────
// VENTA DE COMPLEMENTOS
// ─────────────────────────────────────────
// Catálogo fijo: valor_producto en USD, valor_comision en soles.
export const CATALOGO_COMPLEMENTOS = [
  { key: '1 Mentoría',  valorProducto: 79,  valorComision: 15,  tipo: 'mentoria' },
  { key: '3 Mentoría',  valorProducto: 225, valorComision: 25,  tipo: 'mentoria' },
  { key: '6 Mentoría',  valorProducto: 395, valorComision: 45,  tipo: 'mentoria' },
  { key: '12 Mentoría', valorProducto: 711, valorComision: 100, tipo: 'mentoria' },
  { key: 'Aula 1M',     valorProducto: 79,  valorComision: 15,  tipo: 'aula' },
  { key: 'Aula 3M',     valorProducto: 225, valorComision: 25,  tipo: 'aula' },
  { key: 'Aula 6M',     valorProducto: 395, valorComision: 55,  tipo: 'aula' },
  { key: 'Aula 12M',    valorProducto: 711, valorComision: 120, tipo: 'aula' },
  { key: 'Impulso 3M',  valorProducto: 450, valorComision: 50,  tipo: 'impulso' },
  { key: 'Impulso 6M',  valorProducto: 797, valorComision: 100, tipo: 'impulso' },
  { key: 'Impulso 12M', valorProducto: 997, valorComision: 150, tipo: 'impulso' },
]

// Mínimo de complementos vendidos en el mes para poder comisionar (la regla
// en sí — aplicarla al cálculo de comisiones — es una tarea aparte).
export const MINIMO_COMPLEMENTOS_COMISION = 6

export async function fetchVentasComplementos(asesoraId, mes) {
  // mes en formato 'YYYY-MM'; por defecto el mes actual
  const m = mes || hoyLima().slice(0, 7)
  const [anio, mesNum] = m.split('-').map(Number)
  const inicio = `${m}-01`
  // Mismo cuidado que en fetchHistorialSesiones: evitar new Date(inicio)
  // (se corre de mes por el desfase UTC/hora local de Lima).
  const fin = `${m}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`
  let query = supabase
    .from('ventas_complementos')
    .select('*, alumno:alumnos(nombre, programa)')
    .gte('fecha_registro', inicio)
    .lte('fecha_registro', fin)
    .order('fecha_registro', { ascending: false })
  if (asesoraId) query = query.eq('asesora_id', asesoraId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Todas las ventas desde una fecha (no limitado a un solo mes como
// fetchVentasComplementos) — para el resumen de equipo del supervisor:
// historial completo, desglose por asesora/complemento y evolución mensual.
export async function fetchVentasComplementosDesde(fechaInicio) {
  const { data, error } = await supabase
    .from('ventas_complementos')
    .select('*, alumno:alumnos(nombre, programa), asesora:asesoras(nombre)')
    .gte('fecha_registro', fechaInicio)
    .order('fecha_registro', { ascending: false })
  if (error) throw error
  return data || []
}

export async function insertVentaComplemento(payload) {
  const { data, error } = await supabase
    .from('ventas_complementos')
    .insert([payload])
    .select()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// ENCUESTAS DE SATISFACCIÓN (NPS / CSAT)
// ─────────────────────────────────────────
// Antes de leer, dispara la sincronización con Google Forms (ver
// api/sync-respuestas-encuestas.js) — el propio endpoint se auto-limita a 1
// sincronización real cada 5 min, así que llamarlo en cada carga del
// Dashboard es seguro y mantiene los indicadores casi al día.
export async function fetchEncuestasSatisfaccion() {
  try {
    await fetch('/api/sync-respuestas-encuestas')
  } catch (err) {
    console.error('No se pudo sincronizar encuestas:', err)
  }
  const { data, error } = await supabase
    .from('encuestas_satisfaccion')
    .select('id, tipo, programa, nps_score, csat_label, respuesta_3, respuesta_4, comentario, fecha_respuesta')
  if (error) throw error
  return data || []
}

// NPS estándar: % Promotores (9-10) − % Detractores (0-6). Devuelve null (no
// 0) cuando no hay respuestas, para distinguir "sin datos" de "NPS real 0".
export function calcularNPS(scores) {
  const validos = (scores || []).filter(s => s != null)
  if (!validos.length) return null
  const promotores = validos.filter(s => s >= 9).length
  const detractores = validos.filter(s => s <= 6).length
  return Math.round(((promotores - detractores) / validos.length) * 100)
}

// CSAT "top-2-box": % que marcó las dos opciones más positivas de la escala
// de 5 (Satisfecho / Muy satisfecho) — el estándar más usado en la industria
// para encuestas de satisfacción de 5 puntos.
export function calcularCSAT(labels) {
  const validos = (labels || []).filter(Boolean)
  if (!validos.length) return null
  const satisfechos = validos.filter(l => l === 'Satisfecho' || l === 'Muy satisfecho').length
  return Math.round((satisfechos / validos.length) * 100)
}

// La encuesta de asesoría solo pregunta el programa del alumno, no su
// asesora — para poder desglosar NPS/CSAT por asesora se cruza
// programa→asesora usando a qué asesora pertenece la MAYORÍA de alumnos de
// ese programa (en la práctica cada programa activo es casi siempre de una
// sola asesora; ver conversación del 2026-07-06).
export function mapaProgramaAsesora(alumnos) {
  const conteos = {}
  alumnos.forEach(al => {
    if (!al.programa || !al.asesora_id) return
    if (!conteos[al.programa]) conteos[al.programa] = {}
    conteos[al.programa][al.asesora_id] = (conteos[al.programa][al.asesora_id] || 0) + 1
  })
  const mapa = {}
  Object.entries(conteos).forEach(([programa, porAsesora]) => {
    const [asesoraId] = Object.entries(porAsesora).sort((a, b) => b[1] - a[1])[0]
    mapa[programa] = asesoraId
  })
  return mapa
}

// Distribución de una pregunta de escala numérica (ej. NPS 0-10) — incluye
// todos los valores del rango aunque tengan 0 respuestas, para que la barra
// se vea completa como en el resumen nativo de Google Forms.
export function distribucionEscala(rows, campo, min, max) {
  const conteos = {}
  let total = 0
  rows.forEach(r => {
    const v = r[campo]
    if (v == null) return
    conteos[v] = (conteos[v] || 0) + 1
    total++
  })
  const arr = []
  for (let i = min; i <= max; i++) {
    const count = conteos[i] || 0
    arr.push({ label: String(i), count, pct: total > 0 ? Math.round((count / total) * 100) : 0 })
  }
  return arr
}

// Distribución de una pregunta de opción (CSAT, escalas de acuerdo, etc.) —
// no se conoce de antemano el set fijo de opciones, así que se tabula lo
// que realmente aparece en las respuestas, ordenado de mayor a menor.
export function distribucionCategorica(rows, campo) {
  const validos = rows.filter(r => r[campo])
  const conteos = {}
  validos.forEach(r => { conteos[r[campo]] = (conteos[r[campo]] || 0) + 1 })
  const total = validos.length
  return Object.entries(conteos)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
}
