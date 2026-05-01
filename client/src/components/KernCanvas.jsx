import { useEffect, useRef } from 'react'

function getGlyph(font, char) {
  const glyph = font.charToGlyph(char)
  return glyph && glyph.index !== 0 ? glyph : null
}

export default function KernCanvas({ font, leftGlyphName, rightGlyphName, kernOffset }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !font) return

    const dpr = window.devicePixelRatio || 1
    const W = 700
    const H = 320
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const leftGlyph = getGlyph(font, leftGlyphName)
    const rightGlyph = getGlyph(font, rightGlyphName)
    if (!leftGlyph || !rightGlyph) return

    const fontSize = 200
    const scale = fontSize / font.unitsPerEm
    const leftAdvance = (leftGlyph.advanceWidth ?? 0) * scale
    const rightAdvance = (rightGlyph.advanceWidth ?? 0) * scale
    const kern = kernOffset * scale
    const totalWidth = leftAdvance + kern + rightAdvance
    const x = (W - totalWidth) / 2
    const y = H * 0.75

    const leftPath = leftGlyph.getPath(x, y, fontSize)
    leftPath.fill = '#e8e8e8'
    leftPath.draw(ctx)

    const rightPath = rightGlyph.getPath(x + leftAdvance + kern, y, fontSize)
    rightPath.fill = '#e8e8e8'
    rightPath.draw(ctx)
  }, [font, leftGlyphName, rightGlyphName, kernOffset])

  return <canvas ref={canvasRef} className="kern-canvas" />
}
