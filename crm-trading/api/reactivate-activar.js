// Activa la campaña Reactivate Burs y, a diferencia del cron diario, envía
// el Correo 0 DE INMEDIATO a todos los alumnos que aún no iniciaron su
// secuencia — así el supervisor ve resultado apenas activa el interruptor,
// en vez de esperar a la próxima corrida del cron (9am hora Perú). Los
// correos 1 a 6 de cada alumno sí siguen el cronograma normal vía
// api/reactivate-cron.js.
import { createClient } from '@supabase/supabase-js'
import { enviarCorreoAlumno, transporterGmailPool, procesarEnLotes } from './_lib/reactivateSend.js'

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
    const { data: config } = await supabase.from('reactivate_config').select('*').eq('id', 'default').maybeSingle()

    await supabase.from('reactivate_config').update({
      campana_activa: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 'default')

    const { data: candidatos, error } = await supabase
      .from('reactivate_alumnos')
      .select('id, nombre, email')
      .eq('excluido', false)
      .eq('estado_campana', 'Pendiente')
      .is('fecha_inicio_campana', null)
    if (error) throw error

    const transporter = transporterGmailPool()
    const hoyStr = new Date().toISOString().slice(0, 10)
    const testimonioUrls = { 1: config?.testimonio_url_1, 2: config?.testimonio_url_2 }

    const { enviados, errores } = await procesarEnLotes(candidatos, CONCURRENCIA_ENVIO, (alumno) =>
      enviarCorreoAlumno({ supabase, transporter, baseUrl, gmailUser: process.env.GMAIL_USER, alumno, correoNumero: 0, fechaInicio: hoyStr, testimonioUrls })
    )
    transporter.close()

    return res.status(200).json({ ok: true, activada: true, total: candidatos.length, enviados, errores })
  } catch (err) {
    console.error('reactivate-activar:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
