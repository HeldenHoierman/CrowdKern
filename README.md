# CrowdKern

A crowdsourcing platform for font kerning, targeting open source font projects.

## Concept

Font kerning is labor-intensive and often neglected in open source projects. CrowdKern distributes the work across many users making small visual judgments, aggregating them into high-quality kern data that gets contributed back to font projects.

### Core mechanic

Users are presented with a glyph pair rendered in the target font. They use arrow key nudges to adjust spacing relative to the neighbors. Each submission is recorded and a **live median** is calculated per pair — meaning every user sees and reacts to the collective best-known kerning at that moment. This creates a self-regulating loop: well-kerned pairs get skipped, poorly-kerned pairs attract adjustments.

**Key design decisions:**
- **Aggregation: median, not mean.** Robust to outliers and bad-faith adjustments.
- **Live updates.** Users always work from the current median, not a baseline.
- **Starting baseline.** Fonts ingested with their existing kern data, not from zero.
- **Skip as signal.** High skip rates indicate the pair is well-kerned.
- **Arrow key nudges.** Matches the interaction model of professional font editors (Glyphs, FontLab).

---

## Current stage: Stage 0 — Prototype

Before building a server, database, or font ingestion pipeline, the goal is to **prove the kerning interaction feels right**. Stage 0 is a self-contained browser tool: load a local font file, work through a set of common problem pairs, see your adjustments.

No backend. No accounts. No data leaves your machine.

### Running it

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`, load any `.ttf` or `.otf` file, and start kerning.

### How it works

- Load a font file locally via the file picker
- Cycles through 23 common problem pairs (AV, AT, To, Wo, LV, etc.)
- Arrow keys nudge kern offset in 5-unit steps (Shift for 25)
- Submit records your delta, Skip moves on
- Results summary shown at the end

### What Stage 0 is testing

- Does the arrow-key nudge feel precise and responsive?
- Is the canvas rendering at 200px useful for judging spacing?
- Is the submit/skip flow comfortable to repeat 20+ times?
- What information is actually useful on screen while kerning?

---

## Roadmap

### Stage 0 — Local prototype ← *current*
Prove the kerning interaction. No backend, hardcoded pairs, local font loading.

### Stage 1 — Font ingestion
Load a font and extract real kern pairs from it (GPOS/kern table). Present actual pairs from the font with their baseline values rather than hardcoded ones.

### Stage 2 — Persistence
Save sessions and adjustments locally (IndexedDB or file export). Prove that working through a full font's pairs is manageable and useful.

### Stage 3 — Server + aggregation
Introduce the server, database, and live median. Multiple users working the same font converge on a shared result.

### Stage 4 — GitHub integration
Font projects submitted via GitHub URL. When pairs reach confidence, open a PR against the repo with updated kern data. Contributors credited via git co-author trailers.

---

## Stack (target)

- **Frontend:** React + Vite, opentype.js
- **Backend (Stage 3+):** Node.js + Express, PostgreSQL + Prisma
