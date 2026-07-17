"use client";

import { useEffect } from "react";

export function usePointerDepth(
  element: React.RefObject<HTMLElement | null>,
  reducedMotion: boolean,
) {
  useEffect(() => {
    const target = element.current;
    if (!target || reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let frame = 0;
    let x = 0;
    let y = 0;
    const update = () => {
      frame = 0;
      target.style.setProperty("--pointer-x", x.toFixed(3));
      target.style.setProperty("--pointer-y", y.toFixed(3));
    };
    const move = (event: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width - 0.5;
      y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const leave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerleave", leave);
    return () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerleave", leave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [element, reducedMotion]);
}
