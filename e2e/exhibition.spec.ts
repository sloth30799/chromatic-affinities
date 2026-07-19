import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { testClock } from "./support/test-clock";

async function completeOpening(page: import("@playwright/test").Page) {
  const clock = testClock(page);
  await clock.ready();
  // Let the bounded Strict Mode effect cycle install the opening timer before advancing test time.
  await clock.flushFrame();
  await clock.flushFrame();
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  for (let attempt = 0; attempt < 8 && await page.getByText("Opening hold", { exact: true }).isVisible(); attempt += 1) {
    await clock.flushFrame();
    await clock.advance(300);
    await settleEffects(page);
  }
  await expect(page.getByText("Playing", { exact: true })).toBeVisible();
  return clock;
}

async function settleEffects(page: import("@playwright/test").Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not select a local production port.");
  const { port } = address;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function staticFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? staticFiles(path) : [path];
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Chromatic Affinities" })).toBeVisible();
});

test("holds the opening, then advances deterministically at a chapter boundary", async ({ page }) => {
  const clock = testClock(page);
  await clock.ready();
  await clock.flushFrame();
  await clock.flushFrame();
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await settleEffects(page);

  await clock.advance(299);
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await clock.advance(1);
  await settleEffects(page);
  await expect(page.getByText("Playing", { exact: true })).toBeVisible();

  await settleEffects(page);
  await clock.flushFrame();
  await clock.advance(12_000);
  await clock.flushFrame();
  await clock.flushFrame();
  await expect(page.locator("#moss-orchid-heading")).toBeVisible();
  await expect(page.locator(".affinity-stage")).toHaveCSS("--timeline", "0.0000");
});

test("uses manual intent for the enabled opening-hold toggle", async ({ page }) => {
  const clock = testClock(page);
  await clock.ready();
  await clock.flushFrame();
  await clock.flushFrame();
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await settleEffects(page);

  await page.getByRole("button", { name: "Pause exhibition" }).click();
  await expect(page.getByRole("button", { name: "Play exhibition" })).toBeVisible();
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await clock.advance(300);
  await settleEffects(page);
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();

  await page.reload();
  await clock.ready();
  await clock.flushFrame();
  await clock.flushFrame();
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await settleEffects(page);
  await page.getByRole("button", { name: "Pause exhibition" }).click();
  await page.getByRole("button", { name: "Play exhibition" }).click();
  await expect(page.getByRole("button", { name: "Pause exhibition" })).toBeVisible();
  await clock.advance(299);
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await clock.advance(1);
  await settleEffects(page);
  await expect(page.getByText("Playing", { exact: true })).toBeVisible();
});

test("plays, pauses, replays, steps chapters, and wraps", async ({ page }) => {
  await completeOpening(page);
  const pause = page.getByRole("button", { name: "Pause exhibition" });
  await pause.click();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay current chapter" }).click();
  await expect(page.getByRole("button", { name: "Replay current chapter" })).toBeFocused();

  await page.getByRole("button", { name: "Previous chapter" }).click();
  await expect(page.locator("#cacao-ivory-heading")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous chapter" })).toBeFocused();
  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(page.locator("#navy-apricot-heading")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next chapter" })).toBeFocused();
  await page.getByRole("button", { name: "Play exhibition" }).click();
  await expect(page.getByText("Playing", { exact: true })).toBeVisible();
});

test("supports chapter navigation and keyboard navigation without stealing interactive control keys", async ({ page }) => {
  await completeOpening(page);
  const chapterThree = page.getByRole("button", { name: "Go to chapter 03: Vermilion Ember and Glacier Cyan" });
  await chapterThree.click();
  const emberGlacierHeading = page.locator("#ember-glacier-heading");
  await expect(emberGlacierHeading).toBeVisible();
  await expect(emberGlacierHeading).toHaveText("Vermilion Ember↔Glacier Cyan");
  await expect(chapterThree).toBeFocused();

  const fieldNotes = page.getByRole("button", { name: /Material notes/ });
  await fieldNotes.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#ember-glacier-heading")).toBeVisible();
  await expect(fieldNotes).toBeFocused();

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#cacao-ivory-heading")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#navy-apricot-heading")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
});

test("covers material-note index and hotspot note paths with focus restoration", async ({ page }) => {
  const clock = await completeOpening(page);
  const notes = page.getByRole("button", { name: /Material notes/ });
  await notes.click();
  const cobaltRow = page.getByRole("button", { name: /Cobalt Glaze Tile/ });
  await expect(cobaltRow).toBeFocused();
  await cobaltRow.click();
  await expect(page.getByRole("note", { name: "Cobalt Glaze Tile" })).toContainText("Cobalt Glaze Tile");
  await page.keyboard.press("Escape");
  await expect(cobaltRow).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(notes).toBeFocused();

  const hotspot = page.locator("#hotspot-navy-apricot-raven-feather");
  await clock.setProgress(0.5);
  await expect(hotspot).toHaveAttribute("tabindex", "-1");
  await clock.setProgress(0.2);
  await expect(hotspot).toHaveAttribute("tabindex", "0");
  const exposedHotspot = page.getByRole("button", { name: "Discover Cobalt Glaze Tile" });
  await expect(exposedHotspot).toBeVisible();
  await exposedHotspot.click();
  await expect(page.getByRole("note", { name: "Cobalt Glaze Tile" })).toBeVisible();
  await page.getByRole("button", { name: "Close note about Cobalt Glaze Tile" }).click();
  await expect(hotspot).toBeFocused();
});

test("holds for reduced motion without automatic advance", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const clock = testClock(page);
  await clock.ready();
  await expect(page.getByText("Reduced motion: automatic playback is off", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play exhibition" })).toBeDisabled();
  await clock.advance(24_000);
  await clock.flushFrame();
  await expect(page.locator("#navy-apricot-heading")).toBeVisible();
});

test("pauses opening while hidden, then resumes and survives resize, orientation, and reload", async ({ page }) => {
  const clock = testClock(page);
  const exhibition = page.locator("main.exhibition");
  await clock.ready();
  await clock.flushFrame();
  await clock.flushFrame();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(exhibition).toHaveAttribute("data-playback-status", "held");
  await settleEffects(page);
  await clock.advance(1_000);
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(exhibition).toHaveAttribute("data-playback-status", "held");
  await settleEffects(page);
  await clock.advance(299);
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
  await clock.advance(1);
  await expect(page.getByText("Playing", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole("heading", { name: "Chromatic Affinities" })).toBeVisible();
  await page.reload();
  await testClock(page).ready();
  await expect(page.getByText("Opening hold", { exact: true })).toBeVisible();
});

for (const source of ["render", "frame", "boundary", "event"] as const) {
  test(`fails safely for injected ${source} faults and recovers by reload`, async ({ page }) => {
    const clock = await completeOpening(page);
    await clock.fault(source);
    await expect(page.locator("main.exhibition-unavailable[role='alert']")).toContainText("The exhibition has paused safely.");
    await expect(page.getByText(`Runtime fault: ${source}.`, { exact: true })).toBeAttached();
    await page.getByRole("button", { name: "Reload exhibition" }).click();
    await testClock(page).ready();
    await expect(page.getByRole("heading", { name: "Chromatic Affinities" })).toBeVisible();
  });
}

test("keeps test-mode safe-area inset at zero except for the explicit WebKit edge helper", async ({ page, browserName }) => {
  const clock = testClock(page);
  await clock.ready();
  const safeAreaInset = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--safe-area-test").trim());
  await expect.poll(safeAreaInset).toBe("0px");

  if (browserName !== "webkit") return;
  await clock.setSafeAreaInset(32);
  await expect.poll(safeAreaInset).toBe("32px");
  await clock.setSafeAreaInset(0);
  await expect.poll(safeAreaInset).toBe("0px");
});

test("production output omits the test bridge and keeps it absent during normal keyboard use", async ({ browserName }) => {
  test.setTimeout(90_000);
  test.skip(browserName !== "chromium", "The production build is shared; interaction coverage runs in both browser projects.");
  execFileSync("npm", ["run", "build"], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_PUBLIC_CA_TEST_MODE: "" },
    stdio: "pipe",
  });
  const staticBundle = staticFiles(join(process.cwd(), ".next", "static"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  expect(staticBundle).not.toContain("__CA_TEST__");

  const port = await freePort();
  const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_PUBLIC_CA_TEST_MODE: "" },
    stdio: "pipe",
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out starting the production server.")), 30_000);
      server.once("error", reject);
      server.stdout?.on("data", (chunk) => {
        if (String(chunk).includes("Ready")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    const page = await (await import("@playwright/test")).chromium.launch().then(async (browser) => {
      const context = await browser.newContext();
      const opened = await context.newPage();
      await opened.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => {
          const probe = window as unknown as { __CA_DOM_CONTENT_LOADED__?: number; __CA_FIRST_MOTION__?: number };
          probe.__CA_DOM_CONTENT_LOADED__ = performance.now();
          const observeFirstMotion = () => {
            const stage = document.querySelector<HTMLElement>(".affinity-stage");
            if (stage && Number.parseFloat(getComputedStyle(stage).getPropertyValue("--timeline")) > 0) {
              probe.__CA_FIRST_MOTION__ ??= performance.now();
              return;
            }
            requestAnimationFrame(observeFirstMotion);
          };
          requestAnimationFrame(observeFirstMotion);
        }, { once: true });
      });
      return { browser, context, page: opened };
    });
    try {
      await page.page.goto(`http://127.0.0.1:${port}`);
      await expect(page.page.getByRole("heading", { name: "Chromatic Affinities" })).toBeVisible();
      expect(await page.page.evaluate(() => "__CA_TEST__" in window)).toBe(false);
      await page.page.waitForFunction(() => Number.isFinite((window as unknown as { __CA_FIRST_MOTION__?: number }).__CA_FIRST_MOTION__), { timeout: 1_500 });
      const firstMotionMs = await page.page.evaluate(() => {
        const timing = window as unknown as { __CA_DOM_CONTENT_LOADED__?: number; __CA_FIRST_MOTION__?: number };
        return (timing.__CA_FIRST_MOTION__ ?? Number.POSITIVE_INFINITY) - (timing.__CA_DOM_CONTENT_LOADED__ ?? Number.NEGATIVE_INFINITY);
      });
      expect(firstMotionMs).toBeLessThan(1_000);
      await page.page.locator("body").focus();
      await page.page.keyboard.press("ArrowRight");
      expect(await page.page.evaluate(() => "__CA_TEST__" in window)).toBe(false);
    } finally {
      await page.context.close();
      await page.browser.close();
    }
  } finally {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
});
