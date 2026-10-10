import { useState } from 'react';

import classes from './seek-bar.module.css';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  buffered: [number, number][];
  disabled: boolean;
  onSeek: (time: number) => void;
}

/**
 * Scrubbable progress bar. Dragging previews locally; the seek is sent once
 * on release so a drag is one intent, not hundreds.
 */
export function SeekBar({
  currentTime,
  duration,
  buffered,
  disabled,
  onSeek,
}: SeekBarProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const shown = dragging ?? currentTime;
  const percent = (seconds: number) =>
    total > 0 ? Math.min(100, (seconds / total) * 100) : 0;

  return (
    <div className={classes['track']} role="presentation">
      {buffered.map(([start, end]) => (
        <div
          key={start}
          className={classes['buffered']}
          style={{
            left: `${String(percent(start))}%`,
            width: `${String(percent(end) - percent(start))}%`,
          }}
        />
      ))}
      <div
        className={classes['played']}
        style={{ width: `${String(percent(shown))}%` }}
      />
      <input
        className={classes['input']}
        type="range"
        aria-label="Seek"
        min={0}
        max={total}
        step={0.1}
        value={shown}
        disabled={disabled || total === 0}
        onChange={(e) => {
          setDragging(Number(e.currentTarget.value));
        }}
        onPointerUp={() => {
          commit();
        }}
        onKeyUp={() => {
          commit();
        }}
        onBlur={() => {
          setDragging(null);
        }}
      />
    </div>
  );

  function commit() {
    if (dragging === null) return;
    onSeek(dragging);
    setDragging(null);
  }
}
