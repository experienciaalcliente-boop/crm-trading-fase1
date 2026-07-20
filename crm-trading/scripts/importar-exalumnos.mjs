// Script de un solo uso: lee "BASE DE EXALUMNOS.xlsx" (raíz de CRM INTERNO),
// la cruza con la tabla `alumnos` por codigo_alumno (mejor esfuerzo, no
// bloqueante si no hay match), reparte los 3202 exalumnos de forma aleatoria
// y equitativa entre las 4 asesoras del Plan Exalumnos, e inserta todo en
// `campana_exalumnos_alumnos` con estado_campana='Pendiente' (nadie recibe
// correo todavía — eso lo dispara /api/expcampana-activar cuando se prenda
// la campaña).
//
// Uso: node scripts/importar-exalumnos.mjs
// Requiere VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
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

const ASESORAS = {
  'Anael S.':     'cfb154c2-f598-4bfb-8f2b-809d26f8fe83',
  'Fabiola M.':   'e5653c76-5e98-4752-9c54-cd757b8452f5',
  'Katerin F':    'f7676411-95e5-43ca-afcd-a50230022411',
  'Alexandro S':  '6611cffb-f8ca-48cc-b869-3092655f901a',
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function main() {
  const env = cargarEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const excelPath = resolve(__dirname, '..', '..', '..', 'BASE DE EXALUMNOS.xlsx')
  const wb = XLSX.readFile(excelPath)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null })
  console.log(`Excel leído: ${rows.length} filas`)

  // Match por codigo_alumno contra la tabla alumnos, en lotes (evita URLs gigantes).
  const codigos = rows.map(r => String(r['Código']))
  const idPorCodigo = {}
  for (let i = 0; i < codigos.length; i += 200) {
    const lote = codigos.slice(i, i + 200)
    const { data, error } = await supabase.from('alumnos').select('id, codigo_alumno').in('codigo_alumno', lote)
    if (error) throw error
    data.forEach(a => { idPorCodigo[a.codigo_alumno] = a.id })
  }
  console.log(`Match encontrado para ${Object.keys(idPorCodigo).length} de ${rows.length}`)

  const nombresAsesora = shuffle(Object.keys(ASESORAS))
  const filasShuffled = shuffle(rows)

  const registros = filasShuffled.map((r, i) => {
    const codigo = String(r['Código'])
    const nombreAsesora = nombresAsesora[i % 4]
    const email = String(r.Email || '').trim().toLowerCase()
    // 6 de 3202 filas no traen Nombre en el Excel (sí traen email) — se usa
    // el prefijo del correo como respaldo para no perder el lead.
    const nombre = r.Nombre || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return {
      alumno_id: idPorCodigo[codigo] || null,
      codigo_alumno: codigo,
      nombre,
      email,
      telefono: r.Telefono ? String(r.Telefono) : null,
      programa_retirado: r.Paquete || null,
      paquete: r.Paquete || null,
      monto_pagado: r['Monto pagado del paquete en moneda acordada'] ?? null,
      monto_faltante: r['Monto faltante en moneda acordada'] ?? null,
      asesora_id: ASESORAS[nombreAsesora],
      estado_campana: 'Pendiente',
      excluido: false,
    }
  })

  const conteo = {}
  registros.forEach(r => { conteo[r.asesora_id] = (conteo[r.asesora_id] || 0) + 1 })
  console.log('Reparto:', Object.entries(ASESORAS).map(([n, id]) => `${n}: ${conteo[id] || 0}`).join(' · '))

  for (let i = 0; i < registros.length; i += 500) {
    const lote = registros.slice(i, i + 500)
    const { error } = await supabase.from('campana_exalumnos_alumnos').insert(lote)
    if (error) throw error
    console.log(`Insertados ${Math.min(i + 500, registros.length)} / ${registros.length}`)
  }

  console.log('Listo.')
}

main().catch(err => { console.error(err); process.exit(1) })
