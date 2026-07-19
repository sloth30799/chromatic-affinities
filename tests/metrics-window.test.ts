import { describe, expect, it } from "vitest";
import {
  METRICS_SCHEMA_VERSION,
  METRIC_WINDOW_MS,
  ROLLING_WINDOW_MS,
  ROLLING_WINDOW_STEP_MS,
  evaluateRuntimeMetrics,
  rollingWindowCount,
  type RuntimeMetricProbe,
} from "../e2e/metrics";
import { CHAPTER_DURATION_MS } from "@/lib/timeline";

function sixtyHertzSamples(startMs: number, durationMs: number) {
  return Array.from({ length: Math.floor(durationMs / (1_000 / 60)) }, (_, index) => startMs + index * (1_000 / 60));
}

function probeWithWindow(raf: number[], longTasks: RuntimeMetricProbe["longTasks"] = []): RuntimeMetricProbe {
  return {
    schemaVersion: METRICS_SCHEMA_VERSION,
    raf,
    longTasks,
    measurementWindow: {
      resetAt: 3_000,
      startedAt: 10_000,
      endsAt: 10_000 + METRIC_WINDOW_MS,
      stoppedAt: 10_000 + METRIC_WINDOW_MS + ROLLING_WINDOW_STEP_MS,
      durationMs: METRIC_WINDOW_MS,
      state: "stopped",
    },
  };
}

describe("evidence metric windows", () => {
  it("covers the declared twelve-second chapter interval from its explicit boundary", () => {
    const start = 10_000;
    const result = evaluateRuntimeMetrics(probeWithWindow([
      start - ROLLING_WINDOW_STEP_MS,
      ...sixtyHertzSamples(start, METRIC_WINDOW_MS),
      start + METRIC_WINDOW_MS,
    ]));

    expect(result.measurementWindowValid).toBe(true);
    expect(METRIC_WINDOW_MS).toBe(CHAPTER_DURATION_MS);
    expect(result.rollingWindows).toHaveLength(rollingWindowCount(METRIC_WINDOW_MS));
    expect(result.rollingWindows[0]).toMatchObject({ startMs: 0 });
    expect(result.rollingWindows[result.rollingWindows.length - 1]).toMatchObject({
      startMs: METRIC_WINDOW_MS - ROLLING_WINDOW_MS,
    });
    expect(result.rafSamples).toBeGreaterThanOrEqual(Math.floor(METRIC_WINDOW_MS / (1_000 / 60)) - 1);
    expect(result.minRafSamples).toBeGreaterThanOrEqual(50);
    expect(result.pass).toBe(true);
  });

  it("fails a sparse final rolling window instead of trimming it from the gate", () => {
    const start = 10_000;
    const raf = sixtyHertzSamples(start, METRIC_WINDOW_MS - ROLLING_WINDOW_MS);
    const result = evaluateRuntimeMetrics(probeWithWindow(raf));

    expect(result.rollingWindows[result.rollingWindows.length - 1]).toEqual({
      startMs: METRIC_WINDOW_MS - ROLLING_WINDOW_MS,
      samples: 0,
    });
    expect(result.minRafSamples).toBe(0);
    expect(result.pass).toBe(false);
  });

  it("excludes pre-window long tasks even if they are present in an input payload", () => {
    const start = 10_000;
    const result = evaluateRuntimeMetrics(probeWithWindow(sixtyHertzSamples(start, METRIC_WINDOW_MS), [
      { startTime: start - 1, duration: 500 },
      { startTime: start + 500, duration: 75 },
    ]));

    expect(result.longTasks).toEqual([{ startTime: start + 500, duration: 75 }]);
    expect(result.longTasksOver50).toBe(1);
    expect(result.longTasksOver100).toBe(0);
    expect(result.pass).toBe(true);
  });
});
