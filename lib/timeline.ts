export const CHAPTER_DURATION_MS = 12_000;
export const CHAPTER_COUNT = 4;
export const EXHIBITION_DURATION_MS = CHAPTER_DURATION_MS * CHAPTER_COUNT;
export const OPENING_HOLD_MS = 300;
export const CUE_ENDPOINTS = {
  establishEnd: 0.06,
  buildEnd: 0.27,
  collisionEnd: 0.55,
  fusionEnd: 0.7,
  restoreEnd: 0.84,
  handoffEnd: 1,
} as const;
export const HANDOFF_START_PROGRESS = CUE_ENDPOINTS.restoreEnd;
export const HANDOFF_DURATION_MS = Math.round(
  CHAPTER_DURATION_MS * (CUE_ENDPOINTS.handoffEnd - HANDOFF_START_PROGRESS),
);

export const EASING_IDS = [
  "linear",
  "softInOut",
  "liquidRise",
  "petalSnap",
  "thermalBrake",
  "paperFold",
] as const;

export type EasingId = (typeof EASING_IDS)[number];
export type PhaseWindow = readonly [number, number];

export type TimelineAdvance = {
  boundaryCount: number;
  remainderMs: number;
  progress: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validDuration(durationMs: number): boolean {
  return Number.isFinite(durationMs) && durationMs > 0;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeElapsed(elapsedMs: number, durationMs: number): number {
  if (!validDuration(durationMs)) return 0;
  return clamp(finiteOr(elapsedMs, 0), 0, durationMs) / durationMs;
}

export function advanceElapsed(
  previousMs: number,
  visibleDeltaMs: number,
  durationMs: number,
): TimelineAdvance {
  if (!validDuration(durationMs)) {
    return { boundaryCount: 0, remainderMs: 0, progress: 0 };
  }

  const previous = clamp(finiteOr(previousMs, 0), 0, durationMs);
  const delta = Math.max(0, finiteOr(visibleDeltaMs, 0));
  const total = previous + delta;
  const boundaryCount = Math.floor(total / durationMs);
  const remainderMs = boundaryCount === 0 ? total : total - boundaryCount * durationMs;

  return {
    boundaryCount,
    remainderMs,
    progress: normalizeElapsed(remainderMs, durationMs),
  };
}

export function isSupportedEasing(value: unknown): value is EasingId {
  return typeof value === "string" && EASING_IDS.includes(value as EasingId);
}

function ease(progress: number, easing: EasingId): number {
  switch (easing) {
    case "linear":
      return progress;
    case "softInOut":
      return progress * progress * (3 - 2 * progress);
    case "liquidRise":
      return 1 - (1 - progress) ** 3;
    case "petalSnap":
      return progress < 0.55
        ? 0.72 * (progress / 0.55) ** 2
        : 0.72 + 0.28 * (1 - (1 - (progress - 0.55) / 0.45) ** 3);
    case "thermalBrake":
      return 1 - (1 - progress) ** 4;
    case "paperFold":
      return progress * progress;
  }
}

export function mapPhase(progress: number, window: PhaseWindow, easing: EasingId = "linear"): number {
  const [start, end] = window;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const mapped = clamp((finiteOr(progress, 0) - start) / (end - start), 0, 1);
  return ease(mapped, easing);
}

export function isWithinWindow(progress: number, window: PhaseWindow): boolean {
  const [start, end] = window;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
  const value = finiteOr(progress, -1);
  return value >= start && value <= end;
}
