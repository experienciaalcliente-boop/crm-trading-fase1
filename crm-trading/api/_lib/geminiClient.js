// Cliente mínimo de la API de Gemini (nivel gratuito) para la capa de
// redacción del agente Organizador. Los números SIEMPRE se calculan en
// nuestro código y se pasan ya resueltos al prompt — Gemini solo los
// redacta en prosa, nunca los recalcula ni los "recuerda".
const MODEL = 'gemini-3.6-flash'

export async function generarResumen(prompt) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Falta configurar GEMINI_API_KEY en las variables de entorno')

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini → ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const texto = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!texto.trim()) throw new Error('Gemini devolvió una respuesta vacía')
  return texto.trim()
}
