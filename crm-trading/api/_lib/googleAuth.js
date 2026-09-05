// Autenticación de cuenta de servicio de Google (JWT Bearer, RFC 7523) sin
// el SDK oficial `googleapis` — evita sumar una dependencia pesada al
// bundle solo para firmar un JWT y pedir un access token. Usa el módulo
// `crypto` nativo de Node (disponible en el runtime de Vercel).
import { createSign } from 'crypto'

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function obtenerAccessToken(scope) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !privateKey) throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: email, scope, aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  // Vercel guarda saltos de línea reales si se pegó el PEM completo; si en
  // cambio quedó como "\n" literal (común al pegar en un campo de una sola
  // línea), se normaliza acá.
  const pem = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey
  const signature = base64url(signer.sign(pem))
  const jwt = `${unsigned}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!res.ok) throw new Error(`Google OAuth token → ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

export async function obtenerAccessTokenDocs() {
  return obtenerAccessToken('https://www.googleapis.com/auth/documents')
}
