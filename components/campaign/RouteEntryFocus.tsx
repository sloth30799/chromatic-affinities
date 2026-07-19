"use client";

import { useEffect } from "react";

type RouteEntryFocusProps = {
  targetId: string;
};

/** Shared route-entry focus behavior for the exhibition and future editorial routes. */
export function RouteEntryFocus({ targetId }: RouteEntryFocusProps) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const horizontalScroll = window.scrollX;
    const focusTarget = () => {
      target.focus({ preventScroll: true });
      if (window.scrollX !== horizontalScroll) window.scrollTo(horizontalScroll, window.scrollY);
    };

    focusTarget();
    const frame = window.requestAnimationFrame(() => {
      if (document.activeElement !== target) focusTarget();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [targetId]);

  return null;
}
