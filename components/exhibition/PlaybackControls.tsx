"use client";

import type { PlaybackStatus } from "@/lib/playback";

type PlaybackControlsProps = {
  status: PlaybackStatus;
  manuallyPaused: boolean;
  reducedMotion: boolean;
  reading: boolean;
  onToggle: () => void;
  onReplay: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

function statusLabel(status: PlaybackStatus, reducedMotion: boolean, reading: boolean) {
  if (reducedMotion) return "Reduced motion: automatic playback is off";
  if (reading) return "Held for reading";
  if (status === "paused") return "Paused";
  if (status === "held") return "Opening hold";
  return "Playing";
}

export function PlaybackControls({
  status,
  manuallyPaused,
  reducedMotion,
  reading,
  onToggle,
  onReplay,
  onPrevious,
  onNext,
}: PlaybackControlsProps) {
  const disabled = reducedMotion || reading;
  const toggleIsPause = !manuallyPaused;
  const pauseLabel = toggleIsPause ? "Pause exhibition" : "Play exhibition";

  return (
    <section id="playback-controls" className="playback-controls" aria-label="Playback controls">
      <p className="playback-status" aria-live="polite">{statusLabel(status, reducedMotion, reading)}</p>
      <div className="playback-controls__rail">
        <button id="playback-previous" type="button" onClick={onPrevious} aria-label="Previous chapter">
          <span aria-hidden="true">←</span><span className="sr-only">Previous</span>
        </button>
        <button
          id="playback-toggle"
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={pauseLabel}
        >
          <span aria-hidden="true">{toggleIsPause ? "Ⅱ" : "▶"}</span>
        </button>
        <button id="playback-replay" type="button" onClick={onReplay} aria-label="Replay current chapter">
          <span aria-hidden="true">↺</span><span className="sr-only">Replay</span>
        </button>
        <button id="playback-next" type="button" onClick={onNext} aria-label="Next chapter">
          <span aria-hidden="true">→</span><span className="sr-only">Next</span>
        </button>
      </div>
    </section>
  );
}
