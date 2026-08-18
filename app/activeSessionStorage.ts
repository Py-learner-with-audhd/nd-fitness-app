// Persists which session/slot you're mid-workout on, so a page reload (very
// common for a home-screen PWA — iOS in particular reloads backgrounded web
// views) resumes instead of silently starting a second `sessions` row for
// what you think of as one workout. Deliberately just localStorage rather
// than the full offline-first PWA setup the brief explicitly deferred —
// this is the lightweight fix for the specific failure mode, not a rebuild.

const KEY = 'nd-fitness-active-session';

export interface ActiveSessionState {
  sessionId: number;
  slotIndex: number;
}

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function saveActiveSession(state: ActiveSessionState): void {
  if (!storageAvailable()) return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadActiveSession(): ActiveSessionState | null {
  if (!storageAvailable()) return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.sessionId === 'number' && typeof parsed.slotIndex === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(KEY);
}
