import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Upload from './pages/Upload.jsx'
import Kern from './pages/Kern.jsx'

export default function App() {
  return (
    <div className="app">
      <header>
        <Link to="/" className="logo">CrowdKern</Link>
        <nav>
          <Link to="/upload">Upload Font</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/kern/:fontId" element={<Kern />} />
        </Routes>
      </main>
    </div>
  )
}
