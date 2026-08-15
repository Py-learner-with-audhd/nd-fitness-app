import { type SQLiteDatabase } from 'expo-sqlite';
import type {
  CapacityRating,
  ExerciseInSession,
  LastSetForVariation,
  Session,
  SetEntry,
  Slot,
  Variation,
} from '../types';

export async function getSlotsWithVariations(
  db: SQLiteDatabase
): Promise<{ slot: Slot; variations: Variation[] }[]> {
  const slots = await db.getAllAsync<Slot>('SELECT * FROM slots ORDER BY order_index');
  const out: { slot: Slot; variations: Variation[] }[] = [];
  for (const slot of slots) {
    const variations = await db.getAllAsync<Variation>(
      'SELECT * FROM variations WHERE slot_id = ? ORDER BY is_default DESC, id',
      slot.id
    );
    out.push({ slot, variations });
  }
  return out;
}

export async function createSession(
  db: SQLiteDatabase,
  capacityRating: CapacityRating
): Promise<number> {
  const date = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO sessions (date, capacity_rating) VALUES (?, ?)',
    date,
    capacityRating
  );
  return result.lastInsertRowId;
}

export async function addExerciseToSession(
  db: SQLiteDatabase,
  sessionId: number,
  slotId: number,
  variationId: number,
  orderIndex: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO exercises_in_session (session_id, slot_id, variation_id, order_index) VALUES (?, ?, ?, ?)',
    sessionId,
    slotId,
    variationId,
    orderIndex
  );
  return result.lastInsertRowId;
}

export async function addSet(
  db: SQLiteDatabase,
  exerciseInSessionId: number,
  weight: number,
  reps: number,
  rir: number
): Promise<void> {
  await db.runAsync(
    'INSERT INTO sets (exercise_in_session_id, weight, reps, rir) VALUES (?, ?, ?, ?)',
    exerciseInSessionId,
    weight,
    reps,
    rir
  );
}

export async function getSetsForExerciseInSession(
  db: SQLiteDatabase,
  exerciseInSessionId: number
): Promise<SetEntry[]> {
  return db.getAllAsync<SetEntry>(
    'SELECT * FROM sets WHERE exercise_in_session_id = ? ORDER BY id',
    exerciseInSessionId
  );
}

// Last time this specific variation was logged, regardless of which session.
// Deliberately filtered by variation_id, not slot_id — load doesn't translate
// between different variations of the same movement pattern.
export async function getLastSetForVariation(
  db: SQLiteDatabase,
  variationId: number,
  beforeSessionId: number
): Promise<LastSetForVariation | null> {
  const row = await db.getFirstAsync<LastSetForVariation>(
    `SELECT s.weight, s.reps, s.rir, sess.date
     FROM sets s
     JOIN exercises_in_session eis ON eis.id = s.exercise_in_session_id
     JOIN sessions sess ON sess.id = eis.session_id
     WHERE eis.variation_id = ? AND eis.session_id != ?
     ORDER BY sess.date DESC, s.id DESC
     LIMIT 1`,
    variationId,
    beforeSessionId
  );
  return row ?? null;
}

export async function getSessionHistory(db: SQLiteDatabase): Promise<Session[]> {
  return db.getAllAsync<Session>('SELECT * FROM sessions ORDER BY date DESC');
}

export async function getExercisesForSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<(ExerciseInSession & { slot_name: string; variation_name: string })[]> {
  return db.getAllAsync(
    `SELECT eis.*, sl.name as slot_name, v.name as variation_name
     FROM exercises_in_session eis
     JOIN slots sl ON sl.id = eis.slot_id
     JOIN variations v ON v.id = eis.variation_id
     WHERE eis.session_id = ?
     ORDER BY eis.order_index`,
    sessionId
  );
}

export async function getTotalWorkouts(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions');
  return row?.count ?? 0;
}

// All logged sets with enough context to compute dashboard stats in JS —
// simpler and more maintainable than a window-function query for this data volume.
export async function getAllSetsForStats(
  db: SQLiteDatabase
): Promise<{ variationId: number; weight: number; reps: number; date: string }[]> {
  return db.getAllAsync(
    `SELECT eis.variation_id as variationId, s.weight, s.reps, sess.date
     FROM sets s
     JOIN exercises_in_session eis ON eis.id = s.exercise_in_session_id
     JOIN sessions sess ON sess.id = eis.session_id
     ORDER BY sess.date ASC, s.id ASC`
  );
}

export async function getVariationsWithData(
  db: SQLiteDatabase
): Promise<{ id: number; name: string; slotName: string }[]> {
  return db.getAllAsync(
    `SELECT DISTINCT v.id, v.name, sl.name as slotName
     FROM variations v
     JOIN slots sl ON sl.id = v.slot_id
     JOIN exercises_in_session eis ON eis.variation_id = v.id
     JOIN sets s ON s.exercise_in_session_id = eis.id
     ORDER BY sl.order_index, v.id`
  );
}

export async function getWeightHistoryForVariation(
  db: SQLiteDatabase,
  variationId: number
): Promise<{ date: string; maxWeight: number }[]> {
  return db.getAllAsync(
    `SELECT sess.date as date, MAX(s.weight) as maxWeight
     FROM sets s
     JOIN exercises_in_session eis ON eis.id = s.exercise_in_session_id
     JOIN sessions sess ON sess.id = eis.session_id
     WHERE eis.variation_id = ?
     GROUP BY sess.id
     ORDER BY sess.date ASC`,
    variationId
  );
}
