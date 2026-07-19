"use client";

export default function ExhibitionError() {
  return (
    <main className="route-error" role="alert">
      <p className="route-error__eyebrow">Chromatic Affinities</p>
      <h1>This page could not be opened.</h1>
      <p>Reload the page to return to a fresh starting state.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Reload page
      </button>
    </main>
  );
}
