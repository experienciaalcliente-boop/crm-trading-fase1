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
  // Filtrar solo registros de asesoras (no orientadores)
  return (data || []).filter(r => r.asesora?.rol !== 'orientador')
}

export async function fetchHistorialAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('registros_llamadas')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
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

export async function fetchCuotas({ estado, programa, ordenVencidas } = {}) {
  let query = supabase
    .from('cuotas')
    .select(`
      *,
      alumno:alumnos(id, nombre, programa, asesora)
    `)
    .order('fecha_vence', { ascending: true })

  if (estado && estado !== 'Todos') query = query.eq('estado', estado)

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
  if (payload.nueva_fecha)  updates.nueva_fecha  = payload.nueva_fecha
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

async function getZoomToken() {
  const accountId  = import.meta.env.VITE_ZOOM_ACCOUNT_ID
  const clientId   = import.meta.env.VITE_ZOOM_CLIENT_ID
  const clientSecret = import.meta.env.VITE_ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Faltan credenciales de Zoom. Configura las variables de entorno en Vercel.')
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  if (!res.ok) throw new Error('Error al autenticar con Zoom')
  const data = await res.json()
  return data.access_token
}

export async function crearReunionZoom({ titulo, fecha, hora, duracion = 45, alumno }) {
  const token = await getZoomToken()

  // Combinar fecha y hora en formato ISO
  const startTime = `${fecha}T${hora}:00`

  const res = await fetch('https://zoom.us/v2/users/experienciaalcliente@bursadvisory.com/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic:      `Orientación Técnica - ${alumno}`,
      type:       2, // reunión programada
      start_time: startTime,
      duration:   duracion,
      timezone:   'America/Lima',
      agenda:     titulo,
      settings: {
        host_video:        true,
        participant_video:  true,
        join_before_host:  true,
        waiting_room:      false,
        auto_recording:    'none',
      }
    })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Error al crear reunión en Zoom')
  }

  const meeting = await res.json()
  return {
    meeting_id: String(meeting.id),
    join_url:   meeting.join_url,
    start_url:  meeting.start_url,
  }
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
