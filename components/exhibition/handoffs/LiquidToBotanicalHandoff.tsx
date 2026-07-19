import type { CSSProperties } from "react";
import type { HandoffRendererProps } from "@/data/exhibition";

export function LiquidToBotanicalHandoff({
  descriptor,
  progress,
  resetRevision,
}: HandoffRendererProps) {
  // The stage owns the MotionValue-to-CSS-variable write. The renderer never subscribes.
  void progress;

  const colors = {
    "--handoff-navy": descriptor.currentLeft.hex,
    "--handoff-apricot": descriptor.currentRight.hex,
    "--handoff-moss": descriptor.nextLeft.hex,
    "--handoff-orchid": descriptor.nextRight.hex,
  } as CSSProperties;

  return (
    <div
      className="liquid-botanical-handoff"
      style={colors}
      data-reset-revision={resetRevision}
      data-source={`${descriptor.currentChapterId}:${descriptor.nextChapterId}`}
    >
      <svg className="handoff-liquid-ribbons" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <path d="M-60 672C134 564 276 727 427 578c99-98 83-235 74-325 147 159 179 272 76 414C438 831 233 747-60 884Z" />
        <path d="M1060 148C854 251 719 169 589 332c-82 102-64 214-89 315-119-143-150-269-42-414 133-177 329-85 602-225Z" />
        <path d="M-50 521C144 430 296 572 432 477c84-59 78-151 68-242" />
        <path d="M1050 466C854 555 725 432 584 544c-78 62-70 154-84 247" />
      </svg>
      <div className="handoff-luma" />
      <div className="handoff-aperture"><i /><i /><i /></div>
      <div className="handoff-glaze-impression"><i /><b /></div>
      <div className="handoff-mineral-impression"><i /><i /><i /></div>
      <div className="botanical-ghost botanical-ghost--moss"><i /><i /><i /><b /></div>
      <div className="botanical-ghost botanical-ghost--orchid"><i /><i /><i /><i /><b /></div>
    </div>
  );
}
