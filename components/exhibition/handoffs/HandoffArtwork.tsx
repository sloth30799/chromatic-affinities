import type { HandoffRendererProps } from "@/data/exhibition";
import { EnsembleReturnHandoff } from "./EnsembleReturnHandoff";
import { LiquidToBotanicalHandoff } from "./LiquidToBotanicalHandoff";
import { PetalToPrismHandoff } from "./PetalToPrismHandoff";
import { PrismToPaperHandoff } from "./PrismToPaperHandoff";

/** Closed dispatcher: later handoff profiles remain intentionally absent until authored. */
export function HandoffArtwork(props: HandoffRendererProps) {
  if (props.descriptor.profile === "liquidToBotanical") {
    return <LiquidToBotanicalHandoff {...props} />;
  }

  if (props.descriptor.profile === "petalToPrism") {
    return <PetalToPrismHandoff {...props} />;
  }

  if (props.descriptor.profile === "prismToPaper") {
    return <PrismToPaperHandoff {...props} />;
  }

  if (props.descriptor.profile === "ensembleReturn") {
    return <EnsembleReturnHandoff {...props} />;
  }

  return null;
}
