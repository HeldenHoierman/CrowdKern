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

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`CrowdKern server running on port ${PORT}`)
})
