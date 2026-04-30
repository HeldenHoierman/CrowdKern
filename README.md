# CrowdKern

A crowdsourcing platform for font kerning, targeting open source font projects.

## Concept

Font kerning is labor-intensive and often neglected in open source projects. CrowdKern distributes the work across many users making small visual judgments, aggregating them into high-quality kern data that gets contributed back to font projects.

## Core Mechanic

Users are presented with a random word or glyph set rendered in the target font. They select a glyph and use arrow key nudges to adjust its spacing relative to its neighbors. Each session ends when the user chooses to stop or runs out of their daily budget. If no adjustment is needed, they can skip to the next set.

Kern adjustments are recorded and a **live median** is calculated per glyph pair. The displayed font updates in real-time to reflect the current median — meaning every user sees and reacts to the collective best-known kerning at that moment. This creates a self-regulating loop: well-kerned pairs get skipped, poorly-kerned pairs attract adjustments.

### Key design decisions

- **Aggregation: median, not mean.** Robust to outliers and bad-faith adjustments.
- **Live updates.** Users always work from the current median, not a baseline. Self-regulation emerges naturally.
- **Starting baseline.** Fonts are ingested with their existing kern data, not from zero. Users improve on prior work.
- **Skip as signal.** Skipped pairs are recorded — high skip rates indicate the pair is well-kerned and contribute to confidence scoring.
- **Arrow key nudges.** Matches the interaction model of professional font editors (Glyphs, FontLab). Simple and precise.
- **Daily kern budget.** Limits sessions, creates habit formation, and makes each adjustment feel deliberate.

### Deferred decisions

- Confidence thresholds (how many responses before a pair is considered settled) — to be tuned empirically.
- Anchoring bias mitigation — median robustness may be sufficient; revisit with real data.

## Planned GitHub Integration (post-alpha)

- Font projects submitted via GitHub repo URL.
- CrowdKern parses the source font files and ingests glyph pairs.
- When pairs reach confidence, CrowdKern opens a PR against the repo with updated kern data.
- Contributors are credited via **git co-author trailers**, giving them visible contribution credit on the project's GitHub page.
- User authentication via GitHub OAuth, making attribution seamless.

## Alpha v1 Roadmap

The alpha goal is to validate the core kerning loop: does the interaction feel right, and does the live median produce sensible output with real users?

### Milestone 0 — Foundation
- Tech stack decisions
- Basic auth (or anonymous sessions to start)
- Database schema: users, font projects, glyph pairs, kern adjustments
- Font file upload (TTF/OTF directly — no GitHub integration yet)
- Browser-based font rendering

### Milestone 1 — Kerning Interface
- Display a glyph set from the uploaded font
- Click to select a glyph
- Arrow key nudges to adjust spacing
- Skip button
- Record each adjustment against the pair

### Milestone 2 — Live Median
- Calculate running median per glyph pair
- Re-render font live as median updates
- Response count per pair (groundwork for confidence scoring)

## Deferred to Post-Alpha

- GitHub integration and PR generation
- Daily kern budget and gamification
- Onboarding flow
- User profiles and contribution history
- Font format breadth (UFO, .glyphs, etc.)
- Maintainer rejection feedback loop
- Confidence thresholds
