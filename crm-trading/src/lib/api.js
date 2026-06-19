import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────
// ALUMNOS
// ─────────────────────────────────────────
export async function fetchAlumnos() {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, nombre, programa, semana_actual, asesora, estado')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function upsertAlumnos(rows) {
  const { data, error } = await supabase
    .from('alumnos')
    .upsert(rows, { onConflict: 'nombre,programa', ignoreDuplicates: false })
    .select()
  if (error) throw error
  return data
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
  const hoy = new Date().toISOString().split('T')[0]
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
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false }) // orden por timestamp exacto
    .limit(50)
  if (error) throw error
  return data
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
  const hoy = new Date().toISOString().split('T')[0]
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
    const hoy = new Date().toISOString().split('T')[0]
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

export async function fetchSesionesHoy() {
  const hoy = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('sesiones_orientacion')
    .select('*, alumno:alumnos(nombre, programa)')
    .eq('fecha', hoy)
    .order('hora_inicio')
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
  const hoy = new Date().toISOString().split('T')[0]
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
  const hoy = new Date().toISOString().split('T')[0]
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
    score += 25 // nunca contactado
  }

  // Cuotas vencidas
  const cuotasVencidas = cuotas.filter(c =>
    c.fecha_vence < hoyStr && c.estado !== 'Pagada' && c.estado !== 'Retirado'
  )
  if (cuotasVencidas.length >= 2) score += 25
  else if (cuotasVencidas.length === 1) score += 15

  // Avance bajo en semana avanzada
  const semana = alumno.semana_actual || 0
  const ultimaLlamada = llamadas[0]
  if (ultimaLlamada) {
    if (semana >= 8 && (ultimaLlamada.avance || 0) < 30) score += 15
  }

  // En Demo en semana 12+
  if (semana >= 12 && ultimaLlamada?.cuenta === 'Demo') score += 10

  // Fue crítico antes
  if (alumno.nivel_atencion === 'Crítico') score += 10

  score = Math.min(score, 100)

  let nivel = 'Bajo'
  if (score >= 56) nivel = 'Alto'
  else if (score >= 26) nivel = 'Medio'

  return { score, nivel }
}
