// Points/level + streak logic. Deliberately computed live from sets/sessions
// on every read rather than stored — avoids ever having a stale counter that
// silently stops updating (see the CoachedByEmmet CRM's streak_weeks bug,
// which was exactly that: a stored column nothing ever recomputed).

const XP_PER_SET = 10;
const XP_PER_PR = 50;
const XP_PER_LEVEL = 500;

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

/** Consecutive weeks (Mon-Sun, local time) with at least one logged session. */
export function computeStreakWeeks(sessions: { date: string }[]): number {
  if (sessions.length === 0) return 0;
  const weekSet = new Set(sessions.map((s) => mondayOf(localDateKey(s.date))));
  const weeks = Array.from(weekSet).sort().reverse();

  const today = localDateKey(new Date().toISOString());
  const currentMonday = mondayOf(today);
  const now = new Date();
  const prevWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const prevMonday = mondayOf(localDateKey(prevWeek.toISOString()));

  if (weeks[0] !== currentMonday && weeks[0] !== prevMonday) return 0;

  let streak = 1;
  let [y, m, d] = weeks[0].split('-').map(Number);
  let cursor = new Date(y, m - 1, d);
  for (let i = 1; i < weeks.length; i++) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
    const expected = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (weeks[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export interface XpResult {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  prCount: number;
}

/**
 * XP_PER_SET per logged set, plus a PR bonus the moment a set matches or
 * beats the running max weight for its variation (walked in chronological
 * order so a PR only counts once, the session it actually happened).
 */
export function computeXpAndLevel(
  sets: { variationId: number; weight: number; date: string }[]
): XpResult {
  const runningMax = new Map<number, number>();
  let prCount = 0;
  let totalXp = 0;

  for (const s of sets) {
    totalXp += XP_PER_SET;
    const currentMax = runningMax.get(s.variationId) ?? 0;
    if (s.weight > currentMax) {
      totalXp += XP_PER_PR;
      prCount++;
      runningMax.set(s.variationId, s.weight);
    }
  }

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;

  return { totalXp, level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL, prCount };
}
