import { obtenerAccessTokenDocs } from './googleAuth.js'

// Inserta texto SIEMPRE al final del documento (endOfSegmentLocation) —
// a propósito, para no tener que calcular índices de caracteres sobre un
// documento que un humano también edita. Insertar al final nunca puede
// pisar ni corromper contenido existente, a diferencia de insertar en un
// índice calculado a mano.
export async function agregarAlFinalDelDocumento(documentId, texto) {
  const accessToken = await obtenerAccessTokenDocs()
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        { insertText: { text: `\n\n${texto}\n`, endOfSegmentLocation: {} } },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Google Docs batchUpdate → ${res.status}: ${await res.text()}`)
  return res.json()
}
