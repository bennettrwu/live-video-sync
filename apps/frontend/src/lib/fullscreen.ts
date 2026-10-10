/** Whether any element is currently fullscreen. */
export function isFullscreen(): boolean {
  return document.fullscreenElement !== null;
}

/**
 * Toggles fullscreen on an element. Resolves once the browser has switched;
 * rejects if the browser refuses (e.g. not from a user gesture).
 */
export async function toggleFullscreen(element: HTMLElement): Promise<void> {
  if (isFullscreen()) {
    await document.exitFullscreen();
  } else {
    await element.requestFullscreen();
  }
}
