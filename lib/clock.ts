export type Clock = {
  now(): number;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  setTimer(callback: () => void, delayMs: number): number;
  clearTimer(id: number): void;
};

export const browserClock: Clock = {
  now() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  },
  requestFrame(callback) {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return -1;
    }
    return window.requestAnimationFrame(callback);
  },
  cancelFrame(id) {
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function" && id >= 0) {
      window.cancelAnimationFrame(id);
    }
  },
  setTimer(callback, delayMs) {
    if (typeof window === "undefined") return -1;
    return window.setTimeout(callback, delayMs);
  },
  clearTimer(id) {
    if (typeof window !== "undefined" && id >= 0) {
      window.clearTimeout(id);
    }
  },
};
