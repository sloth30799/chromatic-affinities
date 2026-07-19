import Link from "next/link";
import { campaign, chapters, type Chapter } from "@/data/exhibition";
import { RouteEntryFocus } from "./RouteEntryFocus";
import { StudyFigure } from "./StudyFigure";

const motionBeats = [
  ["0.00–0.72s", "Establish", "Both territories arrive as an equal split."],
  ["0.72–3.24s", "Build", "Surface behavior separates each pair."],
  ["3.24–6.60s", "Seam attack", "Matter tests the central seam."],
  ["6.60–8.40s", "Fusion", "One shared material image holds."],
  ["8.40–10.08s", "Recoil", "The pair separates without settling."],
  ["10.08–12.00s", "Handoff", "The next study becomes perceptible before the cut."],
] as const;

const studyStillSpecimens = chapters.map((chapter) => chapter.specimens.find((specimen) => specimen.sceneRole === "hero") ?? chapter.specimens[0]);

function StudySystemRow({ chapter }: { chapter: Chapter }) {
  return (
    <li className="case-system__row">
      <span className="case-system__number">{chapter.number}</span>
      <span className="case-system__colors"><i style={{ backgroundColor: chapter.from.hex }} />{chapter.from.name}<b aria-hidden="true">↔</b><i style={{ backgroundColor: chapter.to.hex }} />{chapter.to.name}</span>
      <span className="case-system__title">{chapter.studyTitle}</span>
      <span className="case-system__seam">{chapter.transformation}</span>
    </li>
  );
}

export function CaseStudyUnavailable() {
  return (
    <main className="case-study-page case-study-unavailable" role="status">
      <p className="case-study-kicker">Project case study</p>
      <h1>This local project explanation is temporarily unavailable.</h1>
      <p>The material system cannot be verified right now.</p>
      <Link href="/collection">View Collection 01</Link>
    </main>
  );
}

export function CaseStudy() {
  return (
    <main className="case-study-page" data-editorial-route="case-study">
      <RouteEntryFocus targetId="case-study-title" />
      <a className="editorial-skip-link" href="#challenge">Skip to the project explanation</a>

      <header className="case-study-masthead">
        <p className="case-study-kicker">Project case study</p>
        <h1 id="case-study-title" tabIndex={-1}>Chromatic Affinities</h1>
        <p className="case-study-subtitle">A material-direction concept translated into an interactive split-screen exhibition.</p>
        <p className="case-study-disclosure">{campaign.disclosure}</p>
        <p className="case-study-context">Atelier Chromatique is fictional. This is a self-initiated, local concept and implementation, presented outside the fictional studio shell.</p>
        <nav className="case-study-utility" aria-label="Project navigation">
          <Link href="/">Exhibition</Link>
          <Link href="/collection">Collection 01</Link>
          <a href="#availability">Working with Han</a>
        </nav>
      </header>

      <div className="case-study-content">
        <section id="challenge" className="case-section case-section--lead" aria-labelledby="challenge-title">
          <p className="case-section__index">01 / Challenge</p>
          <div><h2 id="challenge-title">How can a materials studio make color, finish, and texture feel tangible through a screen?</h2><p>A screen cannot offer weight, gloss, tooth, or translucency directly. The project therefore treats each color pair as a small physical law: one surface behavior per side, with a seam that turns their contact into evidence rather than decoration.</p></div>
        </section>

        <section className="case-section" aria-labelledby="response-title">
          <p className="case-section__index">02 / Response</p>
          <div><h2 id="response-title">A fixed diptych with an active third character.</h2><p>Four twelve-second studies hold two color territories in view at once. The center seam acts as aperture, vein, prism, or fold, making finish legible through exchange, reflection, fracture, and pressure.</p></div>
        </section>

        <section className="case-section case-section--proof" aria-labelledby="system-title">
          <p className="case-section__index">03 / Four-study system</p>
          <div><h2 id="system-title">One seam law, four material encounters.</h2><figure className="case-system" aria-labelledby="system-caption"><ol>{chapters.map((chapter) => <StudySystemRow key={chapter.id} chapter={chapter} />)}</ol><figcaption id="system-caption">System diagram: an equal two-color field is retained while the seam changes its material behavior for each study.</figcaption></figure></div>
        </section>

        <section className="case-section case-section--proof" aria-labelledby="motion-title">
          <p className="case-section__index">04 / Motion system</p>
          <div><h2 id="motion-title">A labeled 12-second score keeps movement purposeful.</h2><figure className="motion-score" aria-labelledby="motion-caption"><ol>{motionBeats.map(([time, name, description]) => <li key={name}><span>{time}</span><strong>{name}</strong><p>{description}</p></li>)}</ol><figcaption id="motion-caption">Every chapter uses the same six beat boundaries; the surface behavior and seam law change by study.</figcaption></figure></div>
        </section>

        <section className="case-section case-section--proof" aria-labelledby="translation-title">
          <p className="case-section__index">05 / Material translation</p>
          <div><h2 id="translation-title">Code-native stills make the material vocabulary inspectable.</h2><p>These four labeled stills reuse the same frozen specimens that appear in the exhibition and collection register. They are drawn as local SVG and CSS geometry, not image substitutes.</p><div className="material-stills">{chapters.map((chapter, index) => <StudyFigure key={chapter.id} specimen={studyStillSpecimens[index]!} caption={<span className="material-still__caption">Study {chapter.number} / {chapter.studyTitle}</span>} />)}</div></div>
        </section>

        <section className="case-section case-section--proof" aria-labelledby="accessibility-title">
          <p className="case-section__index">06 / Accessibility and responsive behavior</p>
          <div><h2 id="accessibility-title">The reading system remains complete when motion or space changes.</h2><div className="case-comparisons"><figure className="comparison-figure"><div className="motion-comparison"><div><strong>Standard motion</strong><span>Automatic twelve-second study with visible pause control.</span></div><div><strong>Reduced motion</strong><span>Immediate static composition, manual study selection, no ambient loop.</span></div></div><figcaption>Standard-versus-reduced-motion comparison.</figcaption></figure><figure className="comparison-figure"><div className="composition-comparison"><div className="composition-desktop"><span>Color territory</span><i>Seam</i><span>Color territory</span></div><div className="composition-mobile"><span>Territory</span><i>Seam</i><span>Territory</span></div></div><figcaption>Desktop-versus-mobile composition pair: both color territories remain present while utility text reflows.</figcaption></figure></div><p>Native document scrolling, visible keyboard focus, local links, semantic headings, and high-contrast editorial text remain available at narrow widths, short landscapes, and increased zoom.</p></div>
        </section>

        <section className="case-section" aria-labelledby="implementation-title">
          <p className="case-section__index">07 / Implementation</p>
          <div><h2 id="implementation-title">A local, typed campaign system keeps the exhibition and explanation aligned.</h2><p>One typed content source supplies the four studies, color values, specimens, finishes, and notes. Shared code-native figures give the live exhibition, collection drawer, and this explanation the same labeled material vocabulary without a remote asset request.</p></div>
        </section>

        <section className="case-section case-section--proof" aria-labelledby="constraints-title">
          <p className="case-section__index">08 / Authored constraints and tradeoffs</p>
          <div><h2 id="constraints-title">The constraints are part of the visual decision.</h2><dl className="tradeoff-register"><div><dt>Equal split</dt><dd>Both color worlds remain visible; the seam cannot become a full-screen wipe.</dd></div><div><dt>Material before effect</dt><dd>Every silhouette names a finish or process, so motion reinforces a surface property.</dd></div><div><dt>Local by design</dt><dd>Figures are code-native and local, keeping the concept inspectable without stock or remote imagery.</dd></div><div><dt>Motion has an alternate</dt><dd>Reduced motion preserves the study system in composed static frames rather than a lesser placeholder.</dd></div></dl></div>
        </section>

        <section className="case-section case-section--role" aria-labelledby="role-title">
          <p className="case-section__index">09 / Role and outcome</p>
          <div><h2 id="role-title">Concept, design, and development by Han.</h2><p>The outcome is a self-initiated local concept: an interactive material campaign and an accompanying explanation of its design decisions. It is not attributed to an outside partner, public release, or audience.</p></div>
        </section>
      </div>

      <footer id="availability" className="availability" aria-labelledby="availability-title">
        <p className="case-section__index">Availability</p>
        <h2 id="availability-title">Concept, design, and development by Han.</h2>
        <p>Available for art-directed interactive web experiences.</p>
        <nav aria-label="Case study footer navigation"><Link href="/">Return to exhibition</Link><Link href="/collection">View Collection 01</Link></nav>
      </footer>
    </main>
  );
}
