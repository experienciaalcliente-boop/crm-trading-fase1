import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { upsertAlumnos, importarHistorialLlamadas, upsertCuotas } from '../lib/api'
import { supabase } from '../lib/supabase'

// ── Convierte número serial de Excel a formato Mes-AA ──────────
function excelSerialToMesAnio(val) {
  if (!val) return ''
  const str = String(val).trim()
  // Ya tiene formato texto (Jun-26, Ene-26, etc.) → dejarlo
  if (/^[A-Za-záéíóúñ]{3}-\d{2}$/i.test(str)) return str
  // Es número serial de Excel (ej: 46174)
  const num = parseInt(str)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000)
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const mes = meses[date.getUTCMonth()]
    const anio = String(date.getUTCFullYear()).slice(-2)
    return `${mes}-${anio}`
  }
  return str
}

// ── Convierte número serial de Excel a fecha YYYY-MM-DD ────────
function excelSerialToFecha(val) {
  if (!val) return ''
  const str = String(val).trim()
  // Ya tiene formato fecha texto
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const num = parseInt(str)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  return str
}

const TIPOS = {
  alumnos: {
    titulo: 'Base de alumnos',
    descripcion: 'Carga o actualiza el listado de alumnos. Si ya existen, se actualizarán.',
    columnas: 'Nombre · Programa · Semana actual · Asesora · Estado',
  },
  historial: {
    titulo: 'Historial de llamadas',
    descripcion: 'Importa registros históricos. Los duplicados se omiten automáticamente.',
    columnas: 'Codigo · Fecha · Alumno · Semana · Asesora · Respondio · Avance · Cuenta · Beneficio · Retiro · Monto · Observaciones',
  },
  cuotas: {
    titulo: 'Cuotas de pago',
    descripcion: 'Importa las cuotas pendientes de los alumnos. Se identifican por alumno y número de cuota.',
    columnas: 'Alumno · Numero cuota · Fecha vence · Monto · Moneda (USD/PEN) · Estado',
  },
}

export default function ImportPage() {
  const [tipo,      setTipo]      = useState('alumnos')
  const [preview,   setPreview]   = useState(null)
  const [rawData,   setRawData]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const inputRef = useRef()

  function limpiar() {
    setPreview(null); setRawData([]); setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function onTipoChange(t) { setTipo(t); limpiar() }

  function handleFile(file) {
    if (!file) return
    limpiar()
    const ext = file.name.split('.').pop().toLowerCase()
    const reader = new FileReader()

    reader.onload = (e) => {
      let data = []
      if (ext === 'csv') {
        const text = e.target.result
        // Detectar separador automáticamente (coma o punto y coma)
        const firstLine = text.split('\n')[0]
        const sep = firstLine.includes(';') ? ';' : ','
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''))
        data = lines.slice(1).map(line => {
          const vals = line.split(sep).map(v => v.trim().replace(/"/g, ''))
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
        })
      } else {
        // Excel: usar dateNF para que las fechas vengan como texto
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false, raw: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
      }
      setRawData(data)
      setPreview({ headers: Object.keys(data[0] || {}), rows: data.slice(0, 5), total: data.length })
    }

    if (ext === 'csv') reader.readAsText(file, 'UTF-8')
    else reader.readAsArrayBuffer(file)
  }

  // ── Mapeo flexible de columnas ──────────────────────────────
  function col(row, ...keys) {
    for (const k of keys) {
      const found = Object.keys(row).find(c =>
        c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g,'')
          .includes(k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g,''))
      )
      if (found !== undefined && row[found] !== undefined && row[found] !== '') {
        return String(row[found]).trim()
      }
    }
    return ''
  }

  // ── Procesar alumnos ────────────────────────────────────────
  async function procesarAlumnos() {
    const rows = rawData
      .map(r => ({
        nombre:        col(r, 'nombre', 'name', 'alumno'),
        // Convertir número serial de Excel a Mes-AA
        programa:      excelSerialToMesAnio(col(r, 'programa', 'program')),
        semana_actual: col(r, 'semana', 'week') || '0',
        asesora:       col(r, 'asesora', 'asesor', 'advisor'),
        estado:        col(r, 'estado', 'status') || 'Activo',
        activo:        true,
      }))
      .filter(r => r.nombre && r.programa)

    if (!rows.length) { toast.error('No se encontraron filas válidas'); return }

    setLoading(true)
    try {
      const result = await upsertAlumnos(rows)
      setResultado({ ok: true, msg: `${result.length} alumnos cargados/actualizados correctamente.` })
      toast.success(`${result.length} alumnos importados ✓`)
      limpiar()
    } catch (err) {
      setResultado({ ok: false, msg: err.message })
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Procesar historial ──────────────────────────────────────
  async function procesarHistorial() {
    const { data: alumnosDB } = await supabase.from('alumnos').select('id, nombre, programa')
    const alumnoMap = {}
    alumnosDB?.forEach(a => { alumnoMap[a.nombre.toLowerCase()] = a.id })

    const rows = rawData
      .map((r, i) => {
        const nombre = col(r, 'alumno', 'nombre', 'name')
        const alumno_id = alumnoMap[nombre.toLowerCase()] || null
        return {
          codigo:       col(r, 'codigo', 'code') || `IMP-${String(i+1).padStart(6,'0')}`,
          fecha:        excelSerialToFecha(col(r, 'fecha', 'date')) || new Date().toISOString().split('T')[0],
          alumno_id,
          semana:       col(r, 'semana'),
          respondio:    col(r, 'respondio', 'respondió'),
          avance:       parseFloat(col(r, 'avance')) || null,
          mentoria:     col(r, 'mentoria'),
          cuenta:       col(r, 'cuenta'),
          // Balance puede contener número (Real) o texto de fase (Fondeo)
          // El sistema detecta automáticamente qué tipo es
          capital_real: (() => {
            const bal = col(r, 'balance', 'capital', 'capitalreal')
            const cuenta = col(r, 'cuenta')
            if (cuenta === 'Real' || cuenta === 'real') return parseFloat(bal) || null
            const num = parseFloat(bal)
            return !isNaN(num) && !/fase|aprobad/i.test(bal) ? num : null
          })(),
          fase_fondeo: (() => {
            const bal = col(r, 'balance', 'capital', 'capitalreal')
            const fase = col(r, 'fase', 'fasefondeo')
            const cuenta = col(r, 'cuenta')
            // Si tiene valor explícito de fase, usarlo
            if (fase) return fase
            // Si la cuenta es Fondeo y Balance tiene texto, mapearlo
            if (cuenta === 'Fondeo' || cuenta === 'fondeo') {
              const b = String(bal).toLowerCase().trim()
              if (b.includes('primera') || b === 'fase 1' || b === '1') return 'Primera fase'
              if (b.includes('segunda') || b === 'fase 2' || b === '2') return 'Segunda fase'
              if (b.includes('aprobad')) return 'Aprobado'
              if (bal && isNaN(parseFloat(bal))) return bal // texto desconocido, pasar tal cual
            }
            return null
          })(),
          beneficio:    parseFloat(col(r, 'beneficio')) || null,
          retiro:       col(r, 'retiro'),
          monto_retiro: parseFloat(col(r, 'monto')) || null,
          observaciones: col(r, 'observacion', 'observaciones', 'comentario'),
        }
      })
      .filter(r => r.alumno_id)

    if (!rows.length) {
      toast.error('No se encontraron filas con alumnos reconocidos. ¿Ya importaste la base de alumnos?')
      return
    }

    setLoading(true)
    try {
      const inserted = await importarHistorialLlamadas(rows)
      setResultado({ ok: true, msg: `${inserted} registros históricos importados.` })
      toast.success('Historial importado ✓')
      limpiar()
    } catch (err) {
      setResultado({ ok: false, msg: err.message })
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Procesar cuotas ────────────────────────────────────────
  async function procesarCuotas() {
    const { data: alumnosDB } = await supabase.from('alumnos').select('id, nombre')
    const alumnoMap = {}
    // Mapa por nombre exacto en minúsculas
    alumnosDB?.forEach(a => { alumnoMap[a.nombre.toLowerCase().trim()] = a.id })

    // Mapeo de estados del archivo a los valores del sistema
    function mapearEstado(estadoRaw) {
      if (!estadoRaw) return 'No iniciada'
      const e = estadoRaw.toLowerCase().trim()
      if (e.includes('pagad') || e.includes('paid') || e === 'completo') return 'Pagada'
      if (e.includes('parcial') || e.includes('partial')) return 'Pago parcial'
      if (e.includes('prorrog') || e.includes('prórroga') || e.includes('prorroga')) return 'Prórroga'
      if (e.includes('reserva') || e.includes('reserve')) return 'Reserva académica'
      if (e.includes('retir') || e.includes('baja')) return 'Retirado'
      if (e.includes('pendiente') || e.includes('pending') || e.includes('iniciada') || e === '') return 'No iniciada'
      return 'No iniciada'
    }

    const rows = rawData.map((r, i) => {
      // Buscar columna Alumno de forma más agresiva
      const nombre = col(r, 'alumno', 'nombre', 'name', 'student') || ''
      const alumno_id = alumnoMap[nombre.toLowerCase().trim()] || null

      // Fecha — puede ser serial o texto
      const fechaRaw = col(r, 'fecha', 'vence', 'fechavence', 'fechavencimiento', 'date')

      // Monto — buscar columna de monto en moneda acordada primero
      const montoRaw = col(r, 'montodelaenmonedaacordada', 'montocuotamonedaacordada',
                            'montodeacuerdoalamoneda', 'monto', 'amount', 'importe',
                            'cuotamonedaacordada')
        || col(r, 'moneda acordada') || col(r, 'monto de la cuota en moneda acordada')

      // Moneda
      const monedaRaw = col(r, 'moneda', 'monedaacordada', 'currency', 'moneda acordada')

      // Número de cuota
      const nroCuota = parseInt(col(r, 'nro', 'numero', 'cuota', 'numerocuota', 'nrodecuota', 'cuotaid')) || (i + 1)

      // Estado
      const estadoRaw = col(r, 'estadodelacuota', 'estado', 'status', 'estado de la cuota')

      return {
        alumno_id,
        numero_cuota: nroCuota,
        fecha_vence:  excelSerialToFecha(fechaRaw) || new Date().toISOString().split('T')[0],
        monto:        parseFloat(montoRaw) || 0,
        moneda:       monedaRaw ? monedaRaw.toUpperCase().trim().slice(0,3) : 'PEN',
        estado:       mapearEstado(estadoRaw),
      }
    }).filter(r => r.alumno_id && r.monto > 0)

    if (!rows.length) {
      toast.error('No se encontraron cuotas válidas. ¿Ya importaste la base de alumnos?')
      return
    }
    setLoading(true)
    try {
      const total = await upsertCuotas(rows)
      setResultado({ ok: true, msg: `${total} cuotas importadas/actualizadas correctamente.` })
      toast.success(`${total} cuotas importadas ✓`)
      limpiar()
    } catch (err) {
      setResultado({ ok: false, msg: err.message })
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const info = TIPOS[tipo]

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#e2e8f4', fontSize: 20 }}>Importar datos</h1>
        <p style={{ fontSize: 13, color: '#506080', marginTop: 3 }}>Carga o actualiza información desde archivos Excel o CSV</p>
      </div>

      {/* Selector tipo */}
      <div className="crm-card" style={{ display: 'inline-flex', gap: 4, padding: 4, marginBottom: 20 }}>
        {Object.entries(TIPOS).map(([key, val]) => (
          <button key={key} onClick={() => onTipoChange(key)}
            style={{
              padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s', border: 'none',
              background: tipo === key ? '#4e8fff' : 'transparent',
              color: tipo === key ? '#fff' : '#506080',
            }}>
            {val.titulo}
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="crm-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f4', marginBottom: 4 }}>{info.titulo}</div>
        <div style={{ fontSize: 12, color: '#7a8aaa', marginBottom: 8 }}>{info.descripcion}</div>
        <div style={{ fontSize: 11, color: '#506080', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px', fontFamily: 'DM Mono, monospace' }}>
          Columnas esperadas: {info.columnas}
        </div>
      </div>

      {/* Upload zone */}
      {!preview && (
        <label
          style={{ display: 'block', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4e8fff' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; handleFile(e.dataTransfer.files[0]) }}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <FileSpreadsheet size={32} style={{ color: '#3d5070', margin: '0 auto 12px' }} strokeWidth={1} />
          <div style={{ fontSize: 14, fontWeight: 500, color: '#7a8aaa', marginBottom: 4 }}>Arrastra tu archivo aquí</div>
          <div style={{ fontSize: 12, color: '#3d5070' }}>o haz clic para seleccionar · CSV o Excel (.xlsx)</div>
        </label>
      )}

      {/* Preview */}
      {preview && (
        <div className="crm-card">
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f4' }}>Vista previa — {preview.total} filas</span>
            <button className="crm-btn crm-btn-sm" onClick={limpiar}>✕ Cambiar archivo</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table" style={{ fontSize: 12 }}>
              <thead><tr>{preview.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map(h => (
                      <td key={h} style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {/* Mostrar conversión automática en preview */}
                        {h.toLowerCase().includes('programa')
                          ? excelSerialToMesAnio(String(row[h] || ''))
                          : (h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date'))
                          ? excelSerialToFecha(String(row[h] || ''))
                          : String(row[h] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.total > 5 && (
            <div style={{ padding: '8px 18px', fontSize: 11, color: '#3d5070', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              … y {preview.total - 5} filas más
            </div>
          )}
          <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button className="crm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={tipo === 'alumnos' ? procesarAlumnos : tipo === 'historial' ? procesarHistorial : procesarCuotas}
              disabled={loading}>
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                : <><Upload size={14} /> Importar {preview.total} registros</>}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 12, marginTop: 16,
          background: resultado.ok ? 'rgba(34,201,142,0.08)' : 'rgba(240,92,92,0.08)',
          border: `1px solid ${resultado.ok ? 'rgba(34,201,142,0.25)' : 'rgba(240,92,92,0.25)'}`,
        }}>
          {resultado.ok
            ? <CheckCircle2 size={16} style={{ color: '#2dd4a0', flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle  size={16} style={{ color: '#f07070', flexShrink: 0, marginTop: 1 }} />}
          <span style={{ fontSize: 13, color: resultado.ok ? '#2dd4a0' : '#f07070' }}>{resultado.msg}</span>
        </div>
      )}
    </div>
  )
}
