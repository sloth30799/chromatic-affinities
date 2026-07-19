"use client";

import type { Chapter } from "@/data/exhibition";

type ExhibitionNavProps = {
  chapters: readonly Chapter[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function ExhibitionNav({ chapters, activeIndex, onSelect }: ExhibitionNavProps) {
  const active = chapters[activeIndex] ?? chapters[0];
  if (!active) return null;

  return (
    <nav className="exhibition-nav" aria-label="Exhibition chapters">
      <div className="nav-chapters">
        {chapters.map((chapter, index) => (
          <button
            type="button"
            key={chapter.id}
            className={index === activeIndex ? "is-active" : undefined}
            aria-current={index === activeIndex ? "page" : undefined}
            aria-label={`Go to chapter ${chapter.number}: ${chapter.from.name} and ${chapter.to.name}`}
            data-chapter-index={index}
            onClick={() => onSelect(index)}
          >
            {chapter.number}
          </button>
        ))}
      </div>
      <div className="nav-current">
        <span>{active.number}</span>
        <strong>{active.from.name} / {active.to.name}</strong>
      </div>
      <div className="nav-progress" aria-hidden="true"><i /></div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Chapter {active.number}: {active.from.name} and {active.to.name}
      </p>
    </nav>
  );
}
