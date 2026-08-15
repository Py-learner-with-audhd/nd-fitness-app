import { type SQLiteDatabase } from 'expo-sqlite';

// Full-body session template, in order. See ../../brief.md "Session structure".
// Each slot has a pool of variations; single-entry pools mean no in-session choice.
const SLOTS: { name: string; variations: { name: string; isDefault: boolean }[] }[] = [
  {
    name: 'Squat',
    variations: [
      { name: 'Belt squat', isDefault: true },
      { name: 'Barbell squat', isDefault: false },
      { name: 'Landmine hack squat', isDefault: false },
    ],
  },
  { name: 'Squat Isolation', variations: [{ name: 'Leg extension', isDefault: true }] },
  {
    name: 'Hinge',
    variations: [
      { name: 'RDL', isDefault: true },
      { name: 'Good morning', isDefault: false },
    ],
  },
  {
    name: 'Hinge Isolation',
    variations: [
      { name: 'Cable single-leg hamstring curl', isDefault: true },
      { name: 'Cable kickback', isDefault: false },
      { name: 'Adductor', isDefault: false },
      { name: 'Abductor', isDefault: false },
    ],
  },
  {
    name: 'Vertical Pull',
    variations: [
      { name: 'Lat pulldown machine', isDefault: true },
      { name: 'Band-assisted pull-up', isDefault: false },
    ],
  },
  {
    name: 'Horizontal Pull',
    variations: [
      { name: 'Seated cable row', isDefault: true },
      { name: 'Landmine meadow row (single-arm)', isDefault: false },
    ],
  },
  { name: 'Vertical Push (Shoulder)', variations: [{ name: 'Overhead press', isDefault: true }] },
  {
    name: 'Vertical Push Isolation',
    variations: [{ name: 'Single-arm cuffed cable lateral raise', isDefault: true }],
  },
  {
    name: 'Horizontal Push (Chest)',
    variations: [
      { name: 'Bench press (barbell)', isDefault: true },
      { name: 'Dumbbell bench', isDefault: false },
      { name: 'Cable press', isDefault: false },
    ],
  },
  { name: 'Horizontal Push Isolation', variations: [{ name: 'Flye', isDefault: true }] },
  { name: 'Core - Rotation', variations: [{ name: 'Rotation movement', isDefault: true }] },
  { name: 'Core - Crunch', variations: [{ name: 'Cable crunch', isDefault: true }] },
  { name: 'Core - Oblique', variations: [{ name: 'Cable oblique movement', isDefault: true }] },
  { name: 'Arms - Biceps 1', variations: [{ name: 'Barbell curl', isDefault: true }] },
  { name: 'Arms - Biceps 2', variations: [{ name: 'Hammer curl', isDefault: true }] },
  { name: 'Arms - Triceps 1', variations: [{ name: 'Pushdown', isDefault: true }] },
  { name: 'Arms - Triceps 2', variations: [{ name: 'Overhead extension', isDefault: true }] },
  { name: 'Calves', variations: [{ name: 'Calf raise', isDefault: true }] },
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentDbVersion = result?.user_version ?? 0;
  if (currentDbVersion >= 1) return;

  await db.execAsync(`
    CREATE TABLE slots (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE variations (
      id INTEGER PRIMARY KEY NOT NULL,
      slot_id INTEGER NOT NULL REFERENCES slots(id),
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      capacity_rating TEXT NOT NULL,
      notes TEXT,
      user_id INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE exercises_in_session (
      id INTEGER PRIMARY KEY NOT NULL,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      slot_id INTEGER NOT NULL REFERENCES slots(id),
      variation_id INTEGER NOT NULL REFERENCES variations(id),
      order_index INTEGER NOT NULL
    );

    CREATE TABLE sets (
      id INTEGER PRIMARY KEY NOT NULL,
      exercise_in_session_id INTEGER NOT NULL REFERENCES exercises_in_session(id),
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      rir INTEGER NOT NULL,
      user_id INTEGER NOT NULL DEFAULT 1
    );
  `);

  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    const slotResult = await db.runAsync(
      'INSERT INTO slots (name, order_index) VALUES (?, ?)',
      slot.name,
      i
    );
    const slotId = slotResult.lastInsertRowId;
    for (const v of slot.variations) {
      await db.runAsync(
        'INSERT INTO variations (slot_id, name, is_default) VALUES (?, ?, ?)',
        slotId,
        v.name,
        v.isDefault ? 1 : 0
      );
    }
  }

  await db.execAsync('PRAGMA user_version = 1');
}
