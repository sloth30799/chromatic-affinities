"use client";

import { useEffect, useRef } from "react";
import {
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

type MotionTarget = React.RefObject<HTMLElement | null>;
type ContrastMode = "adaptive" | "light";

const staticPhases = {
  "--scroll-progress": 0.5,
  "--atmosphere": 0.54,
  "--hero": 0.58,
  "--particles": 0.56,
  "--foreground": 0.7,
  "--editorial": 0.5,
};

function writeVariable(target: MotionTarget, name: string, value: number) {
  target.current?.style.setProperty(name, value.toFixed(4));
}

function useCssVariable(
  target: MotionTarget,
  value: MotionValue<number>,
  name: keyof typeof staticPhases,
  reducedMotion: boolean,
) {
  useMotionValueEvent(value, "change", (latest) => {
    if (!reducedMotion) writeVariable(target, name, latest);
  });
}

/**
 * A native-scroll timeline for a sticky chapter. Motion owns the scroll value
 * and a tight spring removes only the tiny mechanical edges from direct scroll
 * input. Named derived values keep each visual department on its own beat.
 */
export function useChapterMotion(
  target: MotionTarget,
  reducedMotion: boolean,
  contrastMode: ContrastMode = "light",
) {
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 32,
    mass: 0.2,
    restDelta: 0.0005,
  });

  const atmosphere = useTransform(progress, [0, 0.34], [0, 1]);
  const hero = useTransform(progress, [0.14, 0.68], [0, 1]);
  const particles = useTransform(progress, [0.28, 0.8], [0, 1]);
  const foreground = useTransform(progress, [0.5, 0.94], [0, 1]);
  const editorial = useTransform(progress, [0.66, 0.97], [0, 1]);
  const inkMode = useRef<"light" | "dark" | null>(null);

  useMotionValueEvent(progress, "change", (latest) => {
    if (contrastMode !== "adaptive") return;

    const current = inkMode.current;
    const next = reducedMotion
      ? "dark"
      : current === "dark"
        ? latest <= 0.76 ? "light" : "dark"
        : latest >= 0.78 ? "dark" : "light";

    if (next === current) return;
    target.current?.setAttribute("data-ink", next);
    inkMode.current = next;
  });

  useCssVariable(target, progress, "--scroll-progress", reducedMotion);
  useCssVariable(target, atmosphere, "--atmosphere", reducedMotion);
  useCssVariable(target, hero, "--hero", reducedMotion);
  useCssVariable(target, particles, "--particles", reducedMotion);
  useCssVariable(target, foreground, "--foreground", reducedMotion);
  useCssVariable(target, editorial, "--editorial", reducedMotion);

  useEffect(() => {
    const node = target.current;

    if (contrastMode === "adaptive") {
      const latest = reducedMotion ? 1 : progress.get();
      const next = latest >= 0.78 ? "dark" : "light";
      node?.setAttribute("data-ink", next);
      inkMode.current = next;
    } else {
      node?.removeAttribute("data-ink");
      inkMode.current = null;
    }

    if (reducedMotion) {
      Object.entries(staticPhases).forEach(([name, value]) => writeVariable(target, name, value));
    } else {
      writeVariable(target, "--scroll-progress", progress.get());
      writeVariable(target, "--atmosphere", atmosphere.get());
      writeVariable(target, "--hero", hero.get());
      writeVariable(target, "--particles", particles.get());
      writeVariable(target, "--foreground", foreground.get());
      writeVariable(target, "--editorial", editorial.get());
    }

    return () => {
      node?.removeAttribute("data-ink");
      inkMode.current = null;
    };
  }, [atmosphere, contrastMode, editorial, foreground, hero, particles, progress, reducedMotion, target]);

  return { scrollYProgress, progress, atmosphere, hero, particles, foreground, editorial };
}
