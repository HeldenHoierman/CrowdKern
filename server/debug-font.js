import opentype from 'opentype.js'
import { readFileSync } from 'fs'

const path = process.argv[2]
const buffer = readFileSync(path)
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
const font = opentype.parse(arrayBuffer)

// Test charToGlyph
const A = font.charToGlyph('A')
const V = font.charToGlyph('V')
console.log('A glyph:', A?.index, A?.name)
console.log('V glyph:', V?.index, V?.name)

// Check GPOS structure
const lookups = font.tables.gpos?.lookups ?? []
console.log('\nGPOS lookups:', lookups.length)

for (const [i, lookup] of lookups.entries()) {
  if (lookup.lookupType !== 2) continue
  console.log(`\nLookup ${i} (PairAdjustment):`)
  for (const [j, sub] of lookup.subtables.entries()) {
    console.log(`  Subtable ${j}: posFormat=${sub.posFormat}`)
    if (sub.posFormat === 2) {
      // Find what class A and V belong to
      function getClassId(classDef, glyphIdx) {
        for (const range of (classDef?.ranges ?? [])) {
          if (glyphIdx >= range.start && glyphIdx <= range.end) return range.classId
        }
        return 0
      }
      const c1A = getClassId(sub.classDef1, A.index)
      const c2V = getClassId(sub.classDef2, V.index)
      console.log(`  A classId in classDef1: ${c1A}`)
      console.log(`  V classId in classDef2: ${c2V}`)
      const kern = sub.classRecords?.[c1A]?.[c2V]?.value1?.xAdvance
      console.log(`  A/V kern value: ${kern}`)
    }
  }
}
