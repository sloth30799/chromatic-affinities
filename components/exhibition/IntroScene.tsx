"use client";

import { useRef } from "react";
import { exhibitionIntro, exhibitionTitle } from "@/data/exhibition";
import { useChapterMotion } from "@/hooks/useChapterMotion";

export function IntroScene({ reducedMotion }: { reducedMotion: boolean }) {
  const trackRef = useRef<HTMLElement>(null);
  useChapterMotion(trackRef, reducedMotion);

  return (
    <section ref={trackRef} id="entrance" className="intro-track" aria-labelledby="exhibition-title">
      <div className="intro-stage">
        <div className="intro-orbit intro-orbit--one" />
        <div className="intro-orbit intro-orbit--two" />
        <div className="intro-disc intro-disc--navy" />
        <div className="intro-disc intro-disc--apricot" />
        <div className="intro-disc intro-disc--orchid" />
        <p className="intro-index">An exhibition in eight worlds</p>
        <h1 id="exhibition-title">{exhibitionTitle}</h1>
        <p className="intro-copy">{exhibitionIntro}</p>
        <a className="scroll-cue" href="#navy-apricot">
          <span aria-hidden="true" />
          Scroll to enter
        </a>
      </div>
    </section>
  );
}
