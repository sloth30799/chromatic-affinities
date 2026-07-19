import type { Page } from "@playwright/test";
import { CHAPTER_DURATION_MS } from "@/lib/timeline";

export const METRICS_SCHEMA_VERSION = 2;
export const METRIC_WINDOW_MS = CHAPTER_DURATION_MS;
export const ROLLING_WINDOW_MS = 1_000;
export const ROLLING_WINDOW_STEP_MS = 100;

export type LongTaskSample = {
  duration: number;
  startTime: number;
};

export type MeasurementWindow = {
  resetAt: number;
  startedAt: number | null;
  endsAt: number | null;
  stoppedAt: number | null;
  durationMs: number | null;
  state: "idle" | "running" | "stopped";
};

export type RuntimeMetricProbe = {
  schemaVersion: number;
  raf: number[];
  longTasks: LongTaskSample[];
  measurementWindow: MeasurementWindow;
};

type InternalRuntimeMetricProbe = RuntimeMetricProbe & {
  observer?: PerformanceObserver;
  collectLongTasks?: (entries: PerformanceObserverEntryList | PerformanceEntryList) => void;
};

declare global {
  interface Window {
    __CA_EVIDENCE_METRICS__?: InternalRuntimeMetricProbe;
  }
}

function validMeasurementWindow(window: MeasurementWindow, durationMs: number) {
  return Number.isFinite(window.resetAt)
    && Number.isFinite(window.startedAt)
    && Number.isFinite(window.endsAt)
    && Number.isFinite(window.stoppedAt)
    && window.state === "stopped"
    && (window.startedAt ?? Number.NEGATIVE_INFINITY) >= window.resetAt
    && (window.stoppedAt ?? Number.NEGATIVE_INFINITY) >= (window.endsAt ?? Number.POSITIVE_INFINITY)
    && window.durationMs === durationMs
    && Math.abs((window.endsAt ?? 0) - (window.startedAt ?? 0) - durationMs) < 0.001;
}

function inMeasurementWindow(timestamp: number, window: MeasurementWindow) {
  return Number.isFinite(timestamp)
    && Number.isFinite(window.startedAt)
    && Number.isFinite(window.endsAt)
    && timestamp >= (window.startedAt ?? Number.POSITIVE_INFINITY)
    && timestamp < (window.endsAt ?? Number.NEGATIVE_INFINITY);
}

/**
 * Install before navigation. The probe has its own native rAF loop and never
 * substitutes, advances, or otherwise changes the exhibition clock. It starts
 * idle so navigation and setup work cannot enter a measurement result.
 */
export async function installMetricsProbe(page: Page) {
  await page.addInitScript(() => {
    const inMeasurementWindow = (timestamp: number, window: MeasurementWindow) => {
      return Number.isFinite(timestamp)
        && Number.isFinite(window.startedAt)
        && Number.isFinite(window.endsAt)
        && timestamp >= (window.startedAt ?? Number.POSITIVE_INFINITY)
        && timestamp < (window.endsAt ?? Number.NEGATIVE_INFINITY);
    };
    const now = performance.now();
    const probe: InternalRuntimeMetricProbe = {
      schemaVersion: 2,
      raf: [],
      longTasks: [],
      measurementWindow: {
        resetAt: now,
        startedAt: null,
        endsAt: null,
        stoppedAt: null,
        durationMs: null,
        state: "idle",
      },
    };
    window.__CA_EVIDENCE_METRICS__ = probe;

    const collectLongTasks = (entries: PerformanceObserverEntryList | PerformanceEntryList) => {
      const collected = Array.isArray(entries) ? entries : entries.getEntries();
      for (const entry of collected) {
        if (inMeasurementWindow(entry.startTime, probe.measurementWindow)) {
          probe.longTasks.push({ duration: entry.duration, startTime: entry.startTime });
        }
      }
    };
    probe.collectLongTasks = collectLongTasks;

    const sampleFrame = (timestamp: number) => {
      if (inMeasurementWindow(timestamp, probe.measurementWindow)) probe.raf.push(timestamp);
      window.requestAnimationFrame(sampleFrame);
    };
    window.requestAnimationFrame(sampleFrame);

    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver(collectLongTasks);
        observer.observe({ type: "longtask", buffered: true });
        probe.observer = observer;
      } catch {
        // Engines without Long Task support leave a documented empty list.
      }
    }
  });
}

/** Clear setup samples after the selected visual state has settled. */
export async function resetMetricsProbe(page: Page) {
  await page.evaluate(() => {
    const probe = window.__CA_EVIDENCE_METRICS__;
    if (!probe) throw new Error("Metrics probe is unavailable.");
    probe.raf = [];
    probe.longTasks = [];
    probe.measurementWindow = {
      resetAt: performance.now(),
      startedAt: null,
      endsAt: null,
      stoppedAt: null,
      durationMs: null,
      state: "idle",
    };
  });
}

/** Start one declared interval. Entries outside this half-open interval are ignored. */
export async function startMetricsMeasurement(page: Page, durationMs = METRIC_WINDOW_MS) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error("Metric measurement duration must be a positive finite number.");
  await page.evaluate((requestedDuration) => {
    const probe = window.__CA_EVIDENCE_METRICS__;
    if (!probe) throw new Error("Metrics probe is unavailable.");
    const startedAt = performance.now();
    probe.raf = [];
    probe.longTasks = [];
    probe.measurementWindow = {
      resetAt: probe.measurementWindow.resetAt,
      startedAt,
      endsAt: startedAt + requestedDuration,
      stoppedAt: null,
      durationMs: requestedDuration,
      state: "running",
    };
  }, durationMs);
}

/** Mark collection complete without changing the already-declared interval. */
export async function stopMetricsMeasurement(page: Page) {
  await page.evaluate(() => {
    const probe = window.__CA_EVIDENCE_METRICS__;
    if (!probe) throw new Error("Metrics probe is unavailable.");
    probe.measurementWindow = {
      ...probe.measurementWindow,
      stoppedAt: performance.now(),
      state: "stopped",
    };
  });
}

export async function readMetricsProbe(page: Page): Promise<RuntimeMetricProbe> {
  return page.evaluate((schemaVersion) => {
    const probe = window.__CA_EVIDENCE_METRICS__;
    if (!probe) {
      return {
        schemaVersion,
        raf: [],
        longTasks: [],
        measurementWindow: { resetAt: 0, startedAt: null, endsAt: null, stoppedAt: null, durationMs: null, state: "idle" },
      };
    }
    const pending = probe.observer?.takeRecords();
    if (pending?.length) probe.collectLongTasks?.(pending);
    return {
      schemaVersion: probe.schemaVersion,
      raf: [...probe.raf],
      longTasks: [...probe.longTasks],
      measurementWindow: { ...probe.measurementWindow },
    };
  }, METRICS_SCHEMA_VERSION);
}

export function rollingWindowsForMeasurement(window: MeasurementWindow, durationMs: number) {
  if (!validMeasurementWindow(window, durationMs) || durationMs < ROLLING_WINDOW_MS) return [];
  const start = window.startedAt!;
  const windows: Array<{ startMs: number; samples: number }> = [];
  for (let offset = 0; offset <= durationMs - ROLLING_WINDOW_MS; offset += ROLLING_WINDOW_STEP_MS) {
    windows.push({ startMs: offset, samples: 0 });
  }
  return windows.map((entry) => ({ ...entry, absoluteStart: start + entry.startMs }));
}

export function rollingWindowCount(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < ROLLING_WINDOW_MS) return 0;
  return Math.floor((durationMs - ROLLING_WINDOW_MS) / ROLLING_WINDOW_STEP_MS) + 1;
}

export function evaluateRuntimeMetrics(probe: RuntimeMetricProbe, durationMs = METRIC_WINDOW_MS) {
  const windowValid = probe.schemaVersion === METRICS_SCHEMA_VERSION && validMeasurementWindow(probe.measurementWindow, durationMs);
  const raf = probe.raf
    .filter((timestamp) => inMeasurementWindow(timestamp, probe.measurementWindow))
    .sort((first, second) => first - second);
  const rollingWindows = rollingWindowsForMeasurement(probe.measurementWindow, durationMs).map((entry) => ({
    startMs: entry.startMs,
    samples: raf.filter((timestamp) => timestamp >= entry.absoluteStart && timestamp < entry.absoluteStart + ROLLING_WINDOW_MS).length,
  }));
  const longTasks = probe.longTasks.filter((task) => inMeasurementWindow(task.startTime, probe.measurementWindow));
  const over50 = longTasks.filter((task) => task.duration > 50);
  const over100 = longTasks.filter((task) => task.duration > 100);
  const minRafSamples = rollingWindows.length ? Math.min(...rollingWindows.map((entry) => entry.samples)) : 0;
  return {
    schemaVersion: METRICS_SCHEMA_VERSION,
    durationMs,
    measurementWindow: probe.measurementWindow,
    measurementWindowValid: windowValid,
    rafSamples: raf.length,
    minRafSamples,
    rollingWindows,
    longTasks,
    longTasksOver50: over50.length,
    longTasksOver100: over100.length,
    pass: windowValid && minRafSamples >= 50 && over50.length <= 1 && over100.length === 0,
  };
}
