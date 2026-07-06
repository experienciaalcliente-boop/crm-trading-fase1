// Vercel Cron (día 1 de cada mes) — actualiza la pregunta "¿De qué programa
// eres?" en ambas encuestas de NPS/satisfacción (Google Forms) con la lista
// de programas actualmente activos (misma regla de 24 semanas que usa el
// resto del CRM: src/lib/api.js#programaActivo). Así el supervisor nunca
// tiene que tocar los formularios a mano.
import { createClient } from '@supabase/supabase-js'

const DURACION_PROGRAMA_DIAS = 24 * 7

const FORM_IDS = {
  asesora:    '1nRhs_tk_YmHaGGk_dQNtgvB5TmG0QBksL96925NbrvM',
  orientador: '1xkcol4RJUVtTiTSV2IUdg1yJdfCxWBpRnioFhCR7DKg',
}

async function obtenerProgramasActivos() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabase
    .from('alumnos')
    .select('programa, fecha_inicio')
    .not('fecha_inicio', 'is', null)
  if (error) throw error

  const hoy = new Date()
  const grupos = {}
  data.forEach(a => {
    const fin = new Date(a.fecha_inicio + 'T00:00:00')
    fin.setDate(fin.getDate() + DURACION_PROGRAMA_DIAS)
    if (fin < hoy) return // programa ya culminado
    if (!grupos[a.programa] || a.fecha_inicio < grupos[a.programa]) grupos[a.programa] = a.fecha_inicio
  })
  return Object.entries(grupos)
    .sort((a, b) => b[1].localeCompare(a[1])) // más reciente primero
    .map(([programa]) => programa)
}

async function obtenerAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_FORMS_CLIENT_ID,
      client_secret: process.env.GOOGLE_FORMS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_FORMS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error('No se pudo refrescar el token de Google: ' + JSON.stringify(json))
  return json.access_token
}

async function actualizarFormulario(formId, accessToken, programasActivos) {
  const getRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const form = await getRes.json()
  if (!getRes.ok) throw new Error('No se pudo leer el formulario ' + formId + ': ' + JSON.stringify(form))

  // La pregunta de programa siempre es el primer ítem (se agregó antes que
  // el salto de página al crear el formulario) — se ubica por posición, no
  // por el texto exacto del título, porque el título se puede reescribir a
  // mano en el editor sin que eso rompa la sincronización automática.
  const index = 0
  const primerItem = (form.items || [])[0]
  if (!primerItem?.questionItem?.question?.choiceQuestion) {
    return { formId, actualizado: false, motivo: 'El primer ítem del formulario no es una pregunta de opción múltiple' }
  }

  const opcionesActuales = (primerItem.questionItem.question.choiceQuestion.options || [])
    .map(o => o.value)
  const sinCambios = opcionesActuales.length === programasActivos.length
    && opcionesActuales.every((v, i) => v === programasActivos[i])
  if (sinCambios) {
    return { formId, actualizado: false, motivo: 'Sin cambios', programas: programasActivos }
  }

  // updateMask acotado a las opciones — no toca el título ni el resto de la
  // pregunta, así se respeta si alguien reescribió el texto a mano.
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        updateItem: {
          item: {
            questionItem: {
              question: {
                choiceQuestion: { type: 'RADIO', options: programasActivos.map(v => ({ value: v })) },
              },
            },
          },
          location: { index },
          updateMask: 'questionItem.question.choiceQuestion.options',
        },
      }],
    }),
  })
  const updateJson = await updateRes.json()
  if (!updateRes.ok) throw new Error('No se pudo actualizar el formulario ' + formId + ': ' + JSON.stringify(updateJson))

  return { formId, actualizado: true, programas: programasActivos }
}

export default async function handler(req, res) {
  // Vercel agrega este header automáticamente al invocar el cron — evita que
  // cualquiera pueda disparar el endpoint solo conociendo la URL.
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const programasActivos = await obtenerProgramasActivos()
    const accessToken = await obtenerAccessToken()
    const resultados = await Promise.all(
      Object.values(FORM_IDS).map(formId => actualizarFormulario(formId, accessToken, programasActivos))
    )
    return res.status(200).json({ ok: true, resultados })
  } catch (err) {
    console.error('sync-programas-encuestas:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
