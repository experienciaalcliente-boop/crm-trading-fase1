// Script de un solo uso: corrige `programa_retirado` en
// campana_exalumnos_alumnos. El import original (importar-exalumnos.mjs) le
// puso el mismo valor que `paquete` porque la columna "Programa" del Excel
// es un serial de fecha de Excel (ej. 46023) sin convertir. Este script la
// convierte a una cohorte legible tipo "Ene-26" (mismo estilo que el resto
// del CRM) y actualiza las filas ya insertadas por codigo_alumno.
//
// Uso: node scripts/actualizar-programa-exalumnos.mjs

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_LARGOS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

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

function excelSerialADate(serial) {
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

function programaLegible(valor) {
  if (typeof valor === 'number') {
    const d = excelSerialADate(valor)
    return `${MESES[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(-2)}`
  }
  if (typeof valor === 'string') {
    const m = valor.trim().toUpperCase().match(/^([A-ZÁÉÍÓÚ]+)\s+(\d{4})$/)
    if (m) {
      const idx = MESES_LARGOS.indexOf(m[1])
      if (idx >= 0) return `${MESES[idx]}-${m[2].slice(-2)}`
    }
    return valor
  }
  return null
}

async function main() {
  const env = cargarEnv()
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const excelPath = resolve(__dirname, '..', '..', '..', 'BASE DE EXALUMNOS.xlsx')
  const wb = XLSX.readFile(excelPath)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null })
  console.log(`Excel leído: ${rows.length} filas`)

  let actualizados = 0
  for (let i = 0; i < rows.length; i += 200) {
    const lote = rows.slice(i, i + 200)
    await Promise.all(lote.map(async (r) => {
      const codigo = String(r['Código'])
      const programa = programaLegible(r.Programa)
      const { error } = await supabase
        .from('campana_exalumnos_alumnos')
        .update({ programa_retirado: programa })
        .eq('codigo_alumno', codigo)
      if (error) throw error
      actualizados++
    }))
    console.log(`Actualizados ${Math.min(i + 200, rows.length)} / ${rows.length}`)
  }

  console.log(`Listo. ${actualizados} filas actualizadas.`)
}

main().catch(err => { console.error(err); process.exit(1) })
