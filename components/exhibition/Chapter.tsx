"use client";

import { useEffect, useRef, useState } from "react";
import type { Chapter as ChapterData } from "@/data/exhibition";
import { useChapterMotion } from "@/hooks/useChapterMotion";
import { usePointerDepth } from "@/hooks/usePointerDepth";
import { ObjectHotspot } from "./ObjectHotspot";
import { SceneArtwork } from "./SceneArtwork";

type ChapterProps = {
  chapter: ChapterData;
  chapterIndex: number;
  activeAnnotation: string | null;
  onAnnotationToggle: (annotation: string, trigger: HTMLButtonElement) => void;
  onAnnotationDismiss: (restoreFocus?: boolean) => void;
  onActive: (index: number) => void;
  reducedMotion: boolean;
};

export function Chapter({
  chapter,
  chapterIndex,
  activeAnnotation,
  onAnnotationToggle,
  onAnnotationDismiss,
  onActive,
  reducedMotion,
}: ChapterProps) {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isCentered, setIsCentered] = useState(false);
  const usesAdaptiveInk = chapter.scene === "navyApricot" || chapter.scene === "emberGlacier" || chapter.scene === "cacaoIvory";

  useChapterMotion(trackRef, reducedMotion, usesAdaptiveInk ? "adaptive" : "light");
  usePointerDepth(stageRef, reducedMotion);

  useEffect(() => {
    const target = trackRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const centered = entry?.isIntersecting ?? false;
        setIsCentered((current) => current === centered ? current : centered);
        if (centered) onActive(chapterIndex);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [chapterIndex, onActive]);

  return (
    <section
      id={chapter.id}
      ref={trackRef}
      className={`chapter-track chapter-track--${chapter.scene}`}
      style={{ "--from": chapter.from.hex, "--to": chapter.to.hex } as React.CSSProperties}
      aria-labelledby={`${chapter.id}-heading`}
    >
      <div
        ref={stageRef}
        className={`chapter-stage scene--${chapter.scene}${isCentered ? " is-active" : ""}`}
        onPointerDown={(event) => {
          if (!(event.target as Element).closest(".object-hotspot")) onAnnotationDismiss();
        }}
      >
        <SceneArtwork scene={chapter.scene} />
        <header className="chapter-heading">
          <p className="chapter-number">{chapter.number} / 04</p>
          <h2 id={`${chapter.id}-heading`}>
            <span>{chapter.from.name}</span>
            <i aria-hidden="true">↔</i>
            <span>{chapter.to.name}</span>
          </h2>
          <p className="chapter-dek">{chapter.dek}</p>
        </header>
        <div className="world-label world-label--from">
          <span>{chapter.from.hex}</span>
          <strong>{chapter.from.atmosphere}</strong>
        </div>
        <div className="world-label world-label--to">
          <span>{chapter.to.hex}</span>
          <strong>{chapter.to.atmosphere}</strong>
        </div>
        <p className="transformation-caption">{chapter.transformation}</p>
        <div className="hotspot-layer" aria-label={`${chapter.from.name} and ${chapter.to.name} objects`}>
          {chapter.hotspots.map((hotspot) => {
            const key = `${chapter.id}:${hotspot.id}`;
            return (
              <ObjectHotspot
                key={key}
                chapterId={chapter.id}
                hotspot={hotspot}
                open={activeAnnotation === key}
                onToggle={(trigger) => onAnnotationToggle(key, trigger)}
                onDismiss={() => onAnnotationDismiss(true)}
                reducedMotion={reducedMotion}
              />
            );
          })}
        </div>
        <p className="scene-instruction"><span aria-hidden="true">+</span> Find three field notes</p>
      </div>
    </section>
  );
}
