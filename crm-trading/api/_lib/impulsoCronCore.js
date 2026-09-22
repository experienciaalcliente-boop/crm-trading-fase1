// Ciclo diario del agente Impulso BURS del Panel de Coordinación.
// A diferencia del agente de Email Marketing (que manda por Brevo), acá no
// hay email/teléfono guardado para alumnos activos en `alumnos` — el canal
// real es la asesora contactando por su WhatsApp personal. El agente arma
// el mensaje sugerido de cada toque y lo deja en panel_acciones_pendientes;
// al aprobar, solo se marca como "recordado" (no hay envío automático que
// ejecutar, es la asesora quien lo manda).
const TOQUES = [
  {
    numero: 1, offsetDias: 0,
    mensaje: (nombre) => `Hola ${nombre} 👋 ¡Felicidades por terminar el programa! Quería contarte que tu acceso a Impulso (las sesiones de los jueves, los videos y el canal de Telegram con JP) no tiene por qué terminar acá — se puede continuar por suscripción. Te cuento cómo en estos días.`,
  },
  {
    numero: 2, offsetDias: 3,
    mensaje: (nombre) => `${nombre}, en unos días se cierra tu acceso al canal de Telegram donde JP va avisando las zonas de precio según el escenario y el activo. Si quieres seguir teniendo ese seguimiento, es buen momento para conversarlo.`,
  },
  {
    numero: 3, offsetDias: 7,
    mensaje: (nombre) => `${nombre}, te dejo los planes de Impulso para que decidas con calma: 3M ($450 = $150/mes), 6M ($797 = $133/mes) y 12M ($997 = solo $83/mes). El de 12 meses sale a menos de un tercio por mes que el de 3. ¿Cuál te acomoda más?`,
  },
  {
    numero: 4, offsetDias: 14,
    mensaje: (nombre) => `${nombre}, ¿alguna duda sobre continuar en Impulso? Sigues teniendo las 3 sesiones en vivo al mes con JP y el acompañamiento en Telegram — es justo lo que ya veníamos usando estos meses.`,
  },
  {
    numero: 5, offsetDias: 21,
    mensaje: (nombre) => `${nombre}, último aviso de mi parte 🙂 Si quieres seguir en Impulso con JP, aquí estoy para ayudarte a activarlo. Cualquier cosa me escribes.`,
  },
]

async function sembrarSecuencia({ supabase, cohorte }) {
  const { data: alumnos, error } = await supabase
    .from('alumnos')
    .select('id, nombre, asesora, fecha_fin')
    .eq('programa', cohorte)
    .eq('estado', 'En Seguimiento')
  if (error) throw error
  if (!alumnos || alumnos.length === 0) return { sembrados: 0 }

  const { data: yaExisten } = await supabase.from('impulso_secuencia').select('alumno_id').eq('cohorte_egreso', cohorte)
  const idsConSecuencia = new Set((yaExisten || []).map(r => r.alumno_id))
  const pendientesDeSembrar = alumnos.filter(a => !idsConSecuencia.has(a.id))
  if (pendientesDeSembrar.length === 0) return { sembrados: 0 }

  const filas = []
  for (const a of pendientesDeSembrar) {
    const base = a.fecha_fin ? new Date(a.fecha_fin) : new Date()
    for (const t of TOQUES) {
      const fecha = new Date(base)
      fecha.setUTCDate(fecha.getUTCDate() + t.offsetDias)
      filas.push({
        alumno_id: a.id, cohorte_egreso: cohorte, touch_numero: t.numero,
        estado: 'Pendiente', fecha_prevista: fecha.toISOString().slice(0, 10),
        asesora_nombre: a.asesora,
      })
    }
  }
  const { error: errInsert } = await supabase.from('impulso_secuencia').insert(filas)
  if (errInsert) throw errInsert
  return { sembrados: pendientesDeSembrar.length }
}

async function existeAccionAbierta(supabase, impulsoSecuenciaId) {
  const { data } = await supabase
    .from('panel_acciones_pendientes')
    .select('id')
    .eq('agente', 'impulso')
    .eq('tipo', 'impulso.recordatorio_toque')
    .eq('estado', 'pendiente')
    .contains('payload', { impulso_secuencia_id: impulsoSecuenciaId })
    .limit(1)
  return (data || []).length > 0
}

export async function ejecutarCicloDiarioImpulso({ supabase }) {
  const { data: cohorteConfig } = await supabase.from('panel_supuestos').select('valor').eq('clave', 'impulso_cohorte_actual').maybeSingle()
  const cohorte = cohorteConfig?.valor
  if (!cohorte) return { ok: true, saltado: 'impulso_cohorte_actual no está definido en panel_supuestos' }

  const resumen = { sembrados: 0, propuestas: 0, errores: [] }
  try {
    const r = await sembrarSecuencia({ supabase, cohorte })
    resumen.sembrados = r.sembrados
  } catch (err) {
    resumen.errores.push(`siembra: ${err.message}`)
  }

  const hoyStr = new Date().toISOString().slice(0, 10)
  const { data: toquesDeHoy } = await supabase
    .from('impulso_secuencia')
    .select('id, alumno_id, touch_numero, asesora_nombre, fecha_prevista')
    .eq('cohorte_egreso', cohorte).eq('estado', 'Pendiente').lte('fecha_prevista', hoyStr)

  for (const toque of toquesDeHoy || []) {
    try {
      if (await existeAccionAbierta(supabase, toque.id)) continue
      const { data: alumno } = await supabase.from('alumnos').select('nombre').eq('id', toque.alumno_id).maybeSingle()
      const nombre = alumno?.nombre || 'alumno'
      const def = TOQUES.find(t => t.numero === toque.touch_numero)
      const mensajeSugerido = def ? def.mensaje(nombre) : ''

      await supabase.from('panel_acciones_pendientes').insert({
        agente: 'impulso', tipo: 'impulso.recordatorio_toque',
        resumen: `Toque ${toque.touch_numero}/5 de Impulso para ${nombre} — asesora ${toque.asesora_nombre || 'sin asignar'}.`,
        payload: { impulso_secuencia_id: toque.id, alumno_id: toque.alumno_id, alumno_nombre: nombre, touch_numero: toque.touch_numero, asesora_nombre: toque.asesora_nombre, mensaje_sugerido: mensajeSugerido },
      })
      await supabase.from('impulso_secuencia').update({ estado: 'Propuesta' }).eq('id', toque.id)
      resumen.propuestas++
    } catch (err) {
      resumen.errores.push(`toque ${toque.id}: ${err.message}`)
    }
  }

  return { ok: true, cohorte, ...resumen }
}
