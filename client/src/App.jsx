import { useState } from 'react'
import opentype from 'opentype.js'
import Kern from './pages/Kern.jsx'

export default function App() {
  const [font, setFont] = useState(null)
  const [fontName, setFontName] = useState('')

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    setFont(opentype.parse(buffer))
    setFontName(file.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <div className="app">
      <header>
        <span className="logo">CrowdKern</span>
        {fontName && <span className="font-name">{fontName}</span>}
        <label className="load-font-btn">
          {font ? 'Change font' : 'Load font file'}
          <input type="file" accept=".ttf,.otf" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      </header>
      <main>
        {font
          ? <Kern font={font} key={fontName} />
          : (
            <div className="splash">
              <h1>Load a font to start kerning</h1>
              <p>Use the button above to open a .ttf or .otf file.</p>
            </div>
          )
        }
      </main>
    </div>
  )
}
