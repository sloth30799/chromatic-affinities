import type { Metadata } from "next";
import { Exhibition } from "@/components/exhibition/Exhibition";

export const metadata: Metadata = {
  title: "Chromatic Affinities — Material Studies No. 01",
  description: "A fictional self-initiated concept campaign by Atelier Chromatique: four color studies for material worlds.",
};

export default function Home() {
  return <Exhibition />;
}
