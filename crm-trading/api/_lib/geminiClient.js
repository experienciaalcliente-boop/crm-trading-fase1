// Cliente mínimo de la API de Gemini (nivel gratuito) para la capa de
// redacción del agente Organizador. Los números SIEMPRE se calculan en
// nuestro código y se pasan ya resueltos al prompt — Gemini solo los
// redacta en prosa, nunca los recalcula ni los "recuerda".
const MODEL = 'gemini-3.6-flash'

// El informe mensual corre una sola vez al mes: si Gemini contesta 503 por
// saturación en ese único intento, el mes se pierde. Ya pasó el 2026-09-25.
// Los 503/429/500 son transitorios y se reintentan con espera creciente; un
// 4xx de credenciales o de prompt no se reintenta porque no va a cambiar.
const REINTENTOS = 3
const ESPERA_BASE_MS = 2000
const REINTENTABLES = new Set([429, 500, 502, 503, 504])

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export async function generarResumen(prompt) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Falta configurar GEMINI_API_KEY en las variables de entorno')

  let ultimoError
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const texto = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
      if (texto.trim()) return texto.trim()
      ultimoError = new Error('Gemini devolvió una respuesta vacía')
    } else {
      ultimoError = new Error(`Gemini → ${res.status}: ${await res.text()}`)
      if (!REINTENTABLES.has(res.status)) throw ultimoError
    }

    if (intento < REINTENTOS) {
      console.warn(`generarResumen: intento ${intento}/${REINTENTOS} falló (${ultimoError.message.slice(0, 120)}), reintentando…`)
      await dormir(ESPERA_BASE_MS * intento)
    }
  }
  throw ultimoError
}
