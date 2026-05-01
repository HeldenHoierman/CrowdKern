import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFonts } from '../api.js'

export default function Home() {
  const [fonts, setFonts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getFonts()
      .then(setFonts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="status">Loading...</p>
  if (error) return <p className="error">Error: {error}</p>

  return (
    <div className="page">
      <h1>Font Projects</h1>
      {fonts.length === 0 ? (
        <p className="empty">No fonts yet. <Link to="/upload">Upload one to get started.</Link></p>
      ) : (
        <ul className="font-list">
          {fonts.map(font => (
            <li key={font.id} className="font-card">
              <div>
                <strong>{font.name}</strong>
                <span className="meta">{font.glyphPairCount} kern pairs</span>
              </div>
              <Link to={`/kern/${font.id}`} className="button">Kern</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
