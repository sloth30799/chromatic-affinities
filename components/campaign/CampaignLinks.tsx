/** Local editorial destinations and the real-project credit stay distinct from the fictional campaign voice. */
export function CampaignLinks() {
  return (
    <div className="campaign-links">
      <nav aria-label="Campaign links">
        <a href="/collection">View the palette <span aria-hidden="true">↗</span></a>
        <a href="/case-study">Read the case study <span aria-hidden="true">↗</span></a>
      </nav>
      <footer className="campaign-credit">
        <p>Concept, design, and development by Han.</p>
        <p>Available for art-directed interactive web experiences.</p>
      </footer>
    </div>
  );
}
