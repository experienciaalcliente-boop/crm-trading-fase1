// Vercel Serverless Function — Intermediario con Zoom API
// Esta función corre en el servidor, evitando el bloqueo CORS del navegador

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // CORS — permitir llamadas desde cualquier origen (nuestra app)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { titulo, fecha, hora, alumno, duracion = 45 } = req.body

  if (!titulo || !fecha || !hora || !alumno) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  // Credenciales desde variables de entorno del servidor
  const accountId    = process.env.VITE_ZOOM_ACCOUNT_ID
  const clientId     = process.env.VITE_ZOOM_CLIENT_ID
  const clientSecret = process.env.VITE_ZOOM_CLIENT_SECRET
  const zoomUser     = 'experienciaalcliente@bursadvisory.com'

  if (!accountId || !clientId || !clientSecret) {
    return res.status(500).json({ error: 'Credenciales de Zoom no configuradas en el servidor' })
  }

  try {
    // 1. Obtener token de Zoom
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      return res.status(401).json({ error: 'Error al autenticar con Zoom: ' + (err.message || tokenRes.status) })
    }

    const { access_token } = await tokenRes.json()

    // 2. Crear reunión en Zoom bajo el usuario específico
    const startTime = `${fecha}T${hora}:00`
    const meetingRes = await fetch(
      `https://zoom.us/v2/users/${zoomUser}/meetings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic:      `Orientación Técnica - ${alumno}`,
          type:       2,
          start_time: startTime,
          duration:   duracion,
          timezone:   'America/Lima',
          agenda:     titulo,
          settings: {
            host_video:        true,
            participant_video:  true,
            join_before_host:  true,
            waiting_room:      false,
            auto_recording:    'none',
          },
        }),
      }
    )

    if (!meetingRes.ok) {
      const err = await meetingRes.json()
      return res.status(meetingRes.status).json({
        error: 'Error al crear reunión: ' + (err.message || JSON.stringify(err))
      })
    }

    const meeting = await meetingRes.json()

    return res.status(200).json({
      meeting_id: String(meeting.id),
      join_url:   meeting.join_url,
      start_url:  meeting.start_url,
    })

  } catch (err) {
    console.error('Error en zoom-meeting:', err)
    return res.status(500).json({ error: err.message || 'Error interno del servidor' })
  }
}
