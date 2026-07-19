"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { chapters, exhibitionDataValidation } from "@/data/exhibition";
import { browserClock } from "@/lib/clock";
import {
  initialPlaybackState,
  playbackReducer,
  selectCanPlay,
  selectPlaybackStatus,
  type FocusRequest,
  type PlaybackEvent,
  type RuntimeFault,
} from "@/lib/playback";
import { useExhibitionTestControls, createTestClock } from "@/hooks/useExhibitionTestControls";
import { useOpeningHold } from "@/hooks/useOpeningHold";
import { usePlaybackTimeline } from "@/hooks/usePlaybackTimeline";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AffinityStage } from "./AffinityStage";
import { ExhibitionNav } from "./ExhibitionNav";
import { FieldNoteIndex } from "./FieldNoteIndex";
import { PlaybackControls } from "./PlaybackControls";
import { RuntimeFaultFallback } from "./RuntimeFaultFallback";
import { RouteEntryFocus } from "@/components/campaign/RouteEntryFocus";

export function ExhibitionUnavailable() {
  return (
    <main className="exhibition-unavailable" role="status">
      <p className="exhibition-unavailable__eyebrow">Chromatic Affinities</p>
      <h1>This exhibition is temporarily unavailable.</h1>
      <p>Please reload to try the opening composition again.</p>
    </main>
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    "a, button, input, select, textarea, summary, [contenteditable='true'], [role='button'], [role='link'], [role='textbox']",
  ));
}

function chapterFocus(index: number): FocusRequest {
  const chapter = chapters[((index % chapters.length) + chapters.length) % chapters.length];
  return chapter ? { kind: "chapterHeading", chapterId: chapter.id } : { kind: "none" };
}

function ExhibitionRuntime() {
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);
  const renderCount = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const resolvedPreferenceRef = useRef(false);
  const [testClock] = useState<ReturnType<typeof createTestClock> | null>(() => (
    process.env.NEXT_PUBLIC_CA_TEST_MODE === "1" ? createTestClock() : null
  ));
  const clock = testClock ?? browserClock;

  useEffect(() => {
    document.documentElement.classList.add("exhibition-document");
    document.body.classList.add("exhibition-route");
    return () => {
      document.documentElement.classList.remove("exhibition-document");
      document.body.classList.remove("exhibition-route");
    };
  }, []);

  useEffect(() => {
    renderCount.current += 1;
  });
  const getRenderCount = useCallback(() => renderCount.current, []);

  const motionPreference = useReducedMotion(!state.runtimeFault);
  const reportFault = useCallback((source: RuntimeFault["source"], message: string) => {
    dispatch({ type: "RUNTIME_FAULT", source, message });
  }, []);
  const guarded = useCallback((callback: () => void) => {
    try {
      callback();
    } catch (error) {
      reportFault("event", error instanceof Error ? error.message : "Unable to handle this exhibition control.");
    }
  }, [reportFault]);
  const completeOpening = useCallback(() => dispatch({ type: "OPENING_HOLD_COMPLETE" }), []);

  useEffect(() => {
    if (motionPreference === "unknown" || state.runtimeFault) return;
    dispatch({
      type: resolvedPreferenceRef.current ? "PREFERENCE_CHANGED" : "PREFERENCE_RESOLVED",
      value: motionPreference,
    });
    resolvedPreferenceRef.current = true;
  }, [motionPreference, state.runtimeFault]);

  useEffect(() => {
    if (state.runtimeFault) return;
    const syncVisibility = () => {
      dispatch({ type: "VISIBILITY_CHANGED", hidden: document.visibilityState === "hidden" });
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, [state.runtimeFault]);

  useOpeningHold({
    clock,
    hidden: state.hidden,
    motionPreference: state.motionPreference,
    openingReady: state.openingReady,
    runtimeFaulted: Boolean(state.runtimeFault),
    onComplete: completeOpening,
  });

  const activeChapter = chapters[state.chapterIndex] ?? chapters[0]!;
  const nextChapter = chapters[(state.chapterIndex + 1) % chapters.length] ?? chapters[0]!;
  const playbackStatus = selectPlaybackStatus(state);
  const canPlay = selectCanPlay(state);

  const onBoundary = useCallback(({ count, remainderMs }: { count: number; remainderMs: number }) => {
    const focusedHotspot = document.activeElement instanceof Element
      && Boolean(stageRef.current?.contains(document.activeElement))
      && Boolean(document.activeElement.closest(".object-hotspot"));
    dispatch({ type: "TIMELINE_BOUNDARY", count, remainderMs, ephemeralFocus: focusedHotspot });
  }, []);
  const timelineFault = useCallback(({ source, message }: { source: "frame" | "boundary"; message: string }) => {
    reportFault(source, message);
  }, [reportFault]);

  const { progress, seekForTest } = usePlaybackTimeline({
    durationMs: activeChapter.durationMs,
    motionPreference: state.motionPreference,
    canPlay,
    resetRevision: state.resetRevision,
    initialElapsedMs: state.initialElapsedMs,
    cues: activeChapter.cues,
    clock,
    onBoundary,
    onFault: timelineFault,
    stageRef,
  });

  const safeDispatch = useCallback((event: PlaybackEvent) => guarded(() => dispatch(event)), [guarded]);
  const chooseChapter = useCallback((index: number, focus: FocusRequest) => {
    safeDispatch({ type: "SELECT_CHAPTER", index, focus });
  }, [safeDispatch]);

  useEffect(() => {
    if (state.runtimeFault || state.annotation.kind !== "closed") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return;
      if (isInteractiveTarget(event.target)) return;
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        safeDispatch({ type: "USER_TOGGLE" });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        chooseChapter(state.chapterIndex - 1, chapterFocus(state.chapterIndex - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        chooseChapter(state.chapterIndex + 1, chapterFocus(state.chapterIndex + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chooseChapter, safeDispatch, state.annotation.kind, state.chapterIndex, state.runtimeFault]);

  useEffect(() => {
    if (state.runtimeFault || state.annotation.kind === "closed") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      safeDispatch({ type: "ESCAPE_READING" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [safeDispatch, state.annotation.kind, state.runtimeFault]);

  useEffect(() => {
    if (state.focusRequest.kind === "none") return;
    let target: HTMLElement | null = null;
    if (state.focusRequest.kind === "chapterHeading") {
      target = document.getElementById(`${state.focusRequest.chapterId}-heading`);
    } else if (state.focusRequest.kind === "annotationTrigger") {
      target = document.getElementById(state.focusRequest.triggerId);
      if (!target?.isConnected) target = document.getElementById("field-notes");
    } else if (state.focusRequest.kind === "indexRow") {
      target = document.getElementById(`field-note-row-${state.focusRequest.noteId}`);
    } else if (state.focusRequest.control === "fieldNotes") {
      target = document.getElementById("field-notes");
    } else if (state.focusRequest.control === "chapter") {
      target = document.querySelector<HTMLElement>(`[data-chapter-index='${state.chapterIndex}']`);
    } else {
      target = document.getElementById(`playback-${state.focusRequest.control}`);
    }
    if (target?.isConnected) target.focus();
    dispatch({ type: "FOCUS_CONSUMED" });
  }, [state.chapterIndex, state.focusRequest, state.runtimeFault]);

  useExhibitionTestControls({
    clock: testClock,
    setChapter: (index) => chooseChapter(index, chapterFocus(index)),
    setProgress: (value) => seekForTest?.(value),
    fault: (source) => {
      if (source === "event") {
        guarded(() => {
          throw new Error("Test event fault");
        });
        return;
      }
      reportFault(source, `Test ${source} fault`);
    },
    getRenderCount,
  });

  if (state.runtimeFault) return <RuntimeFaultFallback fault={state.runtimeFault} />;

  return (
    <>
      <RouteEntryFocus targetId="campaign-title" />
      <main
        className="exhibition"
        data-motion-preference={state.motionPreference}
        data-playback-status={playbackStatus}
      >
        <a className="skip-link" href="#playback-controls">Skip to playback controls</a>
        <AffinityStage
          chapter={activeChapter}
          nextChapter={nextChapter}
          stageRef={stageRef}
          progress={progress}
          resetRevision={state.resetRevision}
          motionPreference={state.motionPreference}
          playbackStatus={playbackStatus}
          annotation={state.annotation}
          onOpenNote={(noteId, triggerId) => safeDispatch({
            type: "OPEN_NOTE",
            noteId,
            source: "hotspot",
            triggerId,
          })}
          onDismissReading={() => safeDispatch({ type: "CLOSE_READING" })}
        />
        <ExhibitionNav
          chapters={chapters}
          activeIndex={state.chapterIndex}
          onSelect={(index) => chooseChapter(index, { kind: "persistentControl", control: "chapter" })}
        />
        <PlaybackControls
          status={playbackStatus}
          manuallyPaused={state.manuallyPaused}
          reducedMotion={state.motionPreference === "reduce"}
          reading={state.annotation.kind !== "closed"}
          onToggle={() => safeDispatch({ type: "USER_TOGGLE" })}
          onReplay={() => safeDispatch({ type: "REPLAY", focus: { kind: "persistentControl", control: "replay" } })}
          onPrevious={() => safeDispatch({ type: "PREVIOUS", focus: { kind: "persistentControl", control: "previous" } })}
          onNext={() => safeDispatch({ type: "NEXT", focus: { kind: "persistentControl", control: "next" } })}
        />
        <FieldNoteIndex
          chapter={activeChapter}
          annotation={state.annotation}
          onOpenIndex={(triggerId) => safeDispatch({ type: "OPEN_INDEX", triggerId })}
          onOpenNote={(hotspot, triggerId) => safeDispatch({
            type: "OPEN_NOTE",
            noteId: hotspot.id,
            source: "index",
            triggerId,
          })}
          onDismiss={() => safeDispatch({ type: "CLICK_AWAY_READING" })}
          onBackToIndex={() => safeDispatch({ type: "ESCAPE_READING" })}
        />
      </main>
    </>
  );
}

export function Exhibition() {
  if (!exhibitionDataValidation.valid) return <ExhibitionUnavailable />;
  return <ExhibitionRuntime />;
}
