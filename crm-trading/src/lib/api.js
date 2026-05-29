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
  // rows: [{ nombre, programa, semana_actual, asesora, estado }]
  const { data, error } = await supabase
    .from('alumnos')
    .upsert(rows, { onConflict: 'nombre,programa', ignoreDuplicates: false })
    .select()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// ASESORAS
// ─────────────────────────────────────────

export async function fetchAsesoras() {
  const { data, error } = await supabase
    .from('asesoras')
    .select('id, nombre')
    .eq('activo', true)
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
      asesora:asesoras(nombre)
    `)
    .eq('fecha', hoy)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
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

// Importar historial masivo
export async function importarHistorialLlamadas(rows) {
  // rows deben tener alumno_id ya resuelto
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
// REAL TIME — suscribirse a cambios de hoy
// ─────────────────────────────────────────

export function suscribirRegistrosHoy(callback) {
  const hoy = new Date().toISOString().split('T')[0]
  const channel = supabase
    .channel('registros-hoy')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'registros_llamadas', filter: `fecha=eq.${hoy}` },
      callback
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
