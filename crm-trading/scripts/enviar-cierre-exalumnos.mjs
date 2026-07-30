// Script de un solo uso: envía el correo de CIERRE del Plan Exalumnos (último
// correo del ciclo — oferta de pagar solo el saldo pendiente, no el valor
// completo de $3,000) a todo lead que siga activo en la campaña, y luego
// desactiva la secuencia automática C1-C8 (campana_activa=false) para que el
// cron diario deje de escribirle a nadie después de este cierre.
//
// "Activo" = excluido=false y estado_campana no está en Reactivado / No
// interesado / Cierre enviado (a esos no se les reenvía nada).
//
// Uso:
//   node scripts/enviar-cierre-exalumnos.mjs --dry-run   (solo cuenta, no envía ni desactiva)
//   node scripts/enviar-cierre-exalumnos.mjs             (envío real)
//
// Requiere en .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// GMAIL_USER, GMAIL_APP_PASSWORD, PUBLIC_APP_URL.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { construirCorreoCierre, conPixelDeApertura, variantePararCierre } from '../api/_lib/expCampanaEmails.js'
import { waLinkPara } from '../api/_lib/expCampanaAsesoras.js'
import { transporterGmailPool, procesarEnLotes } from '../api/_lib/reactivateSend.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')

function cargarEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  const contenido = readFileSync(envPath, 'utf-8')
  const env = {}
  for (const linea of contenido.split('\n')) {
    const m = linea.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  }
  return env
}

const env = cargarEnv()
for (const [k, v] of Object.entries(env)) process.env[k] = v

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const baseUrl = env.PUBLIC_APP_URL

const ESTADOS_YA_RESUELTOS = ['Reactivado', 'No interesado', 'Cierre enviado']

async function fetchTodosPaginado(construirQuery) {
  const TAMANO_PAGINA = 1000
  let desde = 0
  let todos = []
  while (true) {
    const { data, error } = await construirQuery(desde, desde + TAMANO_PAGINA - 1)
    if (error) throw error
    todos = todos.concat(data || [])
    if (!data || data.length < TAMANO_PAGINA) break
    desde += TAMANO_PAGINA
  }
  return todos
}

async function main() {
  const { data: asesoras } = await supabase.from('asesoras').select('id, nombre')
  const nombrePorId = Object.fromEntries((asesoras || []).map(a => [a.id, a.nombre]))

  const candidatos = await fetchTodosPaginado((desde, hasta) =>
    supabase
      .from('campana_exalumnos_alumnos')
      .select('id, nombre, email, asesora_id, estado_campana')
      .eq('excluido', false)
      .range(desde, hasta)
  )
  const porEnviar = candidatos.filter(l => !ESTADOS_YA_RESUELTOS.includes(l.estado_campana))

  const porAsesora = {}
  porEnviar.forEach(l => { porAsesora[l.asesora_id] = (porAsesora[l.asesora_id] || 0) + 1 })
  console.log(`Total leads activos (excluido=false): ${candidatos.length}`)
  console.log(`Recibirán el correo de cierre: ${porEnviar.length}`)
  console.log('Por asesora:')
  Object.entries(porAsesora).forEach(([id, n]) => console.log(`  ${nombrePorId[id] || id}: ${n}`))

  if (DRY_RUN) {
    console.log('\n--dry-run: no se envía nada ni se desactiva la campaña.')
    return
  }

  const transporter = transporterGmailPool()
  const variante = variantePararCierre()
  const { enviados, errores } = await procesarEnLotes(porEnviar, 20, async (lead) => {
    const token = randomUUID()
    const waUrl = waLinkPara(lead.asesora_id, variante)
    const pixelUrl = `${baseUrl}/api/reactivate-track?t=${token}&e=open`
    const { asunto, html } = construirCorreoCierre({ nombre: lead.nombre, waUrl, baseUrl })
    const htmlConPixel = conPixelDeApertura(html, pixelUrl)

    await transporter.sendMail({
      from: `"BURS Advisory" <${env.GMAIL_USER}>`,
      to: lead.email,
      subject: asunto,
      html: htmlConPixel,
    })

    await supabase.from('campana_exalumnos_envios').insert({
      alumno_id: lead.id,
      correo_numero: 99, // 99 = correo de cierre, fuera del rango 0-9 de la secuencia C1-C8
      token,
    })

    await supabase.from('campana_exalumnos_alumnos').update({
      estado_campana: 'Cierre enviado',
      fecha_ultimo_envio: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
  })
  transporter.close()

  console.log(`\nEnviados: ${enviados}, errores: ${errores}`)

  await supabase.from('campana_exalumnos_config')
    .update({ campana_activa: false, updated_at: new Date().toISOString() })
    .eq('id', 'default')
  console.log('Campaña Plan Exalumnos desactivada (campana_activa=false) — el cron ya no continuará la secuencia C1-C8.')
}

main().catch(err => { console.error(err); process.exit(1) })
