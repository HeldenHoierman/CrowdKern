import { useState } from 'react'

const SESSION_KEY = 'crowdkern_session'

function getOrCreateSession() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function useSession() {
  const [sessionId] = useState(getOrCreateSession)
  return sessionId
}
