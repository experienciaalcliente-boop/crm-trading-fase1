// El plan Hobby de Vercel no permite crons más frecuentes que 1/día, así que
// esto ya no corre por cron: lo dispara el propio frontend cada vez que se
// carga el Dashboard (ver fetchEncuestasSatisfaccion en lib/api.js). Para no
// golpear la API de Google en cada carga de página, se auto-limita a 1
// ejecución real cada 5 minutos (tabla sync_estado) — el resto de llamadas
// responde de inmediato sin tocar Google. Trae las respuestas nuevas de
// ambas encuestas de NPS/satisfacción y las guarda en Supabase. Se identifica
// cada pregunta por su questionId (fijo mientras no se cambie la estructura
// de las encuestas — ver sync-programas-encuestas.js para ese otro cron).
import { createClient } from '@supabase/supabase-js'

const INTERVALO_MIN_MS = 5 * 60 * 1000

const FORMS = {
  asesoria: {
    formId: '1nRhs_tk_YmHaGGk_dQNtgvB5TmG0QBksL96925NbrvM',
    q: { programa: '2c07016c', nps: '6861f853', csat: '50ae11e4', r3: '57e76909', r4: '503a3e03', comentario: '1b0a8b8b' },
  },
  orientacion: {
    formId: '1xkcol4RJUVtTiTSV2IUdg1yJdfCxWBpRnioFhCR7DKg',
    q: { programa: '5330ac0f', nps: '74b347b8', csat: '2a7e92b6', r3: '44ba9dab', r4: '28853160', comentario: '26866650' },
  },
}

function valorTexto(respuesta, questionId) {
  return respuesta.answers?.[questionId]?.textAnswers?.answers?.[0]?.value ?? null
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

async function sincronizarFormulario(tipo, { formId, q }, accessToken, supabase) {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`No se pudieron leer respuestas de ${tipo}: ` + JSON.stringify(json))

  const respuestas = json.responses || []
  if (!respuestas.length) return { tipo, nuevas: 0, total: 0 }

  const filas = respuestas.map(r => ({
    tipo,
    google_response_id: r.responseId,
    programa: valorTexto(r, q.programa),
    nps_score: (() => { const v = valorTexto(r, q.nps); return v != null ? parseInt(v, 10) : null })(),
    csat_label: valorTexto(r, q.csat),
    respuesta_3: valorTexto(r, q.r3),
    respuesta_4: valorTexto(r, q.r4),
    comentario: valorTexto(r, q.comentario),
    fecha_respuesta: r.lastSubmittedTime || r.createTime,
  }))

  const { data, error } = await supabase
    .from('encuestas_satisfaccion')
    .upsert(filas, { onConflict: 'google_response_id', ignoreDuplicates: true })
    .select('id')
  if (error) throw error

  return { tipo, nuevas: data?.length || 0, total: filas.length }
}

export default async function handler(req, res) {
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: estado } = await supabase
      .from('sync_estado')
      .select('ultima_ejecucion')
      .eq('id', 'respuestas_encuestas')
      .single()

    const ahora = Date.now()
    const ultima = estado?.ultima_ejecucion ? new Date(estado.ultima_ejecucion).getTime() : 0
    if (ahora - ultima < INTERVALO_MIN_MS) {
      return res.status(200).json({ ok: true, saltado: true })
    }

    await supabase
      .from('sync_estado')
      .update({ ultima_ejecucion: new Date(ahora).toISOString() })
      .eq('id', 'respuestas_encuestas')

    const accessToken = await obtenerAccessToken()
    const resultados = await Promise.all(
      Object.entries(FORMS).map(([tipo, cfg]) => sincronizarFormulario(tipo, cfg, accessToken, supabase))
    )
    return res.status(200).json({ ok: true, resultados })
  } catch (err) {
    console.error('sync-respuestas-encuestas:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
