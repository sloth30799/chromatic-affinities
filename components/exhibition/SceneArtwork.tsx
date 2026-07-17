import type { SceneKind } from "@/data/exhibition";
import { CacaoIvoryScene } from "./scenes/CacaoIvoryScene";
import { EmberGlacierScene } from "./scenes/EmberGlacierScene";
import { MossOrchidScene } from "./scenes/MossOrchidScene";
import { NavyApricotScene } from "./scenes/NavyApricotScene";

export function SceneArtwork({ scene }: { scene: SceneKind }) {
  if (scene === "navyApricot") return <NavyApricotScene />;
  if (scene === "mossOrchid") return <MossOrchidScene />;
  if (scene === "emberGlacier") return <EmberGlacierScene />;
  return <CacaoIvoryScene />;
}
