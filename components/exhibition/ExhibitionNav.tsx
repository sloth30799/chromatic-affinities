"use client";

import type { Chapter } from "@/data/exhibition";

export function ExhibitionNav({ chapters, activeIndex }: { chapters: Chapter[]; activeIndex: number }) {
  const active = chapters[activeIndex] ?? chapters[0];
  return (
    <nav className="exhibition-nav" aria-label="Exhibition chapters">
      <a className="nav-mark" href="#entrance" aria-label="Return to exhibition entrance">CA</a>
      <div className="nav-chapters">
        {chapters.map((chapter, index) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className={index === activeIndex ? "is-active" : undefined}
            aria-current={index === activeIndex ? "page" : undefined}
            aria-label={`Go to chapter ${chapter.number}: ${chapter.from.name} and ${chapter.to.name}`}
          >
            {chapter.number}
          </a>
        ))}
      </div>
      <div className="nav-current" aria-live="polite">
        <span>{active.number}</span>
        <strong>{active.from.name} / {active.to.name}</strong>
      </div>
      <div className="nav-progress" aria-hidden="true"><i /></div>
    </nav>
  );
}
