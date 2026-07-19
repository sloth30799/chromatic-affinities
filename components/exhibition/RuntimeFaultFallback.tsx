"use client";

import type { RuntimeFault } from "@/lib/playback";

export function RuntimeFaultFallback({ fault }: { fault: RuntimeFault }) {
  return (
    <main className="exhibition-unavailable" role="alert">
      <p className="exhibition-unavailable__eyebrow">Chromatic Affinities</p>
      <h1>The exhibition has paused safely.</h1>
      <p>We could not continue this viewing session. Reloading starts again at the first pairing.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Reload exhibition
      </button>
      <span className="sr-only">Runtime fault: {fault.source}.</span>
    </main>
  );
}
