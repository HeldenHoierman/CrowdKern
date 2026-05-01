# Dev Notes

## Current blocker: A-Za-z kern pair extraction returning 0 for Inter

### What we know

- Inter uses GPOS-only kerning (no legacy kern table)
- GPOS has PairAdjustment lookups (type 2) with both Format 1 and Format 2 subtables
- `font.charToGlyph('A')` and `font.charToGlyph('V')` should return valid glyph objects with `.index`
- The extraction logic in `server/src/routes/fonts.js` probes all A-Za-z pairs by:
  1. Getting glyph indices via `font.charToGlyph(char)`
  2. For Format 1: checking coverage table + pairSets
  3. For Format 2: looking up class IDs via `getClassId(classDef, glyphIdx)` then reading `classRecords[c1][c2].value1.xAdvance`
- Despite this, upload reports 0 pairs — extraction is returning nothing

### What to do next

1. Run the debug script to find out exactly where it breaks:
   ```
   node server/debug-font.js "path/to/Inter_24pt-Regular.ttf"
   ```
   The script checks:
   - Whether `charToGlyph('A')` and `charToGlyph('V')` return valid glyphs with correct `.index`
   - What class IDs A and V get assigned in classDef1 and classDef2
   - What kern value comes back from `classRecords[c1][c2].value1.xAdvance` for A/V

2. Based on debug output, likely issues to investigate:
   - `glyph.index` might be undefined or wrong — opentype.js might use a different property name
   - `classDef.ranges` might be null/undefined for Inter (different classDef format)
   - `classRecords` indexing might be off (0-based vs 1-based)
   - Inter might store kern in `value2` instead of `value1`

3. Once extraction works, run the alphabet filter in psql to trim to letter pairs only:
   ```sql
   DELETE FROM "GlyphPair"
   WHERE "leftGlyph" !~ '^[A-Za-z]$'
      OR "rightGlyph" !~ '^[A-Za-z]$';
   ```

### Files to look at
- `server/src/routes/fonts.js` — `extractKernPairs()` and helpers
- `server/debug-font.js` — debug script (delete after done, don't commit)
