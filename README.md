# Chromatic Affinities

An original fullscreen digital exhibition built with Next.js. Native scrolling moves through four paired-color chapters and eight connected visual worlds; every scene is composed from semantic HTML, inline SVG, and CSS rather than image assets or WebGL.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev       # local development server
npm run lint      # ESLint checks
npm run typecheck # TypeScript without emitting files
npm run build     # optimized production build
npm run start     # serve a production build
```

## Architecture

- `app/page.tsx` renders the exhibition; `app/globals.css` holds the visual system and chapter artwork.
- `data/exhibition.ts` is the single typed source for title copy, color metadata, transformation names, hotspot positions, poetic notes, and color facts.
- `components/exhibition/Chapter.tsx` owns each tall native-scroll track and its sticky fullscreen stage.
- `components/exhibition/scenes/` contains the four distinct scene structures. The CSS turns the Navy moon into a peach sun, the moss stone into an orchid, the ember into ice, and the cacao pod into porcelain.
- `hooks/useChapterMotion.ts` uses Motion scroll values, a responsive spring, and named derived phases for atmosphere, hero morph, particles, foreground, and editorial transitions. It writes those values directly to CSS variables without scroll-driven component re-renders.
- `hooks/usePointerDepth.ts` adds very restrained pointer depth only on fine hover pointers; it is skipped for touch and reduced-motion users.

## Interaction and accessibility

Each chapter includes three reachable field-note hotspots. They are semantic buttons with visible focus treatment and work with mouse, touch, and keyboard. A nearby annotation contains a poetic observation and a factual note; it can be closed with its control, click-away, or Escape.

Native document scrolling is never intercepted. Chapter navigation uses anchor links, so standard browser behavior remains intact. Ambient loops run only on the active chapter. `prefers-reduced-motion` fixes the worlds at a calm composed state and removes scrubbed motion, spring chasing, and ambient animation while preserving all copy, chapters, and controls.

## Customize the exhibition

Edit `data/exhibition.ts` to change:

- chapter titles, hexadecimal colors, atmospheres, and transformation labels;
- editorial chapter descriptions;
- hotspot names, notes, facts, and percentage positions.

For visual changes, use the matching scene component under `components/exhibition/scenes/` together with its named CSS section in `app/globals.css`. The scene DOM is deliberately asset-free, so new organic forms can be introduced without an image pipeline.

## Notes

The project uses Next.js App Router, TypeScript, Tailwind CSS v4 (for the base utility pipeline), and Motion for scroll choreography and annotation presence transitions. It has no remote font, image, API, backend, audio, or WebGL dependency.
# chromatic-affinities
