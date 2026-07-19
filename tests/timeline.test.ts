import { afterEach, describe, expect, it, vi } from "vitest";
import { browserClock } from "@/lib/clock";
import {
  CHAPTER_DURATION_MS,
  CUE_ENDPOINTS,
  EXHIBITION_DURATION_MS,
  HANDOFF_DURATION_MS,
  OPENING_HOLD_MS,
  advanceElapsed,
  isWithinWindow,
  mapPhase,
  normalizeElapsed,
} from "@/lib/timeline";

describe("timeline math", () => {
  it("defines the four-chapter authored cycle independently from the opening hold", () => {
    expect(CHAPTER_DURATION_MS).toBe(12_000);
    expect(EXHIBITION_DURATION_MS).toBe(48_000);
    expect(HANDOFF_DURATION_MS).toBe(1_920);
    expect(CUE_ENDPOINTS).toEqual({
      establishEnd: 0.06,
      buildEnd: 0.27,
      collisionEnd: 0.55,
      fusionEnd: 0.7,
      restoreEnd: 0.84,
      handoffEnd: 1,
    });
  });

  it.each([
    [0, 0],
    [6_000, 0.5],
    [12_000, 1],
    [-100, 0],
    [99_000, 1],
  ])("normalizes %dms to %f", (elapsed, expected) => {
    expect(normalizeElapsed(elapsed, CHAPTER_DURATION_MS)).toBe(expected);
  });

  it.each([12_000, 24_000, 36_000, 48_000])("crosses the %dms boundary exactly", (delta) => {
    expect(advanceElapsed(0, delta, CHAPTER_DURATION_MS)).toEqual({
      boundaryCount: delta / CHAPTER_DURATION_MS,
      remainderMs: 0,
      progress: 0,
    });
  });

  it("carries overshoot and crosses multiple boundaries in one visible frame", () => {
    expect(advanceElapsed(11_900, 500, CHAPTER_DURATION_MS)).toEqual({
      boundaryCount: 1,
      remainderMs: 400,
      progress: 400 / CHAPTER_DURATION_MS,
    });
    expect(advanceElapsed(11_750, 24_750, CHAPTER_DURATION_MS)).toEqual({
      boundaryCount: 3,
      remainderMs: 500,
      progress: 500 / CHAPTER_DURATION_MS,
    });
  });

  it("treats invalid or negative elapsed input safely", () => {
    expect(advanceElapsed(500, -1_000, CHAPTER_DURATION_MS)).toEqual({
      boundaryCount: 0,
      remainderMs: 500,
      progress: 500 / CHAPTER_DURATION_MS,
    });
    expect(advanceElapsed(0, 500, 0)).toEqual({ boundaryCount: 0, remainderMs: 0, progress: 0 });
  });

  it("maps named phase windows with clamped easing output", () => {
    expect(mapPhase(0.1, [0.2, 0.8], "linear")).toBe(0);
    expect(mapPhase(0.5, [0.2, 0.8], "linear")).toBeCloseTo(0.5);
    expect(mapPhase(0.8, [0.2, 0.8], "paperFold")).toBe(1);
    expect(mapPhase(0.5, [0.2, 0.8], "softInOut")).toBeCloseTo(0.5);
    expect(mapPhase(0.5, [0.2, 0.8], "liquidRise")).toBeGreaterThan(0.5);
    expect(mapPhase(0.5, [0.2, 0.8], "petalSnap")).toBeGreaterThan(0);
    expect(mapPhase(0.5, [0.2, 0.8], "thermalBrake")).toBeGreaterThan(0.5);
    expect(mapPhase(0.5, [0.2, 0.8], "paperFold")).toBeCloseTo(0.25);
    expect(mapPhase(0.5, [0.8, 0.2], "linear")).toBe(0);
  });

  it("includes both calm-window endpoints", () => {
    expect(isWithinWindow(0.12, [0.12, 0.28])).toBe(true);
    expect(isWithinWindow(0.28, [0.12, 0.28])).toBe(true);
    expect(isWithinWindow(0.2801, [0.12, 0.28])).toBe(false);
    expect(isWithinWindow(0.2, [0.8, 0.2])).toBe(false);
  });
});

describe("browserClock", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("delegates frame and timer scheduling and exposes deterministic cleanup", () => {
    const frame = vi.fn(() => 17);
    const cancelFrame = vi.fn();
    const timer = vi.fn(() => 23);
    const clearTimer = vi.fn();
    vi.stubGlobal("window", {
      requestAnimationFrame: frame,
      cancelAnimationFrame: cancelFrame,
      setTimeout: timer,
      clearTimeout: clearTimer,
    });
    const onFrame = vi.fn();
    const onTimer = vi.fn();

    expect(browserClock.requestFrame(onFrame)).toBe(17);
    expect(browserClock.setTimer(onTimer, OPENING_HOLD_MS)).toBe(23);
    browserClock.cancelFrame(17);
    browserClock.clearTimer(23);

    expect(frame).toHaveBeenCalledWith(onFrame);
    expect(timer).toHaveBeenCalledWith(onTimer, 300);
    expect(cancelFrame).toHaveBeenCalledWith(17);
    expect(clearTimer).toHaveBeenCalledWith(23);
  });

  it("is safe to import and call without browser scheduling globals", () => {
    vi.stubGlobal("window", undefined);
    expect(browserClock.requestFrame(vi.fn())).toBe(-1);
    expect(browserClock.setTimer(vi.fn(), 10)).toBe(-1);
    expect(() => browserClock.cancelFrame(-1)).not.toThrow();
    expect(() => browserClock.clearTimer(-1)).not.toThrow();
  });
});
