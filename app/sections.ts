// Purely presentational grouping of the fixed 18-slot template (schema.ts)
// into body-part sections, so the walk-through feels organized ("Legs 2 of
// 5") instead of one flat undifferentiated count ("Exercise 7 of 18"). Not
// stored in the DB — slot names are the stable key, computed client-side.

export const SECTION_ORDER = ['Legs', 'Back', 'Chest', 'Arms', 'Shoulders', 'Core'] as const;
export type Section = (typeof SECTION_ORDER)[number];

const SLOT_TO_SECTION: Record<string, Section> = {
  Squat: 'Legs',
  'Squat Isolation': 'Legs',
  Hinge: 'Legs',
  'Hinge Isolation': 'Legs',
  Calves: 'Legs',
  'Vertical Pull': 'Back',
  'Horizontal Pull': 'Back',
  'Horizontal Push (Chest)': 'Chest',
  'Horizontal Push Isolation': 'Chest',
  'Arms - Biceps 1': 'Arms',
  'Arms - Biceps 2': 'Arms',
  'Arms - Triceps 1': 'Arms',
  'Arms - Triceps 2': 'Arms',
  'Vertical Push (Shoulder)': 'Shoulders',
  'Vertical Push Isolation': 'Shoulders',
  'Core - Rotation': 'Core',
  'Core - Crunch': 'Core',
  'Core - Oblique': 'Core',
};

export function sectionForSlotName(slotName: string): Section {
  return SLOT_TO_SECTION[slotName] ?? 'Core';
}
