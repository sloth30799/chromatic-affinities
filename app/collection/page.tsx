import type { Metadata } from "next";
import { CollectionRegister, CollectionUnavailable } from "@/components/campaign/CollectionRegister";
import { exhibitionDataValidation } from "@/data/exhibition";
import "@/styles/campaign/collection.css";

export const metadata: Metadata = {
  title: "Collection 01 — Material Studies",
  description: "Collection 01 is a fictional, self-initiated material studies concept campaign by Atelier Chromatique.",
};

export default function CollectionPage() {
  if (!exhibitionDataValidation.valid) return <CollectionUnavailable />;
  return <CollectionRegister />;
}
