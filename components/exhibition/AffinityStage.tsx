"use client";

import type { MotionValue } from "motion/react";
import type { RefObject } from "react";
import type { Chapter } from "@/data/exhibition";
import type { AnnotationState, MotionPreference, PlaybackStatus } from "@/lib/playback";
import { ObjectHotspot } from "./ObjectHotspot";
import { SceneArtwork } from "./SceneArtwork";
import { TransitionLayer } from "./TransitionLayer";
import { CampaignMasthead } from "@/components/campaign/CampaignMasthead";

type AffinityStageProps = {
  chapter: Chapter;
  nextChapter: Chapter;
  stageRef: RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
  resetRevision: number;
  motionPreference: MotionPreference;
  playbackStatus: PlaybackStatus;
  annotation: AnnotationState;
  onOpenNote: (noteId: string, triggerId: string) => void;
  onDismissReading: () => void;
};

export function AffinityStage({
  chapter,
  nextChapter,
  stageRef,
  progress,
  resetRevision,
  motionPreference,
  playbackStatus,
  annotation,
  onOpenNote,
  onDismissReading,
}: AffinityStageProps) {
  const summaryId = `chapter-summary-${chapter.id}`;
  const paused = playbackStatus === "paused" || motionPreference === "reduce";

  return (
    <section
      ref={stageRef}
      className={`affinity-stage scene--${chapter.scene}`}
      style={{ "--from": chapter.from.hex, "--to": chapter.to.hex } as React.CSSProperties}
      aria-labelledby={`${chapter.id}-heading`}
      aria-describedby={summaryId}
      onPointerDown={(event) => {
        if (!(event.target as Element).closest(".object-hotspot")) onDismissReading();
      }}
    >
      <SceneArtwork scene={chapter.scene} />
      <header className="chapter-heading">
        <CampaignMasthead chapter={chapter} />
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
          const isOpen = annotation.kind === "note"
            && annotation.source === "hotspot"
            && annotation.noteId === hotspot.id;
          return (
            <ObjectHotspot
              key={hotspot.id}
              chapterId={chapter.id}
              hotspot={hotspot}
              open={isOpen}
              paused={paused}
              progress={progress}
              onOpen={(trigger) => onOpenNote(hotspot.id, trigger.id)}
              onDismiss={onDismissReading}
            />
          );
        })}
      </div>
      <p id={summaryId} className="chapter-summary">{chapter.reducedMotionSummary}</p>
      <TransitionLayer
        current={chapter}
        next={nextChapter}
        progress={progress}
        resetRevision={resetRevision}
      />
    </section>
  );
}
