const BASE = '/api'

export async function getFonts() {
  const res = await fetch(`${BASE}/fonts`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadFont(name, file) {
  const form = new FormData()
  form.append('name', name)
  form.append('font', file)
  const res = await fetch(`${BASE}/fonts/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getNextPair(fontId) {
  const res = await fetch(`${BASE}/kerning/${fontId}/next`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function submitAdjustment(pairId, value, sessionId) {
  const res = await fetch(`${BASE}/kerning/${pairId}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value, sessionId })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function skipPair(pairId, sessionId) {
  const res = await fetch(`${BASE}/kerning/${pairId}/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
