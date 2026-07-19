import Link from "next/link";
import { campaign, chapters } from "@/data/exhibition";
import { RouteEntryFocus } from "./RouteEntryFocus";
import { StudyFigure } from "./StudyFigure";

export function CollectionUnavailable() {
  return (
    <main className="collection-page collection-unavailable" role="status">
      <p className="collection-kicker">Atelier Chromatique</p>
      <h1>Collection 01 is temporarily unavailable.</h1>
      <p>The local sample drawer cannot verify its material register right now.</p>
      <Link href="/">Return to the exhibition</Link>
    </main>
  );
}

export function CollectionRegister() {
  return (
    <main className="collection-page" data-editorial-route="collection">
      <RouteEntryFocus targetId="collection-title" />
      <a className="editorial-skip-link" href="#study-01">Skip to study register</a>

      <header className="collection-masthead">
        <p className="collection-kicker">{campaign.studio} presents</p>
        <p className="collection-edition">{campaign.collectionName}</p>
        <h1 id="collection-title" tabIndex={-1}>{campaign.collectionCode}</h1>
        <p className="collection-proposition">A digital sample drawer for four color studies and their material worlds.</p>
        <p className="collection-disclosure">{campaign.disclosure}</p>
        <nav className="collection-utility" aria-label="Collection navigation">
          <Link href="/">Exhibition</Link>
          <Link href="/case-study">Project case study</Link>
          <a href="#study-01">01</a>
          <a href="#study-02">02</a>
          <a href="#study-03">03</a>
          <a href="#study-04">04</a>
        </nav>
      </header>

      <p className="collection-introduction">Each ruled row holds one encounter: a pair of colors, a feeling, and three code-native material samples.</p>

      <div className="collection-register" aria-label="Collection 01 study register">
        {chapters.map((chapter) => (
          <section id={`study-${chapter.number}`} className="collection-study" key={chapter.id} aria-labelledby={`${chapter.id}-register-title`}>
            <header className="collection-study__header">
              <p className="collection-study__number">Study {chapter.number}</p>
              <div>
                <p className="collection-study__pair">{chapter.from.name} <span aria-hidden="true">/</span> {chapter.to.name}</p>
                <h2 id={`${chapter.id}-register-title`}>{chapter.studyTitle}</h2>
                <p className="collection-study__feeling">{chapter.feeling}</p>
              </div>
              <dl className="collection-study__colors">
                <div><dt><span className="collection-swatch" style={{ backgroundColor: chapter.from.hex }} />{chapter.from.name}</dt><dd>{chapter.from.hex}</dd></div>
                <div><dt><span className="collection-swatch" style={{ backgroundColor: chapter.to.hex }} />{chapter.to.name}</dt><dd>{chapter.to.hex}</dd></div>
              </dl>
            </header>

            <div className="collection-specimens">
              {chapter.specimens.map((specimen) => (
                <StudyFigure
                  key={specimen.id}
                  specimen={specimen}
                  showMetadata={false}
                  caption={(
                    <span className="collection-specimen__caption" data-specimen-register={specimen.id}>
                      <span className="collection-specimen__id">{specimen.id}</span>
                      <span className="collection-specimen__name">{specimen.name}</span>
                      <span><b>Material</b>{specimen.material}</span>
                      <span><b>Process</b>{specimen.process}</span>
                      <span><b>Finish</b>{specimen.finish}</span>
                      <span><b>Note</b>{specimen.note}</span>
                    </span>
                  )}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="collection-footer">
        <p>{campaign.disclosure} for a fictional materials studio.</p>
        <p>Concept, design, and development by Han.</p>
        <nav aria-label="Collection footer navigation"><Link href="/">Return to exhibition</Link><Link href="/case-study">Read the case study</Link></nav>
      </footer>
    </main>
  );
}
