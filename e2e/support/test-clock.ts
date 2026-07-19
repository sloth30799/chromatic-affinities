import type { Page } from "@playwright/test";

export type FaultSource = "render" | "frame" | "boundary" | "event";

type ExhibitionTestBridge = {
  setChapter(index: number): void;
  setProgress(progress: number): void;
  advance(milliseconds: number): void;
  flushFrame(): void;
  fault(source: FaultSource): void;
  setSafeAreaInset(px: number): void;
  getRenderCount(): number;
};

const bridgeKey = "__CA_TEST__";

export class TestClock {
  constructor(private readonly page: Page) {}

  async ready() {
    await this.page.waitForFunction((key) => Boolean((window as unknown as Record<string, unknown>)[key]), bridgeKey);
  }

  async available() {
    return this.page.evaluate((key) => key in window, bridgeKey);
  }

  async setChapter(index: number) {
    await this.call("setChapter", index);
  }

  async setProgress(progress: number) {
    await this.call("setProgress", progress);
  }

  async advance(milliseconds: number) {
    await this.call("advance", milliseconds);
  }

  async flushFrame() {
    await this.call("flushFrame");
  }

  async fault(source: FaultSource) {
    await this.call("fault", source);
  }

  async setSafeAreaInset(px: number) {
    await this.call("setSafeAreaInset", px);
  }

  async renderCount() {
    return this.call<number>("getRenderCount");
  }

  private async call<T = void>(method: keyof ExhibitionTestBridge, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(({ key, method, args }) => {
      const bridge = (window as unknown as Record<string, unknown>)[key] as ExhibitionTestBridge | undefined;
      if (!bridge) throw new Error("Chromatic Affinities test bridge is unavailable.");
      return (bridge[method] as (...values: unknown[]) => T)(...args);
    }, { key: bridgeKey, method, args });
  }
}

export function testClock(page: Page) {
  return new TestClock(page);
}
