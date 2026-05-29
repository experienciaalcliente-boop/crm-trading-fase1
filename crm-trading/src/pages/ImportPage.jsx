import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { upsertAlumnos, importarHistorialLlamadas } from '../lib/api'
import { supabase } from '../lib/supabase'

const TIPOS = {
  alumnos: {
    titulo: 'Base de alumnos',
    descripcion: 'Carga o actualiza el listado de alumnos. Si ya existen, se actualizarán.',
    columnas: 'Nombre completo · Programa · Semana actual · Asesora · Estado',
    color: 'brand',
  },
  historial: {
    titulo: 'Historial de llamadas',
    descripcion: 'Importa registros históricos. Los duplicados (mismo código) se omiten automáticamente.',
    columnas: 'Codigo · Fecha · Alumno · Programa · Semana · Asesora · Respondio · Avance · Cuenta · Beneficio · Retiro · Monto · Observaciones',
    color: 'success',
  },
}

export default function ImportPage() {
  const [tipo,     setTipo]     = useState('alumnos')
  const [preview,  setPreview]  = useState(null)
  const [rawData,  setRawData]  = useState([])
  const [loading,  setLoading]  = useState(false)
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
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        data = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
        })
      } else {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      }
      setRawData(data)
      setPreview({ headers: Object.keys(data[0] || {}), rows: data.slice(0, 5), total: data.length })
    }

    if (ext === 'csv') reader.readAsText(file, 'UTF-8')
    else reader.readAsArrayBuffer(file)
  }

  // ── Mapeo flexible de columnas ──
  function col(row, ...keys) {
    for (const k of keys) {
      const found = Object.keys(row).find(c =>
        c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g,'')
          .includes(k.toLowerCase().replace(/\s/g,''))
      )
      if (found) return String(row[found] || '').trim()
    }
    return ''
  }

  async function procesarAlumnos() {
    const rows = rawData
      .map(r => ({
        nombre:         col(r, 'nombre', 'name', 'alumno'),
        programa:       col(r, 'programa', 'program'),
        semana_actual:  col(r, 'semana', 'week'),
        asesora:        col(r, 'asesora', 'asesor'),
        estado:         col(r, 'estado', 'status') || 'Activo',
        activo:         true,
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

  async function procesarHistorial() {
    // Primero necesitamos resolver los IDs de alumnos
    const { data: alumnosDB } = await supabase.from('alumnos').select('id, nombre, programa')
    const alumnoMap = {}
    alumnosDB?.forEach(a => { alumnoMap[a.nombre.toLowerCase()] = a.id })

    const rows = rawData
      .map((r, i) => {
        const nombre = col(r, 'alumno', 'nombre', 'name')
        const alumno_id = alumnoMap[nombre.toLowerCase()] || null
        return {
          codigo:       col(r, 'codigo', 'code') || `IMP-${String(i+1).padStart(6,'0')}`,
          fecha:        col(r, 'fecha', 'date') || new Date().toISOString().split('T')[0],
          alumno_id,
          semana:       col(r, 'semana'),
          respondio:    col(r, 'respondio', 'respondió'),
          avance:       parseFloat(col(r, 'avance')) || null,
          mentoria:     col(r, 'mentoria'),
          cuenta:       col(r, 'cuenta'),
          capital_real: parseFloat(col(r, 'capital', 'capitalreal')) || null,
          fase_fondeo:  col(r, 'fase', 'fasefondeo'),
          beneficio:    parseFloat(col(r, 'beneficio')) || null,
          retiro:       col(r, 'retiro'),
          monto_retiro: parseFloat(col(r, 'monto')) || null,
          observaciones: col(r, 'observacion', 'observaciones', 'comentario'),
        }
      })
      .filter(r => r.alumno_id) // solo los que tengan alumno válido

    if (!rows.length) {
      toast.error('No se encontraron filas con alumnos reconocidos. ¿Ya importaste la base de alumnos?')
      return
    }

    setLoading(true)
    try {
      const inserted = await importarHistorialLlamadas(rows)
      setResultado({ ok: true, msg: `${inserted} registros históricos importados (duplicados omitidos).` })
      toast.success(`Historial importado ✓`)
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
    <div className="p-6 max-w-3xl mx-auto animate-fadeUp">
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-xl">Importar datos</h1>
        <p className="text-sm text-muted mt-0.5">Carga o actualiza información desde archivos Excel o CSV</p>
      </div>

      {/* Selector de tipo */}
      <div className="crm-card p-1 mb-5 inline-flex gap-1">
        {Object.entries(TIPOS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => onTipoChange(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tipo === key ? 'bg-brand text-white' : 'text-sub hover:text-white'}`}
          >
            {val.titulo}
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="crm-card p-4 mb-5 border-brand/20">
        <div className="text-sm font-semibold text-white mb-1">{info.titulo}</div>
        <div className="text-xs text-sub mb-2">{info.descripcion}</div>
        <div className="text-[10px] text-muted bg-bg-3 rounded-lg px-3 py-2 font-mono">
          Columnas esperadas: {info.columnas}
        </div>
      </div>

      {/* Upload zone */}
      {!preview && (
        <label
          className="block border-2 border-dashed border-line2 rounded-2xl p-10 text-center cursor-pointer
                     hover:border-brand hover:bg-brand/5 transition-all"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <FileSpreadsheet size={32} className="mx-auto text-muted mb-3" strokeWidth={1} />
          <div className="text-sm font-medium text-sub mb-1">Arrastra tu archivo aquí</div>
          <div className="text-xs text-muted">o haz clic para seleccionar · CSV o Excel (.xlsx)</div>
        </label>
      )}

      {/* Preview */}
      {preview && (
        <div className="crm-card animate-fadeUp">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Vista previa — {preview.total} filas</div>
            <button className="crm-btn crm-btn-sm text-xs" onClick={limpiar}>✕ Cambiar archivo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="crm-table text-xs">
              <thead>
                <tr>{preview.headers.map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map(h => <td key={h} className="max-w-[120px] truncate">{String(row[h] || '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.total > 5 && (
            <div className="px-5 py-2 text-[11px] text-muted border-t border-line">
              … y {preview.total - 5} filas más
            </div>
          )}
          <div className="px-5 py-4 border-t border-line">
            <button
              className="crm-btn-primary w-full justify-center"
              onClick={tipo === 'alumnos' ? procesarAlumnos : procesarHistorial}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                : <><Upload size={14} /> Importar {preview.total} registros</>}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border mt-4 animate-fadeUp
          ${resultado.ok ? 'bg-success/8 border-success/25' : 'bg-danger/8 border-danger/25'}`}>
          {resultado.ok
            ? <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />}
          <span className={`text-sm ${resultado.ok ? 'text-success' : 'text-danger'}`}>{resultado.msg}</span>
        </div>
      )}
    </div>
  )
}
