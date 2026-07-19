import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const EVIDENCE_SCHEMA_VERSION = 7;
export const BASELINE_HEAD = "9a56fe58c286eb7bfb88383950b486e8ae930069";
export const FROZEN_LOCKS = {
  packageLock: "00d24668efb5cfa2d4916598ad607f6ab0c87aa10359879b4b2551e128ca2856",
  pnpmLock: "4264cff4f86600c0bff6125fe08fe11d5c056a7f789a809862366b37486da41f",
  pnpmWorkspace: "541c9f09bf29f96cc27cf1422a7b11e98d8dd4d51575197f00ddb300d2ff1cab",
} as const;

export const evidenceProjects = ["chromium-desktop", "webkit-desktop", "webkit-iphone-15"] as const;
export type EvidenceProject = typeof evidenceProjects[number];

export const evidenceScenes = ["01", "02", "03", "04"] as const;
export const sceneStates = [
  { id: "establish", progress: 0.02 },
  { id: "fusion", progress: 0.62 },
  { id: "handoff", progress: 0.9 },
] as const;

export const routeContracts = {
  "/": {
    entrySelector: "#campaign-title",
    finalSelector: ".campaign-credit",
    rootSelector: "main.exhibition",
    scroll: "locked",
    essentialSelectors: ["#campaign-title", ".campaign-masthead__disclosure", ".campaign-links a", ".playback-controls button", ".field-note-index__trigger", ".exhibition-nav button"],
  },
  "/collection": {
    entrySelector: "#collection-title",
    finalSelector: ".collection-footer",
    rootSelector: "[data-editorial-route]",
    scroll: "document",
    essentialSelectors: ["#collection-title", ".collection-disclosure", "[data-specimen-register]", ".collection-footer a"],
  },
  "/case-study": {
    entrySelector: "#case-study-title",
    finalSelector: "#availability",
    rootSelector: "[data-editorial-route]",
    scroll: "document",
    essentialSelectors: ["#case-study-title", ".case-study-kicker", ".case-system__row", ".availability", ".availability a"],
  },
} as const;

export const focusContracts = [
  { id: "root-playback", route: "/", selector: "#playback-toggle" },
  { id: "root-notes", route: "/", selector: "#field-notes" },
  { id: "root-chapter", route: "/", selector: ".exhibition-nav button" },
  { id: "root-collection-link", route: "/", selector: ".campaign-links a[href='/collection']" },
  { id: "collection-case-study-link", route: "/collection", selector: "a[href='/case-study']" },
  { id: "case-study-availability-link", route: "/case-study", selector: "a[href='#availability']" },
] as const;

export const handoffContracts = [
  { chapter: "01", target: "AC-01-A", crop: { x: 0, y: 0.18, width: 0.22, height: 0.64 } },
  { chapter: "02", target: "AC-02-B", crop: { x: 0.78, y: 0.18, width: 0.22, height: 0.64 } },
  { chapter: "03", target: "AC-03-C", crop: { x: 0.78, y: 0.18, width: 0.22, height: 0.64 } },
  { chapter: "04", target: "AC-04-B", crop: { x: 0.78, y: 0.18, width: 0.22, height: 0.64 } },
] as const;

export type SourceBinding = {
  baselineHead: string;
  head: string;
  trackedDigest: string;
  untrackedManifestDigest: string;
  combinedBinding: string;
  packageLock: string;
  pnpmLock: string;
  pnpmWorkspace: string;
};

function command(root: string, commandName: string, args: string[]) {
  return execFileSync(commandName, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function shellHash(root: string, source: string) {
  return execFileSync("/bin/zsh", ["-lc", source], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** The same three digest commands required at the handoff gate. */
export function currentSourceBinding(root = process.cwd()): SourceBinding {
  const trackedDigest = shellHash(root, "git diff --binary HEAD | shasum -a 256");
  const untrackedManifestDigest = shellHash(root, "git ls-files --others --exclude-standard | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256");
  const combinedBinding = shellHash(root, "{ git diff --binary HEAD; git ls-files --others --exclude-standard | LC_ALL=C sort | xargs shasum -a 256; } | shasum -a 256");
  return {
    baselineHead: BASELINE_HEAD,
    head: command(root, "git", ["rev-parse", "HEAD"]),
    trackedDigest,
    untrackedManifestDigest,
    combinedBinding,
    packageLock: command(root, "shasum", ["-a", "256", "package-lock.json"]).split(/\s+/)[0]!,
    pnpmLock: command(root, "shasum", ["-a", "256", "pnpm-lock.yaml"]).split(/\s+/)[0]!,
    pnpmWorkspace: command(root, "shasum", ["-a", "256", "pnpm-workspace.yaml"]).split(/\s+/)[0]!,
  };
}

export function bindingFailures(binding: SourceBinding, root = process.cwd()) {
  const failures: string[] = [];
  if (binding.baselineHead !== BASELINE_HEAD) failures.push("baseline HEAD mismatch");
  if (binding.packageLock !== FROZEN_LOCKS.packageLock) failures.push("package-lock hash mismatch");
  if (binding.pnpmLock !== FROZEN_LOCKS.pnpmLock) failures.push("pnpm-lock hash mismatch");
  if (binding.pnpmWorkspace !== FROZEN_LOCKS.pnpmWorkspace) failures.push("pnpm-workspace hash mismatch");
  const current = currentSourceBinding(resolve(root));
  for (const key of ["head", "trackedDigest", "untrackedManifestDigest", "combinedBinding", "packageLock", "pnpmLock", "pnpmWorkspace"] as const) {
    if (binding[key] !== current[key]) failures.push(`source binding mismatch: ${key}`);
  }
  return failures;
}

export function manifestText(manifest: unknown) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function ensureManifestShape(value: unknown): asserts value is { schemaVersion: number; binding: SourceBinding; required: Record<string, unknown>; artifacts: Array<Record<string, unknown>> } {
  if (!value || typeof value !== "object") throw new Error("evidence manifest must be an object");
  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== EVIDENCE_SCHEMA_VERSION) throw new Error(`evidence manifest schema must be ${EVIDENCE_SCHEMA_VERSION}`);
  if (!manifest.binding || typeof manifest.binding !== "object") throw new Error("evidence manifest has no source binding");
  if (!manifest.required || typeof manifest.required !== "object") throw new Error("evidence manifest has no required contract");
  if (!Array.isArray(manifest.artifacts)) throw new Error("evidence manifest has no declared artifacts");
}

// Keeps accidental source reads from becoming a hidden behavior of this contract module.
void readFileSync;
