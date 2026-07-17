"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Hotspot } from "@/data/exhibition";

type ObjectHotspotProps = {
  chapterId: string;
  hotspot: Hotspot;
  open: boolean;
  onToggle: (trigger: HTMLButtonElement) => void;
  onDismiss: () => void;
  reducedMotion: boolean;
};

export function ObjectHotspot({
  chapterId,
  hotspot,
  open,
  onToggle,
  onDismiss,
  reducedMotion,
}: ObjectHotspotProps) {
  const annotationId = `${chapterId}-${hotspot.id}-annotation`;

  return (
    <div
      className={`object-hotspot object-hotspot--${hotspot.align ?? "center"}`}
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
    >
      <button
        type="button"
        className="hotspot-button"
        aria-label={`Discover ${hotspot.title}`}
        aria-expanded={open}
        aria-controls={annotationId}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(event.currentTarget);
        }}
      >
        <span aria-hidden="true" className="hotspot-pulse" />
        <span aria-hidden="true" className="hotspot-core" />
        <span className="sr-only">Open note about {hotspot.title}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            id={annotationId}
            role="note"
            aria-label={hotspot.title}
            className="annotation"
            initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 5, scale: 0.985 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="annotation-rule" />
            <div className="annotation-content">
              <p className="annotation-kicker">{hotspot.title}</p>
              <p className="annotation-note">{hotspot.note}</p>
              <p className="annotation-fact">{hotspot.fact}</p>
            </div>
            <button
              type="button"
              className="annotation-close"
              aria-label={`Close note about ${hotspot.title}`}
              onClick={onDismiss}
            >
              ×
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
