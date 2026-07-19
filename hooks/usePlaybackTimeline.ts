"use client";

import { motionValue, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { MotionCueConfig } from "@/data/exhibition";
import { browserClock, type Clock } from "@/lib/clock";
import type { MotionPreference } from "@/lib/playback";
import { advanceElapsed, mapPhase, normalizeElapsed } from "@/lib/timeline";

type TimelineFault = { source: "frame" | "boundary"; message: string };

type PlaybackTimelineOptions = {
  durationMs: number;
  motionPreference: MotionPreference;
  canPlay: boolean;
  resetRevision: number;
  initialElapsedMs: number;
  cues: MotionCueConfig;
  clock?: Clock;
  onBoundary: (result: { count: number; remainderMs: number }) => void;
  onFault: (fault: TimelineFault) => void;
  stageRef: RefObject<HTMLElement | null>;
};

type PlaybackTimelineResult = {
  progress: MotionValue<number>;
  seekForTest?: (progress: number) => void;
};

function finiteProgress(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * Imperative timeline only: it owns elapsed time and CSS variables, never React
 * playback state, chapter selection, or focus.
 */
export function usePlaybackTimeline({
  durationMs,
  motionPreference,
  canPlay,
  resetRevision,
  initialElapsedMs,
  cues,
  clock = browserClock,
  onBoundary,
  onFault,
  stageRef,
}: PlaybackTimelineOptions): PlaybackTimelineResult {
  const [progress] = useState<MotionValue<number>>(() => motionValue(0));

  const elapsedRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const previousTimestampRef = useRef<number | null>(null);
  const latestRef = useRef({ cues, durationMs, onBoundary, onFault, stageRef, clock });

  useEffect(() => {
    latestRef.current = { cues, durationMs, onBoundary, onFault, stageRef, clock };
  }, [clock, cues, durationMs, onBoundary, onFault, stageRef]);

  const writeFrame = useCallback((elapsedMs: number) => {
    const latest = latestRef.current;
    const timeline = normalizeElapsed(elapsedMs, latest.durationMs);
    const { establishEnd, buildEnd, collisionEnd, fusionEnd, restoreEnd, handoffEnd, easings } = latest.cues;
    const target = latest.stageRef.current;

    progress.set(timeline);
    if (!target) return;

    target.style.setProperty("--timeline", timeline.toFixed(4));
    target.style.setProperty("--establish", mapPhase(timeline, [0, establishEnd]).toFixed(4));
    target.style.setProperty("--build", mapPhase(timeline, [establishEnd, buildEnd], easings.build).toFixed(4));
    target.style.setProperty("--collision", mapPhase(timeline, [buildEnd, collisionEnd], easings.collision).toFixed(4));
    target.style.setProperty("--fusion", mapPhase(timeline, [collisionEnd, fusionEnd], easings.fusion).toFixed(4));
    target.style.setProperty("--restore", mapPhase(timeline, [fusionEnd, restoreEnd], easings.restore).toFixed(4));
    target.style.setProperty("--handoff", mapPhase(timeline, [restoreEnd, handoffEnd], easings.handoff).toFixed(4));
  }, [progress]);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      latestRef.current.clock.cancelFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelFrame();
    elapsedRef.current = Math.max(0, Math.min(durationMs, initialElapsedMs));
    previousTimestampRef.current = null;
    try {
      writeFrame(elapsedRef.current);
    } catch (error) {
      onFault({ source: "frame", message: error instanceof Error ? error.message : "Unable to render timeline." });
    }
    return cancelFrame;
  }, [cancelFrame, durationMs, initialElapsedMs, onFault, resetRevision, writeFrame]);

  useEffect(() => {
    cancelFrame();
    previousTimestampRef.current = null;
    if (!canPlay || motionPreference !== "no-preference") return cancelFrame;

    const frame = (timestamp: number) => {
      frameRef.current = null;
      try {
        const previous = previousTimestampRef.current;
        previousTimestampRef.current = Number.isFinite(timestamp) ? timestamp : latestRef.current.clock.now();
        if (previous === null) {
          frameRef.current = latestRef.current.clock.requestFrame(frame);
          return;
        }

        const advance = advanceElapsed(
          elapsedRef.current,
          Math.max(0, previousTimestampRef.current - previous),
          latestRef.current.durationMs,
        );
        elapsedRef.current = advance.remainderMs;
        writeFrame(elapsedRef.current);

        if (advance.boundaryCount > 0) {
          try {
            latestRef.current.onBoundary({ count: advance.boundaryCount, remainderMs: advance.remainderMs });
          } catch (error) {
            latestRef.current.onFault({
              source: "boundary",
              message: error instanceof Error ? error.message : "Unable to change chapter.",
            });
          }
          return;
        }

        frameRef.current = latestRef.current.clock.requestFrame(frame);
      } catch (error) {
        latestRef.current.onFault({
          source: "frame",
          message: error instanceof Error ? error.message : "Unable to advance timeline.",
        });
      }
    };

    frameRef.current = clock.requestFrame(frame);
    return cancelFrame;
  }, [canPlay, cancelFrame, clock, motionPreference, resetRevision, writeFrame]);

  const seekForTest = useCallback((nextProgress: number) => {
    const clamped = finiteProgress(nextProgress);
    elapsedRef.current = clamped * latestRef.current.durationMs;
    writeFrame(elapsedRef.current);
  }, [writeFrame]);

  return {
    progress,
    seekForTest: process.env.NEXT_PUBLIC_CA_TEST_MODE === "1" ? seekForTest : undefined,
  };
}
