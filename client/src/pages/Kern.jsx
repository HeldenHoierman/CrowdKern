import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import opentype from 'opentype.js'
import { getNextPair, submitAdjustment, skipPair } from '../api.js'
import { useSession } from '../hooks/useSession.js'
import KernCanvas from '../components/KernCanvas.jsx'

const NUDGE = 5
const NUDGE_LARGE = 25

export default function Kern() {
  const { fontId } = useParams()
  const sessionId = useSession()
  const [font, setFont] = useState(null)
  const [pair, setPair] = useState(null)
  const [delta, setDelta] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadFont() {
      try {
        const res = await fetch(`/api/fonts/${fontId}/file`)
        const arrayBuffer = await res.arrayBuffer()
        setFont(opentype.parse(arrayBuffer))
      } catch {
        setError('Failed to load font file.')
      }
    }
    loadFont()
  }, [fontId])

  const loadNextPair = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDelta(0)
    try {
      setPair(await getNextPair(fontId))
    } catch (err) {
      setError(err.message)
      setPair(null)
    } finally {
      setLoading(false)
    }
  }, [fontId])

  useEffect(() => { loadNextPair() }, [loadNextPair])

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'BUTTON') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setDelta(d => d - (e.shiftKey ? NUDGE_LARGE : NUDGE))
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setDelta(d => d + (e.shiftKey ? NUDGE_LARGE : NUDGE))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleSubmit() {
    if (!pair || submitting) return
    setSubmitting(true)
    try {
      await submitAdjustment(pair.id, Math.round(pair.currentMedian + delta), sessionId)
      await loadNextPair()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    if (!pair || submitting) return
    setSubmitting(true)
    try {
      await skipPair(pair.id, sessionId)
      await loadNextPair()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!font || loading) return <p className="status">Loading...</p>

  if (error || !pair) return (
    <div className="page">
      <p className="error">{error ?? 'No pairs available.'}</p>
      <Link to="/">← Back to fonts</Link>
    </div>
  )

  const kernOffset = pair.currentMedian + delta

  return (
    <div className="kern-page">
      <div className="kern-header">
        <Link to="/" className="back-link">← Fonts</Link>
        <span className="kern-pair-label">{pair.leftGlyph} / {pair.rightGlyph}</span>
        <span className="kern-response-count">{pair.responseCount} response{pair.responseCount !== 1 ? 's' : ''}</span>
      </div>

      <KernCanvas
        font={font}
        leftGlyphName={pair.leftGlyph}
        rightGlyphName={pair.rightGlyph}
        kernOffset={kernOffset}
      />

      <div className="kern-controls">
        <div className="kern-value">
          <span className="kern-delta">{delta >= 0 ? `+${delta}` : delta}</span>
          <span className="kern-hint">← → nudge &nbsp;·&nbsp; Shift for ×5</span>
        </div>
        <div className="kern-buttons">
          <button className="button-secondary" onClick={handleSkip} disabled={submitting}>
            Skip
          </button>
          <button onClick={handleSubmit} disabled={submitting}>
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
