import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import opentype from 'opentype.js'
import { getNextPair, submitAdjustment, skipPair } from '../api.js'
import { useSession } from '../hooks/useSession.js'
import KernCanvas from '../components/KernCanvas.jsx'

const NUDGE = 5
const NUDGE_LARGE = 25
const RESULT_DISPLAY_MS = 1800

export default function Kern() {
  const { fontId } = useParams()
  const sessionId = useSession()
  const [font, setFont] = useState(null)
  const [pair, setPair] = useState(null)
  const [delta, setDelta] = useState(0)
  const [phase, setPhase] = useState('loading') // 'loading' | 'kerning' | 'result'
  const [resultMedian, setResultMedian] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const advanceTimer = useRef(null)

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
    setPhase('loading')
    setError(null)
    setDelta(0)
    setResultMedian(null)
    try {
      setPair(await getNextPair(fontId))
      setPhase('kerning')
    } catch (err) {
      setError(err.message)
      setPair(null)
    }
  }, [fontId])

  useEffect(() => { loadNextPair() }, [loadNextPair])

  // Clean up auto-advance timer on unmount
  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  useEffect(() => {
    function onKey(e) {
      if (phase !== 'kerning') return
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
  }, [phase])

  async function handleSubmit() {
    if (!pair || submitting || phase !== 'kerning') return
    setSubmitting(true)
    try {
      const { median } = await submitAdjustment(
        pair.id,
        Math.round(pair.currentMedian + delta),
        sessionId
      )
      setResultMedian(median)
      setPhase('result')
      advanceTimer.current = setTimeout(async () => {
        setSubmitting(false)
        await loadNextPair()
      }, RESULT_DISPLAY_MS)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    if (!pair || submitting || phase !== 'kerning') return
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

  if (!font || phase === 'loading') return <p className="status">Loading...</p>

  if (error || !pair) return (
    <div className="page">
      <p className="error">{error ?? 'No pairs available.'}</p>
      <Link to="/">← Back to fonts</Link>
    </div>
  )

  const isResult = phase === 'result'
  const kernOffset = isResult ? resultMedian : pair.currentMedian + delta
  const medianDelta = pair.currentMedian - pair.baselineKern

  return (
    <div className="kern-page">
      <div className="kern-header">
        <Link to="/" className="back-link">← Fonts</Link>
        <span className="kern-pair-label">{pair.leftGlyph} / {pair.rightGlyph}</span>
        <span className="kern-response-count">{pair.responseCount} response{pair.responseCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="kern-canvas-wrap">
        <KernCanvas
          font={font}
          leftGlyphName={pair.leftGlyph}
          rightGlyphName={pair.rightGlyph}
          kernOffset={kernOffset}
        />
        {isResult && (
          <div className="result-overlay">
            <span className="result-label">New median</span>
            <span className="result-value">{Math.round(resultMedian)}</span>
          </div>
        )}
      </div>

      <div className="kern-stats">
        <div className="stat">
          <span className="stat-label">Baseline</span>
          <span className="stat-value">{pair.baselineKern}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Median</span>
          <span className="stat-value">
            {Math.round(isResult ? resultMedian : pair.currentMedian)}
            {medianDelta !== 0 && (
              <span className="stat-delta">{medianDelta > 0 ? `+${medianDelta}` : medianDelta}</span>
            )}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Responses</span>
          <span className="stat-value">{pair.responseCount}</span>
        </div>
      </div>

      {!isResult && (
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
      )}
    </div>
  )
}
