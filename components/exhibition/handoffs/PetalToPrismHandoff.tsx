import type { CSSProperties } from "react";
import type { HandoffRendererProps } from "@/data/exhibition";

/** A narrow botanical remnant that introduces, but never mounts, the next prism world. */
export function PetalToPrismHandoff({
  descriptor,
  progress,
  resetRevision,
}: HandoffRendererProps) {
  // The stage owns the MotionValue-to-CSS-variable write. The renderer never subscribes.
  void progress;

  const colors = {
    "--handoff-moss": descriptor.currentLeft.hex,
    "--handoff-orchid": descriptor.currentRight.hex,
    "--handoff-ember": descriptor.nextLeft.hex,
    "--handoff-glacier": descriptor.nextRight.hex,
  } as CSSProperties;

  return (
    <div
      className="petal-prism-handoff"
      style={colors}
      data-reset-revision={resetRevision}
      data-source={`${descriptor.currentChapterId}:${descriptor.nextChapterId}`}
    >
      <div className="petal-prism-shutters"><i /><i /><i /><i /></div>
      <div className="petal-prism-stem"><i /><i /><i /></div>
      <div className="petal-weave-remnant"><i /><i /><i /><i /><b /></div>
      <div className="petal-vial-remnant"><i /><b /></div>
      <div className="petal-prism-seed"><i /><i /><i /><b /><em /></div>
      <svg className="petal-prism-routes" viewBox="0 0 1000 800" preserveAspectRatio="none">
        <path d="M365 635C447 531 465 461 501 400c49-81 97-155 181-252" />
        <path d="M612 675C562 556 548 475 501 400c-35-56-62-106-111-202" />
      </svg>
      <div className="petal-prism-luma" />
    </div>
  );
}
