export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { meeting_id } = req.body
  if (!meeting_id) return res.status(400).json({ error: 'Falta meeting_id' })

  const accountId    = process.env.VITE_ZOOM_ACCOUNT_ID
  const clientId     = process.env.VITE_ZOOM_CLIENT_ID
  const clientSecret = process.env.VITE_ZOOM_CLIENT_SECRET

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    const { access_token } = await tokenRes.json()

    await fetch(`https://zoom.us/v2/meetings/${meeting_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${access_token}` },
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
