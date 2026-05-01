import { Router } from 'express'
import { Prisma } from '@prisma/client'
import db from '../db.js'

const router = Router()

function calcMedian(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// Returns a random pair from the 10 least-kerned pairs to prioritize coverage
router.get('/:fontId/next', async (req, res, next) => {
  try {
    const pairs = await db.glyphPair.findMany({
      where: { fontProjectId: req.params.fontId },
      orderBy: { responseCount: 'asc' },
      take: 10
    })

    if (pairs.length === 0) return res.status(404).json({ error: 'No pairs found for this font' })

    const pair = pairs[Math.floor(Math.random() * pairs.length)]
    res.json(pair)
  } catch (err) {
    next(err)
  }
})

router.post('/:pairId/adjust', async (req, res, next) => {
  try {
    const { value, sessionId } = req.body
    if (typeof value !== 'number' || typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({ error: 'value (number) and sessionId (string) required' })
    }

    const pair = await db.glyphPair.findUnique({ where: { id: req.params.pairId } })
    if (!pair) return res.status(404).json({ error: 'Pair not found' })

    await db.kernAdjustment.create({
      data: { glyphPairId: req.params.pairId, sessionId: sessionId.trim(), value }
    })

    const adjustments = await db.kernAdjustment.findMany({
      where: { glyphPairId: req.params.pairId },
      select: { value: true }
    })

    const median = calcMedian(adjustments.map(a => a.value))

    const updated = await db.glyphPair.update({
      where: { id: req.params.pairId },
      data: { currentMedian: median, responseCount: { increment: 1 } }
    })

    res.json({ pair: updated, median })
  } catch (err) {
    next(err)
  }
})

router.post('/:pairId/skip', async (req, res, next) => {
  try {
    const { sessionId } = req.body
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({ error: 'sessionId (string) required' })
    }

    const pair = await db.glyphPair.findUnique({ where: { id: req.params.pairId } })
    if (!pair) return res.status(404).json({ error: 'Pair not found' })

    const updated = await db.glyphPair.update({
      where: { id: req.params.pairId },
      data: { skipCount: { increment: 1 } }
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export { router as kerningRoutes }
