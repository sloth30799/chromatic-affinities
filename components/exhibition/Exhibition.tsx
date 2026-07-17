"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { chapters } from "@/data/exhibition";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Chapter } from "./Chapter";
import { ClosingScene } from "./ClosingScene";
import { ExhibitionNav } from "./ExhibitionNav";
import { IntroScene } from "./IntroScene";

export function Exhibition() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const activeAnnotationTrigger = useRef<HTMLButtonElement | null>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const toggleAnnotation = useCallback((annotation: string, trigger: HTMLButtonElement) => {
    setActiveAnnotation((current) => {
      if (current === annotation) return null;
      activeAnnotationTrigger.current = trigger;
      return annotation;
    });
  }, []);

  const dismissAnnotation = useCallback((restoreFocus = false) => {
    const trigger = activeAnnotationTrigger.current;
    setActiveAnnotation(null);

    if (restoreFocus && trigger?.isConnected) {
      trigger.focus();
    }
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    document.documentElement.style.setProperty("--page-progress", latest.toFixed(4));
  });

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeAnnotation) {
        event.preventDefault();
        dismissAnnotation(true);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [activeAnnotation, dismissAnnotation]);

  return (
    <main className="exhibition" data-reduced-motion={reducedMotion ? "true" : "false"}>
      <ExhibitionNav chapters={chapters} activeIndex={activeIndex} />
      <IntroScene reducedMotion={reducedMotion} />
      {chapters.map((chapter, index) => (
        <Chapter
          key={chapter.id}
          chapter={chapter}
          chapterIndex={index}
          activeAnnotation={activeAnnotation}
          onAnnotationToggle={toggleAnnotation}
          onAnnotationDismiss={dismissAnnotation}
          onActive={setActiveIndex}
          reducedMotion={reducedMotion}
        />
      ))}
      <ClosingScene />
    </main>
  );
}
