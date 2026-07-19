"use client";

import { useEffect, useRef } from "react";
import type { Chapter, Hotspot } from "@/data/exhibition";
import type { AnnotationState } from "@/lib/playback";

type FieldNoteIndexProps = {
  chapter: Chapter;
  annotation: AnnotationState;
  onOpenIndex: (triggerId: string) => void;
  onOpenNote: (hotspot: Hotspot, triggerId: string) => void;
  onDismiss: () => void;
  onBackToIndex: () => void;
};

export function FieldNoteIndex({
  chapter,
  annotation,
  onOpenIndex,
  onOpenNote,
  onDismiss,
  onBackToIndex,
}: FieldNoteIndexProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const noteEntries = chapter.hotspots.flatMap((hotspot) => {
    const specimen = chapter.specimens.find((candidate) => candidate.id === hotspot.specimenId);
    return specimen ? [{ hotspot, specimen }] : [];
  });
  const isIndexOpen = annotation.kind === "index";
  const indexNote = annotation.kind === "note" && annotation.source === "index"
    ? noteEntries.find(({ hotspot }) => hotspot.id === annotation.noteId)
    : undefined;
  const isOpen = isIndexOpen || Boolean(indexNote);

  useEffect(() => {
    if (indexNote) closeRef.current?.focus();
  }, [indexNote]);

  return (
    <aside className="field-note-index" aria-label="Material notes">
      <button
        id="field-notes"
        type="button"
        className="field-note-index__trigger"
        aria-expanded={isOpen}
        aria-controls="field-note-panel"
        onClick={() => isOpen ? onDismiss() : onOpenIndex("field-notes")}
      >
        Material notes <span aria-hidden="true">+</span>
      </button>

      {isOpen && (
        <div
          id="field-note-panel"
          className="field-note-index__backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onDismiss();
          }}
        >
          <div className="field-note-index__panel">
            {indexNote ? (
              <aside role="note" aria-labelledby="index-note-title" className="field-note-index__note">
                <div className="field-note-index__heading field-note-index__note-heading">
                  <p className="field-note-index__eyebrow">Material note</p>
                  <button ref={closeRef} type="button" onClick={onBackToIndex}>
                    Back to material notes
                  </button>
                </div>
                <h2 id="index-note-title">{indexNote.specimen.name}</h2>
                <p>{indexNote.specimen.note}</p>
                <p className="field-note-index__fact">
                  {indexNote.specimen.material} · {indexNote.specimen.process} · {indexNote.specimen.finish}
                </p>
              </aside>
            ) : (
              <>
                <div className="field-note-index__heading">
                  <p>Material notes / {chapter.number}</p>
                  <button type="button" onClick={onDismiss} aria-label="Close material notes">×</button>
                </div>
                <ol>
                  {noteEntries.map(({ hotspot, specimen }) => (
                    <li key={hotspot.id}>
                      <button
                        id={`field-note-row-${hotspot.id}`}
                        type="button"
                        onClick={() => onOpenNote(hotspot, `field-note-row-${hotspot.id}`)}
                      >
                        <span>{specimen.name}</span>
                        <span aria-hidden="true">↗</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
