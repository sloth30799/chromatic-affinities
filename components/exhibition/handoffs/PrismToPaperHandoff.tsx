import type { CSSProperties } from "react";
import type { HandoffRendererProps } from "@/data/exhibition";

/** A capped crystal residue that foreshadows the next paper world without mounting it. */
export function PrismToPaperHandoff({
  descriptor,
  progress,
  resetRevision,
}: HandoffRendererProps) {
  // The stage owns the MotionValue-to-CSS-variable write. The renderer never subscribes.
  void progress;

  const colors = {
    "--handoff-ember": descriptor.currentLeft.hex,
    "--handoff-glacier": descriptor.currentRight.hex,
    "--handoff-cacao": descriptor.nextLeft.hex,
    "--handoff-ivory": descriptor.nextRight.hex,
  } as CSSProperties;

  return (
    <div
      className="prism-paper-handoff"
      style={colors}
      data-reset-revision={resetRevision}
      data-source={`${descriptor.currentChapterId}:${descriptor.nextChapterId}`}
    >
      <div className="prism-paper-luma" />
      <div className="prism-paper-residue"><i /><i /><i /><i /><i /><b /></div>
      <div className="prism-paper-fold"><i /><i /><i /><b /></div>
      <svg className="prism-paper-creases" viewBox="0 0 1000 800" preserveAspectRatio="none">
        <path d="M381 604L500 400l120 204" />
        <path d="M500 400v240m0-240-138 123m138-123 139 123" />
      </svg>
    </div>
  );
}
