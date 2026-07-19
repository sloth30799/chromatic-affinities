import { describe, expect, it } from "vitest";
import {
  initialPlaybackState,
  playbackReducer,
  selectCanPlay,
  selectHoldReasons,
  selectPlaybackStatus,
  type PlaybackEvent,
  type PlaybackState,
} from "@/lib/playback";
import {
  CHAPTER_DURATION_MS,
  EXHIBITION_DURATION_MS,
  OPENING_HOLD_MS,
  advanceElapsed,
} from "@/lib/timeline";

function reduce(events: readonly PlaybackEvent[]): PlaybackState {
  return events.reduce(playbackReducer, initialPlaybackState);
}

const chapterFocus = { kind: "chapterHeading", chapterId: "moss-orchid" } as const;
const controlFocus = { kind: "persistentControl", control: "next" } as const;

describe("playback selectors", () => {
  it("keeps the 300ms opening hold outside the 12-second chapter and 48-second cycle", () => {
    expect(OPENING_HOLD_MS).toBe(300);
    expect(CHAPTER_DURATION_MS * 4).toBe(EXHIBITION_DURATION_MS);
    expect(advanceElapsed(CHAPTER_DURATION_MS - 1, 2, CHAPTER_DURATION_MS)).toEqual({
      boundaryCount: 1,
      remainderMs: 1,
      progress: 1 / CHAPTER_DURATION_MS,
    });
  });

  it("keeps the clock held until preference resolution and opening readiness", () => {
    expect(selectHoldReasons(initialPlaybackState)).toEqual(["preference", "opening"]);
    expect(selectPlaybackStatus(initialPlaybackState)).toBe("held");
    expect(selectCanPlay(initialPlaybackState)).toBe(false);

    const waitingForOpening = reduce([{ type: "PREFERENCE_RESOLVED", value: "no-preference" }]);
    expect(selectHoldReasons(waitingForOpening)).toEqual(["opening"]);
    expect(selectPlaybackStatus(waitingForOpening)).toBe("held");

    const ready = playbackReducer(waitingForOpening, { type: "OPENING_HOLD_COMPLETE" });
    expect(selectHoldReasons(ready)).toEqual([]);
    expect(selectPlaybackStatus(ready)).toBe("playing");
    expect(selectCanPlay(ready)).toBe(true);
  });

  it("keeps opening-hold toggle semantics tied to manual intent", () => {
    const waitingForOpening = reduce([{ type: "PREFERENCE_RESOLVED", value: "no-preference" }]);
    const pausedDuringOpening = playbackReducer(waitingForOpening, { type: "USER_TOGGLE" });
    expect(pausedDuringOpening.manuallyPaused).toBe(true);
    expect(selectPlaybackStatus(pausedDuringOpening)).toBe("held");
    expect(selectCanPlay(pausedDuringOpening)).toBe(false);

    const pausedAfterOpening = playbackReducer(pausedDuringOpening, { type: "OPENING_HOLD_COMPLETE" });
    expect(selectPlaybackStatus(pausedAfterOpening)).toBe("paused");
    expect(selectCanPlay(pausedAfterOpening)).toBe(false);

    const resumedDuringOpening = playbackReducer(pausedDuringOpening, { type: "USER_TOGGLE" });
    expect(resumedDuringOpening.manuallyPaused).toBe(false);
    expect(selectPlaybackStatus(resumedDuringOpening)).toBe("held");
    expect(selectCanPlay(resumedDuringOpening)).toBe(false);

    const resumedAfterOpening = playbackReducer(resumedDuringOpening, { type: "OPENING_HOLD_COMPLETE" });
    expect(selectPlaybackStatus(resumedAfterOpening)).toBe("playing");
    expect(selectCanPlay(resumedAfterOpening)).toBe(true);
  });

  it("distinguishes manual pause from each composable temporary hold", () => {
    const playing = reduce([
      { type: "PREFERENCE_RESOLVED", value: "no-preference" },
      { type: "OPENING_HOLD_COMPLETE" },
    ]);
    const paused = playbackReducer(playing, { type: "USER_TOGGLE" });
    expect(selectPlaybackStatus(paused)).toBe("paused");
    expect(selectCanPlay(paused)).toBe(false);

    const annotation = playbackReducer(playing, { type: "OPEN_INDEX", triggerId: "field-notes" });
    expect(selectHoldReasons(annotation)).toEqual(["annotation"]);
    const hidden = playbackReducer(playing, { type: "VISIBILITY_CHANGED", hidden: true });
    expect(selectHoldReasons(hidden)).toEqual(["visibility"]);
    const reduced = playbackReducer(playing, { type: "PREFERENCE_CHANGED", value: "reduce" });
    expect(selectHoldReasons(reduced)).toEqual(["preference"]);
    const faulted = playbackReducer(playing, { type: "RUNTIME_FAULT", source: "frame", message: "boom" });
    expect(selectHoldReasons(faulted)).toEqual(["fault"]);
  });
});

describe("playback reducer", () => {
  it("preserves manual pause across temporary holds, navigation, and replay", () => {
    const paused = reduce([
      { type: "PREFERENCE_RESOLVED", value: "no-preference" },
      { type: "OPENING_HOLD_COMPLETE" },
      { type: "USER_TOGGLE" },
      { type: "OPEN_NOTE", noteId: "raven-feather", source: "hotspot", triggerId: "raven-button" },
      { type: "CLOSE_READING" },
      { type: "SELECT_CHAPTER", index: 1, focus: chapterFocus },
      { type: "REPLAY", focus: controlFocus },
    ]);

    expect(paused.manuallyPaused).toBe(true);
    expect(paused.annotation).toEqual({ kind: "closed" });
    expect(paused.chapterIndex).toBe(1);
    expect(paused.initialElapsedMs).toBe(0);
    expect(paused.resetRevision).toBe(2);
    expect(paused.focusRequest).toEqual(controlFocus);
  });

  it("handles annotation sources and focus transitions without changing manual intent", () => {
    const playing = reduce([
      { type: "PREFERENCE_RESOLVED", value: "no-preference" },
      { type: "OPENING_HOLD_COMPLETE" },
    ]);
    const index = playbackReducer(playing, { type: "OPEN_INDEX", triggerId: "field-notes" });
    expect(index.annotation).toEqual({ kind: "index", triggerId: "field-notes" });
    expect(index.focusRequest).toEqual({ kind: "indexRow", noteId: "raven-feather" });
    expect(selectCanPlay(index)).toBe(false);

    const indexNote = playbackReducer(index, {
      type: "OPEN_NOTE",
      noteId: "raven-feather",
      source: "index",
      triggerId: "raven-index-row",
    });
    const escapedNote = playbackReducer(indexNote, { type: "ESCAPE_READING" });
    expect(escapedNote.annotation).toEqual({ kind: "index", triggerId: "raven-index-row" });
    expect(escapedNote.focusRequest).toEqual({ kind: "indexRow", noteId: "raven-feather" });
    const closedIndex = playbackReducer(escapedNote, { type: "CLICK_AWAY_READING" });
    expect(closedIndex.annotation).toEqual({ kind: "closed" });
    expect(closedIndex.focusRequest).toEqual({ kind: "persistentControl", control: "fieldNotes" });

    const hotspotNote = playbackReducer(playing, {
      type: "OPEN_NOTE",
      noteId: "raven-feather",
      source: "hotspot",
      triggerId: "raven-button",
    });
    const closedHotspot = playbackReducer(hotspotNote, { type: "CLOSE_READING" });
    expect(closedHotspot.focusRequest).toEqual({ kind: "annotationTrigger", triggerId: "raven-button" });
    expect(playbackReducer(closedHotspot, { type: "FOCUS_CONSUMED" }).focusRequest).toEqual({ kind: "none" });
  });

  it("does not allow a toggle to override reading or reduced-motion holds", () => {
    const reading = reduce([
      { type: "PREFERENCE_RESOLVED", value: "no-preference" },
      { type: "OPENING_HOLD_COMPLETE" },
      { type: "OPEN_INDEX", triggerId: "field-notes" },
    ]);
    expect(playbackReducer(reading, { type: "USER_TOGGLE" })).toBe(reading);

    const reduced = playbackReducer(initialPlaybackState, { type: "PREFERENCE_RESOLVED", value: "reduce" });
    expect(reduced.manuallyPaused).toBe(true);
    expect(reduced.openingReady).toBe(true);
    expect(playbackReducer(reduced, { type: "USER_TOGGLE" })).toBe(reduced);
    const restoredPreference = playbackReducer(reduced, { type: "PREFERENCE_CHANGED", value: "no-preference" });
    expect(restoredPreference.manuallyPaused).toBe(true);
    expect(selectPlaybackStatus(restoredPreference)).toBe("paused");
  });

  it("wraps navigation, resets progress, and carries automatic boundary remainders", () => {
    const ready = reduce([
      { type: "PREFERENCE_RESOLVED", value: "no-preference" },
      { type: "OPENING_HOLD_COMPLETE" },
    ]);
    expect(playbackReducer(ready, { type: "PREVIOUS", focus: controlFocus }).chapterIndex).toBe(3);
    expect(playbackReducer(ready, { type: "SELECT_CHAPTER", index: 5, focus: chapterFocus }).chapterIndex).toBe(1);

    const boundary = playbackReducer(ready, {
      type: "TIMELINE_BOUNDARY",
      count: 6,
      remainderMs: 750,
      ephemeralFocus: true,
    });
    expect(boundary.chapterIndex).toBe(2);
    expect(boundary.resetRevision).toBe(1);
    expect(boundary.initialElapsedMs).toBe(750);
    expect(boundary.annotation).toEqual({ kind: "closed" });
    expect(boundary.focusRequest).toEqual({ kind: "persistentControl", control: "fieldNotes" });
    expect(playbackReducer(ready, {
      type: "TIMELINE_BOUNDARY", count: 0, remainderMs: 100, ephemeralFocus: false,
    })).toBe(ready);
  });

  it("treats runtime faults as terminal state until full-page recovery", () => {
    const ready = reduce([
      { type: "PREFERENCE_RESOLVED", value: "no-preference" },
      { type: "OPENING_HOLD_COMPLETE" },
    ]);
    for (const source of ["render", "frame", "boundary", "event"] as const) {
      const faulted = playbackReducer(ready, { type: "RUNTIME_FAULT", source, message: "callback failed" });
      expect(faulted.runtimeFault).toEqual({ source, message: "callback failed" });
      expect(selectPlaybackStatus(faulted)).toBe("held");
      expect(playbackReducer(faulted, { type: "NEXT", focus: controlFocus })).toBe(faulted);
      expect(playbackReducer(faulted, { type: "RUNTIME_FAULT", source: "event", message: "later" })).toBe(faulted);
    }
  });
});
