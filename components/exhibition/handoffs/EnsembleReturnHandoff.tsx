import type { CSSProperties } from "react";
import type { HandoffRendererProps } from "@/data/exhibition";

/** A contained four-pair echo that resolves into the opening navy/apricot aperture. */
export function EnsembleReturnHandoff({
  descriptor,
  progress,
  resetRevision,
}: HandoffRendererProps) {
  // The persistent stage owns the shared progress write; this artwork is CSS-variable-only.
  void progress;

  const colors = {
    "--handoff-cacao": descriptor.currentLeft.hex,
    "--handoff-ivory": descriptor.currentRight.hex,
    "--handoff-navy": descriptor.nextLeft.hex,
    "--handoff-apricot": descriptor.nextRight.hex,
    "--handoff-moss": "#38523B",
    "--handoff-orchid": "#C377FF",
    "--handoff-ember": "#E4472E",
    "--handoff-glacier": "#8FE7F2",
  } as CSSProperties;

  return (
    <div
      className="ensemble-return-handoff"
      style={colors}
      data-reset-revision={resetRevision}
      data-source={`${descriptor.currentChapterId}:${descriptor.nextChapterId}`}
    >
      <div className="ensemble-return-luma" />
      <div className="ensemble-return-traces">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
      <div className="ensemble-return-folds"><i /><i /><i /><i /></div>
      <div className="ensemble-return-aperture"><i /><i /><i /><b /></div>
    </div>
  );
}
