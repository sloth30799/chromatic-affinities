"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { chapters, type Hotspot, type MaterialSpecimen } from "@/data/exhibition";
import { isWithinWindow } from "@/lib/timeline";

type ObjectHotspotProps = {
  chapterId: string;
  hotspot: Hotspot;
  open: boolean;
  paused: boolean;
  progress: MotionValue<number>;
  onOpen: (trigger: HTMLButtonElement) => void;
  onDismiss: () => void;
};

/**
 * The parent still passes the frozen hotspot shape at this intermediate boundary.
 * Resolve its specimen from campaign data here so visitor-facing note copy has one
 * authored source: MaterialSpecimen.
 */
export function resolveHotspotSpecimen(chapterId: string, hotspot: Hotspot): MaterialSpecimen | undefined {
  return chapters
    .find((chapter) => chapter.id === chapterId)
    ?.specimens.find((specimen) => specimen.id === hotspot.specimenId);
}

export function ObjectHotspot({
  chapterId,
  hotspot,
  open,
  paused,
  progress,
  onOpen,
  onDismiss,
}: ObjectHotspotProps) {
  const specimen = resolveHotspotSpecimen(chapterId, hotspot);
  const annotationId = `${chapterId}-${hotspot.id}-annotation`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateAvailability = useCallback((timeline: number) => {
    const root = rootRef.current;
    const button = buttonRef.current;
    if (!root || !button) return;
    const focused = root.matches(":focus-within");
    const available = paused || open || focused || isWithinWindow(timeline, hotspot.calmWindow);
    root.classList.toggle("is-calm", available);
    button.tabIndex = available ? 0 : -1;
  }, [hotspot.calmWindow, open, paused]);

  useMotionValueEvent(progress, "change", updateAvailability);

  useEffect(() => {
    updateAvailability(progress.get());
  }, [open, paused, progress, updateAvailability]);

  if (!specimen) return null;

  return (
    <div
      ref={rootRef}
      className={`object-hotspot object-hotspot--${hotspot.align ?? "center"}`}
      style={{
        "--hotspot-desktop-x": `${hotspot.position.desktop.x}%`,
        "--hotspot-desktop-y": `${hotspot.position.desktop.y}%`,
        "--hotspot-mobile-x": `${hotspot.position.mobile.x}%`,
        "--hotspot-mobile-y": `${hotspot.position.mobile.y}%`,
      } as React.CSSProperties}
    >
      <button
        ref={buttonRef}
        id={`hotspot-${chapterId}-${hotspot.id}`}
        type="button"
        className="hotspot-button"
        aria-label={`Discover ${specimen.name}`}
        aria-expanded={open}
        aria-controls={annotationId}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(event.currentTarget);
        }}
        onFocus={() => updateAvailability(progress.get())}
        onBlur={() => updateAvailability(progress.get())}
      >
        <span aria-hidden="true" className="hotspot-pulse" />
        <span aria-hidden="true" className="hotspot-core" />
        <span className="sr-only">Open note about {specimen.name}</span>
      </button>

      {open && (
        <aside
          id={annotationId}
          role="note"
          aria-label={specimen.name}
          className="annotation"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="annotation-rule" />
          <div className="annotation-content">
            <p className="annotation-kicker">{specimen.name}</p>
            <p className="annotation-note">{specimen.note}</p>
            <p className="annotation-fact">{specimen.material} · {specimen.process} · {specimen.finish}</p>
          </div>
          <button
            type="button"
            className="annotation-close"
            aria-label={`Close note about ${specimen.name}`}
            onClick={onDismiss}
          >
            ×
          </button>
        </aside>
      )}
    </div>
  );
}
