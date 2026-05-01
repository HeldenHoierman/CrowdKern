import { useState, useEffect } from 'react'
import KernCanvas from '../components/KernCanvas.jsx'

const NUDGE = 5
const NUDGE_LARGE = 25

const PAIRS = [
  ['A', 'V'], ['A', 'W'], ['A', 'T'], ['A', 'Y'],
  ['V', 'A'], ['W', 'A'], ['T', 'A'], ['Y', 'A'],
  ['T', 'o'], ['T', 'e'], ['T', 'a'],
  ['W', 'o'], ['W', 'a'], ['W', 'e'],
  ['F', 'a'], ['F', 'o'],
  ['L', 'T'], ['L', 'V'], ['L', 'W'], ['L', 'Y'],
  ['P', 'A'], ['r', 'v'], ['r', 'f'],
]

export default function Kern({ font }) {
  const [index, setIndex] = useState(0)
  const [delta, setDelta] = useState(0)
  const [adjustments, setAdjustments] = useState([])

  const pair = PAIRS[index]
  const done = index >= PAIRS.length

  useEffect(() => {
    function onKey(e) {
      if (done) return
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
  }, [done])

  function handleSubmit() {
    setAdjustments(a => [...a, { pair, delta }])
    setDelta(0)
    setIndex(i => i + 1)
  }

  function handleSkip() {
    setDelta(0)
    setIndex(i => i + 1)
  }

  if (done) {
    return (
      <div className="kern-page">
        <h2 className="results-heading">Done — {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''}</h2>
        {adjustments.length === 0 ? (
          <p className="status">All pairs skipped.</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr><th>Pair</th><th>Delta</th></tr>
            </thead>
            <tbody>
              {adjustments.map(({ pair, delta }, i) => (
                <tr key={i}>
                  <td>{pair[0]}{pair[1]}</td>
                  <td className={delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : ''}>
                    {delta >= 0 ? `+${delta}` : delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  return (
    <div className="kern-page">
      <div className="kern-header">
        <span className="kern-pair-label">{pair[0]} / {pair[1]}</span>
        <span className="kern-response-count">{index + 1} / {PAIRS.length}</span>
      </div>

      <div className="kern-canvas-wrap">
        <KernCanvas
          font={font}
          leftGlyphName={pair[0]}
          rightGlyphName={pair[1]}
          kernOffset={delta}
        />
      </div>

      <div className="kern-controls">
        <div className="kern-value">
          <span className="kern-delta">{delta >= 0 ? `+${delta}` : delta}</span>
          <span className="kern-hint">← → nudge &nbsp;·&nbsp; Shift for ×5</span>
        </div>
        <div className="kern-buttons">
          <button className="button-secondary" onClick={handleSkip}>Skip</button>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  )
}
