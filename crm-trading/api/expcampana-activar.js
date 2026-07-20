// Activa el Plan Exalumnos y envía el Correo 0 (Aula Virtual) DE INMEDIATO
// a todos los leads que aún no iniciaron su secuencia — mismo patrón que
// api/reactivate-activar.js. El Correo 1 (Impulso) de cada lead sigue el
// cronograma normal vía el cron diario compartido (api/reactivate-cron.js).
import { createClient } from '@supabase/supabase-js'
import { enviarCorreoLead, transporterGmailPool, procesarEnLotes } from './_lib/expCampanaSend.js'

const CONCURRENCIA_ENVIO = 8

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const baseUrl = process.env.PUBLIC_APP_URL
  if (!baseUrl) return res.status(500).json({ error: 'Falta configurar PUBLIC_APP_URL en las variables de entorno' })
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD no están configurados en el servidor' })
  }

  try {
    await supabase.from('campana_exalumnos_config').update({
      campana_activa: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 'default')

    const { data: candidatos, error } = await supabase
      .from('campana_exalumnos_alumnos')
      .select('id, nombre, email, asesora_id')
      .eq('excluido', false)
      .eq('estado_campana', 'Pendiente')
      .is('fecha_inicio_campana', null)
    if (error) throw error

    const transporter = transporterGmailPool()
    const hoyStr = new Date().toISOString().slice(0, 10)

    const { enviados, errores } = await procesarEnLotes(candidatos, CONCURRENCIA_ENVIO, (lead) =>
      enviarCorreoLead({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, lead, correoNumero: 0, fechaInicio: hoyStr })
    )
    transporter.close()

    return res.status(200).json({ ok: true, activada: true, total: candidatos.length, enviados, errores })
  } catch (err) {
    console.error('expcampana-activar:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
