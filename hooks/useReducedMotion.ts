"use client";

import { useEffect, useState } from "react";
import type { MotionPreference } from "@/lib/playback";

export function useReducedMotion(active = true): MotionPreference {
  const [preference, setPreference] = useState<MotionPreference>("unknown");

  useEffect(() => {
    if (!active) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPreference(query.matches ? "reduce" : "no-preference");

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [active]);

  return preference;
}
