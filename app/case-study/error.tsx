"use client";

import Link from "next/link";

export default function CaseStudyError({ reset }: { reset: () => void }) {
  return (
    <main className="editorial-error" role="alert">
      <p className="editorial-error__eyebrow">Project case study</p>
      <h1>This case study could not be opened.</h1>
      <p>Try the explanation again, or return to the collection.</p>
      <p className="editorial-error__actions">
        <button type="button" onClick={reset}>Try case study again</button>
        <Link href="/collection">View Collection 01</Link>
      </p>
    </main>
  );
}
