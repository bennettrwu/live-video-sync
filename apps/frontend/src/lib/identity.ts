const NAME_KEY = 'live-video-sync.name';

/** The display name remembered from a previous join, if any. */
export function loadName(): string | null {
  try {
    const name = localStorage.getItem(NAME_KEY);
    return name !== null && name.trim() !== '' ? name : null;
  } catch {
    return null;
  }
}

/** Remembers the display name for the next visit. */
export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    // Private mode or blocked storage: the name simply is not remembered.
  }
}
