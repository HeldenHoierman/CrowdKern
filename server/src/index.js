import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fontRoutes } from './routes/fonts.js'
import { kerningRoutes } from './routes/kerning.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/fonts', fontRoutes)
app.use('/api/kerning', kerningRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status ?? 500
  const message = status < 500 ? err.message : 'Internal server error'
  res.status(status).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`CrowdKern server running on port ${PORT}`)
})
