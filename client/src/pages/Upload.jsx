import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFont } from '../api.js'

export default function Upload() {
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await uploadFont(name || file.name.replace(/\.[^.]+$/, ''), file)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page">
      <h1>Upload Font</h1>
      <form onSubmit={handleSubmit} className="upload-form">
        <label>
          Project name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Inter, Roboto"
          />
        </label>
        <label>
          Font file (.ttf or .otf)
          <input
            type="file"
            accept=".ttf,.otf"
            onChange={e => setFile(e.target.files[0])}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
