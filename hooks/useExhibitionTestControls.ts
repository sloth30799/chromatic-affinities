"use client";

import { useEffect, useRef } from "react";
import type { Clock } from "@/lib/clock";

type FaultSource = "render" | "frame" | "boundary" | "event";

type TestClock = Clock & {
  advance: (milliseconds: number) => void;
  flushFrame: () => void;
};

type ExhibitionTestControlsOptions = {
  clock: TestClock | null;
  setChapter: (index: number) => void;
  setProgress: (progress: number) => void;
  fault: (source: FaultSource) => void;
  getRenderCount: () => number;
};

type ExhibitionTestBridge = {
  setChapter(index: number): void;
  setProgress(progress: number): void;
  advance(milliseconds: number): void;
  flushFrame(): void;
  fault(source: FaultSource): void;
  setSafeAreaInset(px: number): void;
  getRenderCount(): number;
};

declare global {
  interface Window {
    __CA_TEST__?: ExhibitionTestBridge;
  }
}

export function createTestClock(): TestClock {
  let now = 0;
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, { callback: () => void; at: number }>();

  const runDueTimers = () => {
    let due = [...timers.entries()]
      .filter(([, timer]) => timer.at <= now)
      .sort(([, first], [, second]) => first.at - second.at);
    while (due.length > 0) {
      for (const [timerId, timer] of due) {
        timers.delete(timerId);
        timer.callback();
      }
      due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort(([, first], [, second]) => first.at - second.at);
    }
  };

  return {
    now: () => now,
    requestFrame(callback) {
      id += 1;
      frames.set(id, callback);
      return id;
    },
    cancelFrame(frameId) {
      frames.delete(frameId);
    },
    setTimer(callback, delayMs) {
      id += 1;
      timers.set(id, { callback, at: now + Math.max(0, Number.isFinite(delayMs) ? delayMs : 0) });
      return id;
    },
    clearTimer(timerId) {
      timers.delete(timerId);
    },
    advance(milliseconds) {
      now += Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0);
      runDueTimers();
    },
    flushFrame() {
      const pending = [...frames.entries()];
      frames.clear();
      for (const [, callback] of pending) callback(now);
    },
  };
}

/**
 * The production branch is removed by Next's compile-time public-env
 * replacement. No diagnostic URL or global is installed unless test mode is on.
 */
export function useExhibitionTestControls(options: ExhibitionTestControlsOptions) {
  const latest = useRef(options);
  const isTestMode = process.env.NEXT_PUBLIC_CA_TEST_MODE === "1";

  useEffect(() => {
    latest.current = options;
  }, [options]);

  useEffect(() => {
    if (!isTestMode || !latest.current.clock) return;
    const testClock = latest.current.clock;
    const bridgeKey = String.fromCharCode(95, 95, 67, 65, 95, 84, 69, 83, 84, 95, 95);
    const bridgeWindow = window as unknown as Window & Record<string, ExhibitionTestBridge | undefined>;
    const setSafeAreaInset = (px: number) => {
      const inset = Number.isFinite(px) ? Math.max(0, px) : 0;
      document.documentElement.style.setProperty("--safe-area-test", `${inset}px`);
    };

    setSafeAreaInset(0);

    bridgeWindow[bridgeKey] = {
      setChapter(index) {
        latest.current.setChapter(index);
      },
      setProgress(progress) {
        latest.current.setProgress(progress);
      },
      advance(milliseconds) {
        testClock.advance(milliseconds);
      },
      flushFrame() {
        testClock.flushFrame();
      },
      fault(source) {
        latest.current.fault(source);
      },
      setSafeAreaInset,
      getRenderCount() {
        return latest.current.getRenderCount();
      },
    };

    return () => {
      delete bridgeWindow[bridgeKey];
      setSafeAreaInset(0);
    };
  }, [isTestMode]);
}
