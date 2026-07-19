"use client";

import { useEffect, useRef } from "react";
import type { Clock } from "@/lib/clock";
import type { MotionPreference } from "@/lib/playback";
import { OPENING_HOLD_MS } from "@/lib/timeline";

type OpeningHoldOptions = {
  clock: Clock;
  hidden: boolean;
  motionPreference: MotionPreference;
  openingReady: boolean;
  runtimeFaulted: boolean;
  onComplete: () => void;
};

/** The only scheduler for the visible-time opening hold. */
export function useOpeningHold({
  clock,
  hidden,
  motionPreference,
  openingReady,
  runtimeFaulted,
  onComplete,
}: OpeningHoldOptions) {
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const accountVisibleTime = () => {
      if (startedAtRef.current === null) return;
      elapsedRef.current = Math.min(
        OPENING_HOLD_MS,
        elapsedRef.current + Math.max(0, clock.now() - startedAtRef.current),
      );
      startedAtRef.current = null;
    };

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clock.clearTimer(timerRef.current);
        timerRef.current = null;
      }
      accountVisibleTime();
    };

    if (openingReady || completedRef.current || runtimeFaulted) {
      clearTimer();
      return clearTimer;
    }

    if (motionPreference !== "no-preference" || hidden) {
      clearTimer();
      return clearTimer;
    }

    const remaining = Math.max(0, OPENING_HOLD_MS - elapsedRef.current);
    if (remaining === 0) {
      completedRef.current = true;
      onComplete();
      return clearTimer;
    }

    startedAtRef.current = clock.now();
    timerRef.current = clock.setTimer(() => {
      timerRef.current = null;
      startedAtRef.current = null;
      elapsedRef.current = OPENING_HOLD_MS;
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }, remaining);

    return clearTimer;
  }, [clock, hidden, motionPreference, onComplete, openingReady, runtimeFaulted]);
}
