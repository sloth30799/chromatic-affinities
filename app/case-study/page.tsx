import type { Metadata } from "next";
import { CaseStudy, CaseStudyUnavailable } from "@/components/campaign/CaseStudy";
import { exhibitionDataValidation } from "@/data/exhibition";
import "@/styles/campaign/case-study.css";

export const metadata: Metadata = {
  title: "Project Case Study — Chromatic Affinities",
  description: "A local, self-initiated case study for Chromatic Affinities, a fictional Atelier Chromatique material studies concept.",
};

export default function CaseStudyPage() {
  if (!exhibitionDataValidation.valid) return <CaseStudyUnavailable />;
  return <CaseStudy />;
}
