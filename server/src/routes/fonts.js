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

// Returns the class ID for a glyph in a GPOS ClassDef range table.
// Glyphs not listed in any range belong to class 0 (the default class).
function getClassId(classDef, glyphIdx) {
  for (const range of (classDef?.ranges ?? [])) {
    if (glyphIdx >= range.start && glyphIdx <= range.end) return range.classId
  }
  return 0
}

// Coverage tables come in two formats: flat glyph list or ranges.
function expandCoverage(coverage) {
  if (coverage?.glyphs) return [...coverage.glyphs]
  const glyphs = []
  for (const range of (coverage?.ranges ?? [])) {
    for (let g = range.start; g <= range.end; g++) glyphs.push(g)
  }
  return glyphs
}

// Probes all A-Za-z combinations directly against the GPOS kern tables.
// This is reliable for Latin fonts regardless of how kern classes are structured.
function extractKernPairs(font) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const pairs = []
  const seen = new Set()
  const lookups = font.tables.gpos?.lookups ?? []

  // Also check legacy kern table
  const legacyPairs = {}
  if (font.tables.kern?.subtables) {
    for (const subtable of font.tables.kern.subtables) {
      for (const [key, value] of Object.entries(subtable.kerningPairs ?? {})) {
        legacyPairs[key] = value
      }
    }
  }

  for (const left of chars) {
    const leftGlyph = font.charToGlyph(left)
    if (!leftGlyph) continue

    for (const right of chars) {
      const key = `${left}/${right}`
      if (seen.has(key)) continue

      const rightGlyph = font.charToGlyph(right)
      if (!rightGlyph) continue

      // Check legacy kern table first
      const legacyKey = `${leftGlyph.index}/${rightGlyph.index}`
      if (legacyPairs[legacyKey]) {
        pairs.push({ leftGlyph: left, rightGlyph: right, baselineKern: legacyPairs[legacyKey] })
        seen.add(key)
        continue
      }

      // Check GPOS lookups
      for (const lookup of lookups) {
        if (lookup.lookupType !== 2) continue

        for (const subtable of lookup.subtables) {
          let kern = 0

          if (subtable.posFormat === 1) {
            const covered = expandCoverage(subtable.coverage)
            const idx = covered.indexOf(leftGlyph.index)
            if (idx !== -1) {
              const record = (subtable.pairSets?.[idx] ?? []).find(r => r.secondGlyph === rightGlyph.index)
              kern = record?.value1?.xAdvance ?? 0
            }
          } else if (subtable.posFormat === 2) {
            const c1 = getClassId(subtable.classDef1, leftGlyph.index)
            const c2 = getClassId(subtable.classDef2, rightGlyph.index)
            kern = subtable.classRecords?.[c1]?.[c2]?.value1?.xAdvance ?? 0
          }

          if (kern !== 0) {
            pairs.push({ leftGlyph: left, rightGlyph: right, baselineKern: kern })
            seen.add(key)
            break
          }
        }
        if (seen.has(key)) break
      }
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

router.get('/:id/file', async (req, res, next) => {
  try {
    const font = await db.fontProject.findUniqueOrThrow({ where: { id: req.params.id } })
    const ext = font.fileName.split('.').pop().toLowerCase()
    res.setHeader('Content-Type', ext === 'ttf' ? 'font/ttf' : 'font/otf')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(font.fontData)
  } catch (err) {
    next(err)
  }
})

router.post('/upload', upload.single('font'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Only .ttf and .otf files are accepted' })

    const buffer = req.file.buffer
    // opentype.js requires an ArrayBuffer, not a Node Buffer
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    let font
    try {
      font = opentype.parse(arrayBuffer)
    } catch {
      return res.status(400).json({ error: 'Could not parse font file. Make sure it is a valid TTF or OTF.' })
    }

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
