import { useParams } from 'react-router-dom'

export default function Kern() {
  const { fontId } = useParams()

  return (
    <div className="page">
      <h1>Kerning Interface</h1>
      <p className="status">Coming in Milestone 1 — font ID: {fontId}</p>
    </div>
  )
}
