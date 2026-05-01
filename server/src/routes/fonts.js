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

function extractLegacyKernPairs(font) {
  const pairs = []
  if (!font.tables.kern?.subtables) return pairs

  for (const subtable of font.tables.kern.subtables) {
    if (!subtable.kerningPairs) continue

    for (const [key, value] of Object.entries(subtable.kerningPairs)) {
      const [leftIdxStr, rightIdxStr] = key.split('/')
      const leftIdx = parseInt(leftIdxStr)
      const rightIdx = parseInt(rightIdxStr)
      if (isNaN(leftIdx) || isNaN(rightIdx)) continue

      const leftGlyph = font.glyphs.get(leftIdx)
      const rightGlyph = font.glyphs.get(rightIdx)
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

// Coverage tables come in two formats: flat glyph list or ranges.
function expandCoverage(coverage) {
  if (coverage?.glyphs) return [...coverage.glyphs]
  const glyphs = []
  for (const range of (coverage?.ranges ?? [])) {
    for (let g = range.start; g <= range.end; g++) glyphs.push(g)
  }
  return glyphs
}

// ClassDef tables use ranges. Returns Map<classId, representativeGlyphIdx>.
// Class 0 is the implicit catch-all and has no ranges, so it's omitted.
function buildClassRepresentatives(classDef) {
  const map = new Map()
  for (const range of (classDef?.ranges ?? [])) {
    if (!map.has(range.classId)) map.set(range.classId, range.start)
  }
  return map
}

// Extracts kern pairs from GPOS PairAdjustment lookups (type 2).
// Handles Format 1 (specific glyph pairs) and Format 2 (class pairs).
// Most modern fonts use GPOS rather than the legacy kern table.
function extractGPOSKernPairs(font) {
  const pairs = []
  const lookups = font.tables.gpos?.lookups ?? []

  for (const lookup of lookups) {
    if (lookup.lookupType !== 2) continue

    for (const subtable of lookup.subtables) {
      if (subtable.posFormat === 1) {
        const coveredGlyphs = expandCoverage(subtable.coverage)
        coveredGlyphs.forEach((firstGlyphIdx, i) => {
          const firstGlyph = font.glyphs.get(firstGlyphIdx)
          const pairSet = subtable.pairSets?.[i]
          if (!firstGlyph || !pairSet) return

          for (const record of pairSet) {
            const secondGlyph = font.glyphs.get(record.secondGlyph)
            if (!secondGlyph) continue
            const kernValue = record.value1?.xAdvance ?? 0
            if (kernValue === 0) continue
            pairs.push({
              leftGlyph: firstGlyph.name || String(firstGlyphIdx),
              rightGlyph: secondGlyph.name || String(record.secondGlyph),
              baselineKern: kernValue
            })
          }
        })
      } else if (subtable.posFormat === 2) {
        const class1Rep = buildClassRepresentatives(subtable.classDef1)
        const class2Rep = buildClassRepresentatives(subtable.classDef2)
        const { classRecords, class1Count, class2Count } = subtable
        if (!classRecords) continue

        for (let c1 = 0; c1 < class1Count; c1++) {
          const leftGlyphIdx = class1Rep.get(c1)
          if (leftGlyphIdx == null) continue
          const leftGlyph = font.glyphs.get(leftGlyphIdx)
          if (!leftGlyph) continue

          for (let c2 = 0; c2 < class2Count; c2++) {
            const kernValue = classRecords[c1]?.[c2]?.value1?.xAdvance ?? 0
            if (kernValue === 0) continue
            const rightGlyphIdx = class2Rep.get(c2)
            if (rightGlyphIdx == null) continue
            const rightGlyph = font.glyphs.get(rightGlyphIdx)
            if (!rightGlyph) continue
            pairs.push({
              leftGlyph: leftGlyph.name || String(leftGlyphIdx),
              rightGlyph: rightGlyph.name || String(rightGlyphIdx),
              baselineKern: kernValue
            })
          }
        }
      }
    }
  }

  return pairs
}

function extractKernPairs(font) {
  const legacy = extractLegacyKernPairs(font)
  if (legacy.length > 0) return legacy
  return extractGPOSKernPairs(font)
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
