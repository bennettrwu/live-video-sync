import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { EngineView } from '@live-video-sync/sync-engine';

import { StatusOverlay } from '#src/components/player/status-overlay.js';
import { render } from '#tests/utils/render.js';

function viewWith(overrides: Partial<EngineView>): EngineView {
  return {
    phase: 'playing',
    controlsEnabled: true,
    name: 'me',
    connectionId: 'c0',
    room: { code: 'abc', name: 'Room' },
    media: [],
    currentMediaId: null,
    members: [],
    stalledMembers: [],
    waiting: false,
    log: [],
    debug: { drift: 0, rtt: null, offset: null, rate: 1, seq: 0 },
    ...overrides,
  };
}

describe('StatusOverlay', () => {
  it('renders nothing while playing', () => {
    // Act
    const { container } = render(
      <StatusOverlay view={viewWith({})} onGestureTap={vi.fn()} />,
    );

    // Assert
    expect(container.querySelectorAll(':not(style)')).toHaveLength(0);
  });

  it('names who everyone is waiting for', () => {
    // Arrange
    const stalled = [
      { connectionId: 'c1', name: 'Bob', stalledSince: 1 },
      { connectionId: 'c2', name: 'Cy', stalledSince: 1 },
    ];

    // Act
    render(
      <StatusOverlay
        view={viewWith({ phase: 'waitingForOthers', stalledMembers: stalled })}
        onGestureTap={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText('Waiting for Bob and Cy…')).toBeInTheDocument();
  });

  it('offers a tap-to-play button when a gesture is needed', () => {
    // Arrange
    const onGestureTap = vi.fn();
    render(
      <StatusOverlay
        view={viewWith({ phase: 'needsGesture' })}
        onGestureTap={onGestureTap}
      />,
    );

    // Act
    screen.getByRole('button', { name: /tap to play/i }).click();

    // Assert
    expect(onGestureTap).toHaveBeenCalledOnce();
  });
});
