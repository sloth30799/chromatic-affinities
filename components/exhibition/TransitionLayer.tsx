import type { Chapter, HandoffRendererProps, TransitionDescriptor } from "@/data/exhibition";
import { HandoffArtwork } from "./handoffs/HandoffArtwork";

type TransitionLayerProps = {
  current: Chapter;
  next: Chapter;
  progress: HandoffRendererProps["progress"];
  resetRevision: HandoffRendererProps["resetRevision"];
};

/** Persistent, inert coordinator. Profile artwork is intentionally delegated. */
export function TransitionLayer({ current, next, progress, resetRevision }: TransitionLayerProps) {
  const descriptor: TransitionDescriptor = {
    profile: current.handoffProfile,
    currentChapterId: current.id,
    nextChapterId: next.id,
    currentLeft: current.from,
    currentRight: current.to,
    nextLeft: next.from,
    nextRight: next.to,
  };

  return (
    <div
      className="transition-layer"
      data-profile={descriptor.profile}
      data-current={descriptor.currentChapterId}
      data-next={descriptor.nextChapterId}
      data-reset-revision={resetRevision}
      aria-hidden="true"
      inert
    >
      <HandoffArtwork descriptor={descriptor} progress={progress} resetRevision={resetRevision} />
    </div>
  );
}
