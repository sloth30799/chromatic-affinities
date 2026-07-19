"use client";

import Link from "next/link";

export default function CollectionError({ reset }: { reset: () => void }) {
  return (
    <main className="editorial-error" role="alert">
      <p className="editorial-error__eyebrow">Collection 01</p>
      <h1>This sample drawer could not be opened.</h1>
      <p>Try the collection again, or return to the exhibition.</p>
      <p className="editorial-error__actions">
        <button type="button" onClick={reset}>Try collection again</button>
        <Link href="/">Return to exhibition</Link>
      </p>
    </main>
  );
}
