# Chromatic Affinities

Chromatic Affinities is a self-initiated concept campaign for the fictional materials studio Atelier Chromatique. *Material Studies No. 01* asks how color, finish, and texture can feel tangible through a screen: four opposing color worlds meet in a living split-screen exhibition.

The work is fictional and self-initiated. It is a local concept and implementation, not a client launch or a commercial storefront.

## The studies

- Tidal Aperture — Midnight Navy / Solar Apricot
- Botanical Fluorescence — Moss Verdant / Electric Orchid
- Thermal Fracture — Vermilion Ember / Glacier Cyan
- Material Fold — Cacao Earth / Porcelain Ivory

Each study runs on the same twelve-second, six-beat motion score: establish, build, seam attack, fusion, restore, and handoff. The materials are code-native CSS and SVG forms—glaze, textile, lacquer, resin, pigment, clay, and porcelain—rather than downloaded images or video.

`/` is the moving exhibition. `/collection` is Collection 01’s restrained material register. `/case-study` is the public project explanation, including the motion, material, responsive, and accessibility decisions.

## Accessibility and responsive behavior

The exhibition has keyboard-accessible playback, chapter navigation, and Material notes. Reduced motion presents an immediate composed state with manual navigation and no automatic progression. Both editorial routes use normal document scrolling, retain visible focus, and are designed for desktop, tablet, mobile, short-height, and zoomed reading.

## Stack

Next.js App Router, React, TypeScript, Motion, CSS, inline SVG, Playwright, Vitest, and Sharp.

## Run locally

Use npm and the committed lockfile:

```bash
npm ci
npm run dev
```

Then open `http://127.0.0.1:3000`.

```bash
npm test
npm run lint
npm run typecheck
env -u NEXT_PUBLIC_CA_TEST_MODE npm run build
```

Browser output should be directed to a private directory outside this checkout:

```bash
npm run e2e -- --reporter=line --output='/absolute/private/playwright-output'
```

Evidence capture is local-only and opt-in. It creates a test-only local production server on an isolated loopback port, writes only to the supplied external directory, and records its source binding in the evidence manifest:

```bash
CA_EVIDENCE_DIR='/absolute/private/evidence' npm run evidence:capture
CA_EVIDENCE_DIR='/absolute/private/evidence' npm run evidence:analyze
```

No deployment, hosted service, remote asset pipeline, contact destination, or publication workflow is included here.

## Role and availability

Concept, design, and development by Han. Available for art-directed interactive web experiences.
