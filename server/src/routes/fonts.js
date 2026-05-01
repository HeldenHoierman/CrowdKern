import { Router } from 'express'
import multer from 'multer'
import opentype from 'opentype.js'
import db from '../db.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(ttf|otf)$/i)) {
      return cb(null, false)
    }
    cb(null, true)
  }
})

function extractKernPairs(font) {
  const pairs = []
  if (!font.tables.kern?.subtables) return pairs

  for (const subtable of font.tables.kern.subtables) {
    if (!subtable.kerningPairs) continue

    for (const [key, value] of Object.entries(subtable.kerningPairs)) {
      const [leftIdxStr, rightIdxStr] = key.split('/')
      const leftGlyph = font.glyphs.get(parseInt(leftIdxStr))
      const rightGlyph = font.glyphs.get(parseInt(rightIdxStr))

      if (!leftGlyph || !rightGlyph) continue

      pairs.push({
        leftGlyph: leftGlyph.name || leftIdxStr,
        rightGlyph: rightGlyph.name || rightIdxStr,
        baselineKern: value
      })
    }
  }

  return pairs
}

router.get('/', async (req, res, next) => {
  try {
    const fonts = await db.fontProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { glyphPairs: true } } }
    })
    res.json(fonts.map(f => ({
      id: f.id,
      name: f.name,
      fileName: f.fileName,
      createdAt: f.createdAt,
      glyphPairCount: f._count.glyphPairs
    })))
  } catch (err) {
    next(err)
  }
})

// Serves the raw font file for browser-side opentype.js rendering
router.get('/:id/file', async (req, res, next) => {
  try {
    const font = await db.fontProject.findUniqueOrThrow({ where: { id: req.params.id } })
    res.setHeader('Content-Type', 'font/otf')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(font.fontData)
  } catch (err) {
    next(err)
  }
})

router.post('/upload', upload.single('font'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No font file provided' })

    const buffer = req.file.buffer
    // opentype.js requires an ArrayBuffer, not a Node Buffer
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    const font = opentype.parse(arrayBuffer)

    const pairs = extractKernPairs(font)
    const name = req.body.name?.trim() || req.file.originalname.replace(/\.[^.]+$/, '')

    const project = await db.fontProject.create({
      data: {
        name,
        fileName: req.file.originalname,
        fontData: buffer,
        glyphPairs: { create: pairs }
      },
      include: { _count: { select: { glyphPairs: true } } }
    })

    res.status(201).json({
      id: project.id,
      name: project.name,
      fileName: project.fileName,
      glyphPairCount: project._count.glyphPairs
    })
  } catch (err) {
    next(err)
  }
})

export { router as fontRoutes }
