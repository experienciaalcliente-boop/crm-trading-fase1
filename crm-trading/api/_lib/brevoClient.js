// Cliente mínimo de la API de Brevo (v3) para el agente de Email Marketing.
// Usa BREVO_API_KEY (server-only, nunca expuesta al cliente). No usamos el
// SDK oficial de Brevo para no sumar una dependencia — son 4 endpoints.
const BASE = 'https://api.brevo.com/v3'

function requireApiKey() {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error('Falta configurar BREVO_API_KEY en las variables de entorno')
  return key
}

async function brevoFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'api-key': requireApiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Brevo ${options.method || 'GET'} ${path} → ${res.status}: ${body}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Busca una lista por nombre exacto (Brevo no tiene filtro por nombre en la
// API, así que se pagina sobre las listas existentes) o la crea si no existe.
export async function crearOEncontrarLista(nombre, folderId = 1) {
  let offset = 0
  const limit = 50
  while (true) {
    const pagina = await brevoFetch(`/contacts/lists?limit=${limit}&offset=${offset}`)
    const encontrada = (pagina.lists || []).find(l => l.name === nombre)
    if (encontrada) return encontrada.id
    if (!pagina.lists || pagina.lists.length < limit) break
    offset += limit
  }
  const creada = await brevoFetch('/contacts/lists', {
    method: 'POST',
    body: JSON.stringify({ name: nombre, folderId }),
  })
  return creada.id
}

// Upsert de contacto + asignación a la lista en una sola llamada (updateEnabled
// hace que si el contacto ya existe en Brevo, se actualice en vez de fallar).
export async function agregarContactoALista({ email, nombre, listId }) {
  return brevoFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      email,
      attributes: { NOMBRE: nombre },
      listIds: [listId],
      updateEnabled: true,
    }),
  })
}

export async function obtenerCampana(campaignId) {
  return brevoFetch(`/emailCampaigns/${campaignId}?statistics=globalStats`)
}

export async function crearCampana({ name, subject, previewText, sender, replyTo, htmlContent, listId, scheduledAtISO }) {
  return brevoFetch('/emailCampaigns', {
    method: 'POST',
    body: JSON.stringify({
      name, subject, previewText, sender, replyTo, htmlContent,
      recipients: { listIds: [listId] },
      scheduledAt: scheduledAtISO,
    }),
  })
}
