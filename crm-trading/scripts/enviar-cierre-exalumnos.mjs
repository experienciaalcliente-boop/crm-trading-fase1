// Script de SOLO CONTEO para el correo de cierre del Plan Exalumnos — el
// envío real vive en el botón "Enviar correo de cierre" del panel (llama a
// POST /api/reactivate-forzar-envio {campana:'cierre'}), no acá.
//
// Por qué: el envío real se intentó primero desde este script corriendo en
// la máquina local, y Gmail lo rechazó con "530 Authentication Required" —
// probablemente porque el login SMTP vino de una IP residencial distinta a
// la que usa siempre la cuenta (Vercel), y Google lo trató como actividad
// sospechosa. El endpoint del panel corre en Vercel, el mismo origen que ya
// viene enviando el resto de la campaña sin problemas.
//
// Uso: node scripts/enviar-cierre-exalumnos.mjs   (solo cuenta cuántos faltan, no envía nada)
// Requiere en .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

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
      .select('id, asesora_id, estado_campana, fecha_ultimo_envio')
      .eq('excluido', false)
      .range(desde, hasta)
  )
  const pendientes = candidatos.filter(l => !ESTADOS_YA_RESUELTOS.includes(l.estado_campana))
  const yaEnviados = candidatos.filter(l => l.estado_campana === 'Cierre enviado')

  const porAsesora = {}
  pendientes.forEach(l => { porAsesora[l.asesora_id] = (porAsesora[l.asesora_id] || 0) + 1 })

  console.log(`Total leads activos (excluido=false): ${candidatos.length}`)
  console.log(`Ya recibieron el correo de cierre: ${yaEnviados.length}`)
  console.log(`Pendientes de recibir el correo de cierre: ${pendientes.length}`)
  console.log('Pendientes por asesora:')
  Object.entries(porAsesora).forEach(([id, n]) => console.log(`  ${nombrePorId[id] || id}: ${n}`))
  console.log('\nPara enviar: usa el botón "Enviar correo de cierre" en el panel de Plan Exalumnos.')
}

main().catch(err => { console.error(err); process.exit(1) })
