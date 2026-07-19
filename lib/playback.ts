import { chapters } from "@/data/exhibition";
import { CHAPTER_COUNT } from "@/lib/timeline";

export type MotionPreference = "unknown" | "reduce" | "no-preference";
export type HoldReason = "annotation" | "visibility" | "preference" | "opening" | "fault";
export type PlaybackStatus = "playing" | "paused" | "held";

export type FocusRequest =
  | { kind: "none" }
  | { kind: "chapterHeading"; chapterId: string }
  | { kind: "persistentControl"; control: "fieldNotes" | "replay" | "previous" | "next" | "chapter" }
  | { kind: "annotationTrigger"; triggerId: string }
  | { kind: "indexRow"; noteId: string };

export type AnnotationState =
  | { kind: "closed" }
  | { kind: "index"; triggerId: string }
  | { kind: "note"; noteId: string; source: "hotspot" | "index"; triggerId: string };

export type RuntimeFault = {
  source: "render" | "frame" | "boundary" | "event";
  message: string;
};

export type PlaybackState = {
  chapterIndex: number;
  resetRevision: number;
  initialElapsedMs: number;
  manuallyPaused: boolean;
  motionPreference: MotionPreference;
  openingReady: boolean;
  hidden: boolean;
  annotation: AnnotationState;
  focusRequest: FocusRequest;
  runtimeFault: RuntimeFault | null;
};

export type PlaybackEvent =
  | { type: "PREFERENCE_RESOLVED"; value: "reduce" | "no-preference" }
  | { type: "PREFERENCE_CHANGED"; value: "reduce" | "no-preference" }
  | { type: "OPENING_HOLD_COMPLETE" }
  | { type: "USER_TOGGLE" }
  | { type: "SELECT_CHAPTER"; index: number; focus: FocusRequest }
  | { type: "REPLAY"; focus: FocusRequest }
  | { type: "PREVIOUS" | "NEXT"; focus: FocusRequest }
  | { type: "TIMELINE_BOUNDARY"; count: number; remainderMs: number; ephemeralFocus: boolean }
  | { type: "OPEN_INDEX"; triggerId: string }
  | { type: "OPEN_NOTE"; noteId: string; source: "hotspot" | "index"; triggerId: string }
  | { type: "CLOSE_READING" | "ESCAPE_READING" | "CLICK_AWAY_READING" }
  | { type: "VISIBILITY_CHANGED"; hidden: boolean }
  | { type: "RUNTIME_FAULT"; source: RuntimeFault["source"]; message: string }
  | { type: "FOCUS_CONSUMED" };

export const initialPlaybackState: PlaybackState = {
  chapterIndex: 0,
  resetRevision: 0,
  initialElapsedMs: 0,
  manuallyPaused: false,
  motionPreference: "unknown",
  openingReady: false,
  hidden: false,
  annotation: { kind: "closed" },
  focusRequest: { kind: "none" },
  runtimeFault: null,
};

function wrapChapterIndex(index: number): number {
  const wholeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((wholeIndex % CHAPTER_COUNT) + CHAPTER_COUNT) % CHAPTER_COUNT;
}

function firstNoteFocus(chapterIndex: number): FocusRequest {
  const noteId = chapters[chapterIndex]?.hotspots[0]?.id;
  return noteId ? { kind: "indexRow", noteId } : { kind: "none" };
}

function resetChapter(
  state: PlaybackState,
  chapterIndex: number,
  initialElapsedMs: number,
  focusRequest: FocusRequest,
): PlaybackState {
  return {
    ...state,
    chapterIndex: wrapChapterIndex(chapterIndex),
    resetRevision: state.resetRevision + 1,
    initialElapsedMs: Math.max(0, Number.isFinite(initialElapsedMs) ? initialElapsedMs : 0),
    annotation: { kind: "closed" },
    focusRequest,
  };
}

function closeReading(state: PlaybackState, event: PlaybackEvent["type"]): PlaybackState {
  const { annotation } = state;
  if (annotation.kind === "closed") return state;

  if (annotation.kind === "index") {
    return {
      ...state,
      annotation: { kind: "closed" },
      focusRequest: { kind: "persistentControl", control: "fieldNotes" },
    };
  }

  if (annotation.source === "index" && event !== "CLICK_AWAY_READING") {
    return {
      ...state,
      annotation: { kind: "index", triggerId: annotation.triggerId },
      focusRequest: { kind: "indexRow", noteId: annotation.noteId },
    };
  }

  return {
    ...state,
    annotation: { kind: "closed" },
    focusRequest: annotation.source === "hotspot"
      ? { kind: "annotationTrigger", triggerId: annotation.triggerId }
      : { kind: "persistentControl", control: "fieldNotes" },
  };
}

export function playbackReducer(state: PlaybackState, event: PlaybackEvent): PlaybackState {
  if (state.runtimeFault && event.type !== "FOCUS_CONSUMED") return state;

  switch (event.type) {
    case "PREFERENCE_RESOLVED":
      return {
        ...state,
        motionPreference: event.value,
        manuallyPaused: event.value === "reduce" ? true : state.manuallyPaused,
        openingReady: event.value === "reduce",
      };
    case "PREFERENCE_CHANGED":
      return {
        ...state,
        motionPreference: event.value,
        manuallyPaused: event.value === "reduce" ? true : state.manuallyPaused,
        openingReady: event.value === "reduce" ? true : state.openingReady,
      };
    case "OPENING_HOLD_COMPLETE":
      return state.motionPreference === "no-preference"
        ? { ...state, openingReady: true }
        : state;
    case "USER_TOGGLE":
      return state.annotation.kind !== "closed" || state.motionPreference === "reduce"
        ? state
        : { ...state, manuallyPaused: !state.manuallyPaused };
    case "SELECT_CHAPTER":
      return resetChapter(state, event.index, 0, event.focus);
    case "REPLAY":
      return resetChapter(state, state.chapterIndex, 0, event.focus);
    case "PREVIOUS":
      return resetChapter(state, state.chapterIndex - 1, 0, event.focus);
    case "NEXT":
      return resetChapter(state, state.chapterIndex + 1, 0, event.focus);
    case "TIMELINE_BOUNDARY": {
      if (!Number.isFinite(event.count) || event.count <= 0) return state;
      const count = Math.trunc(event.count);
      return {
        ...resetChapter(state, state.chapterIndex + count, event.remainderMs, event.ephemeralFocus
          ? { kind: "persistentControl", control: "fieldNotes" }
          : { kind: "none" }),
        annotation: event.ephemeralFocus ? { kind: "closed" } : state.annotation,
      };
    }
    case "OPEN_INDEX":
      return {
        ...state,
        annotation: { kind: "index", triggerId: event.triggerId },
        focusRequest: firstNoteFocus(state.chapterIndex),
      };
    case "OPEN_NOTE":
      return {
        ...state,
        annotation: {
          kind: "note",
          noteId: event.noteId,
          source: event.source,
          triggerId: event.triggerId,
        },
        focusRequest: { kind: "none" },
      };
    case "CLOSE_READING":
    case "ESCAPE_READING":
    case "CLICK_AWAY_READING":
      return closeReading(state, event.type);
    case "VISIBILITY_CHANGED":
      return state.hidden === event.hidden ? state : { ...state, hidden: event.hidden };
    case "RUNTIME_FAULT":
      return {
        ...state,
        manuallyPaused: true,
        focusRequest: { kind: "none" },
        runtimeFault: { source: event.source, message: event.message },
      };
    case "FOCUS_CONSUMED":
      return state.focusRequest.kind === "none" ? state : { ...state, focusRequest: { kind: "none" } };
  }
}

export function selectHoldReasons(state: PlaybackState): readonly HoldReason[] {
  const holds: HoldReason[] = [];
  if (state.annotation.kind !== "closed") holds.push("annotation");
  if (state.hidden) holds.push("visibility");
  if (state.motionPreference !== "no-preference") holds.push("preference");
  if (!state.openingReady) holds.push("opening");
  if (state.runtimeFault) holds.push("fault");
  return holds;
}

export function selectPlaybackStatus(state: PlaybackState): PlaybackStatus {
  if (selectHoldReasons(state).length > 0) return "held";
  return state.manuallyPaused ? "paused" : "playing";
}

export function selectCanPlay(state: PlaybackState): boolean {
  return selectPlaybackStatus(state) === "playing";
}
