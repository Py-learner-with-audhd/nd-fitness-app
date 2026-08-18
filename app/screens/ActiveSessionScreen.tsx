import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  addExerciseToSession,
  addSet,
  findOrCreateVariation,
  getLastSetForVariation,
  getSetsForExerciseInSession,
  getSlotsWithVariations,
} from '../db/queries';
import type { LastSetForVariation, SetEntry, Slot, Variation } from '../types';
import { colors, glow, mono, radius, spacing, type } from '../theme';
import { SECTION_ORDER, sectionForSlotName } from '../sections';
import { clearActiveSession, saveActiveSession } from '../activeSessionStorage';

const RIR_OPTIONS = [
  { value: 5, label: '5', hint: 'Very easy' },
  { value: 4, label: '4', hint: 'Easy' },
  { value: 3, label: '3', hint: 'Moderate' },
  { value: 2, label: '2', hint: 'Hard' },
  { value: 1, label: '1', hint: 'Near max' },
  { value: 0, label: '0', hint: 'Max effort' },
];

type SlotGroup = { slot: Slot; variations: Variation[] };

export default function ActiveSessionScreen({
  sessionId,
  initialSlotIndex = 0,
  onSessionComplete,
}: {
  sessionId: number;
  initialSlotIndex?: number;
  onSessionComplete: () => void;
}) {
  const db = useSQLiteContext();
  const [slotGroups, setSlotGroups] = useState<SlotGroup[] | null>(null);
  const [slotIndex, setSlotIndex] = useState(initialSlotIndex);
  const [variationId, setVariationId] = useState<number | null>(null);
  const [exerciseInSessionId, setExerciseInSessionId] = useState<number | null>(null);
  const [lastSet, setLastSet] = useState<LastSetForVariation | null>(null);
  const [loggedSets, setLoggedSets] = useState<SetEntry[]>([]);

  const [weightText, setWeightText] = useState('0');
  const [reps, setReps] = useState(8);
  const [rir, setRir] = useState(2);

  const [exerciseName, setExerciseName] = useState('');

  function defaultNameFor(group: SlotGroup): string {
    return group.variations.find((v) => v.is_default)?.name ?? '';
  }

  // The 18-slot template's DB order doesn't group by body part (e.g. Calves
  // sits last, far from the other Legs slots) — resequence into the
  // Legs/Back/Chest/Arms/Shoulders/Core walkthrough order requested, so
  // exercises within a section actually run back-to-back.
  function sortBySection(groups: SlotGroup[]): SlotGroup[] {
    return [...groups].sort((a, b) => {
      const sa = SECTION_ORDER.indexOf(sectionForSlotName(a.slot.name));
      const sb = SECTION_ORDER.indexOf(sectionForSlotName(b.slot.name));
      if (sa !== sb) return sa - sb;
      return a.slot.order_index - b.slot.order_index;
    });
  }

  useEffect(() => {
    getSlotsWithVariations(db).then((raw) => {
      const groups = sortBySection(raw);
      setSlotGroups(groups);
      const start = groups[initialSlotIndex] ? initialSlotIndex : 0;
      const first = groups[start];
      if (first.variations.length === 1) {
        selectVariation(first.variations[0].id, groups, start);
      } else {
        setExerciseName(defaultNameFor(first));
      }
    });
  }, []);

  // Persists which session/slot is in progress so a reload (common for a
  // home-screen PWA) resumes instead of silently starting a second session.
  useEffect(() => {
    if (!slotGroups) return;
    saveActiveSession({ sessionId, slotIndex });
  }, [slotGroups, sessionId, slotIndex]);

  async function selectVariation(varId: number, groups: SlotGroup[], idx: number) {
    setVariationId(varId);
    const slot = groups[idx].slot;
    const eisId = await addExerciseToSession(db, sessionId, slot.id, varId, idx);
    setExerciseInSessionId(eisId);
    setLoggedSets([]);
    const last = await getLastSetForVariation(db, varId, sessionId);
    setLastSet(last);
    setWeightText(last ? String(last.weight) : '0');
    setReps(last?.reps ?? 8);
    setRir(last ? last.rir : 2);
  }

  // Reuses an existing variation by name if it matches one already in this
  // slot's pool (so progress history carries over), otherwise creates one.
  async function handleSubmitExercise() {
    if (!slotGroups) return;
    const name = exerciseName.trim();
    if (!name) return;
    const slot = slotGroups[slotIndex].slot;
    const varId = await findOrCreateVariation(db, slot.id, name);

    let groups = slotGroups;
    const alreadyKnown = groups[slotIndex].variations.some((v) => v.id === varId);
    if (!alreadyKnown) {
      groups = groups.map((g, i) =>
        i === slotIndex
          ? { ...g, variations: [...g.variations, { id: varId, slot_id: slot.id, name, is_default: 0 }] }
          : g
      );
      setSlotGroups(groups);
    }
    await selectVariation(varId, groups, slotIndex);
  }

  async function handleAddSet() {
    if (!exerciseInSessionId) return;
    const weightNum = parseFloat(weightText.replace(',', '.'));
    await addSet(db, exerciseInSessionId, isNaN(weightNum) ? 0 : weightNum, reps, rir);
    const sets = await getSetsForExerciseInSession(db, exerciseInSessionId);
    setLoggedSets(sets);
  }

  function goToNextSlot() {
    if (!slotGroups) return;
    const nextIndex = slotIndex + 1;
    if (nextIndex >= slotGroups.length) {
      clearActiveSession();
      onSessionComplete();
      return;
    }
    setSlotIndex(nextIndex);
    setVariationId(null);
    setExerciseInSessionId(null);
    setLastSet(null);
    setLoggedSets([]);
    const nextSlot = slotGroups[nextIndex];
    if (nextSlot.variations.length === 1) {
      selectVariation(nextSlot.variations[0].id, slotGroups, nextIndex);
    } else {
      setExerciseName(defaultNameFor(nextSlot));
    }
  }

  if (!slotGroups) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const current = slotGroups[slotIndex];
  const currentSection = sectionForSlotName(current.slot.name);
  const sectionSlots = slotGroups.filter((g) => sectionForSlotName(g.slot.name) === currentSection);
  const indexInSection = sectionSlots.findIndex((g) => g.slot.id === current.slot.id) + 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionKicker}>{currentSection}</Text>
      <Text style={styles.progress}>
        Exercise {indexInSection} of {sectionSlots.length}
      </Text>
      <Text style={styles.slotName}>{current.slot.name}</Text>

      {variationId === null ? (
        <View style={styles.variationPicker}>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Exercise name"
              placeholderTextColor={colors.inkFaint}
              value={exerciseName}
              onChangeText={setExerciseName}
              onSubmitEditing={handleSubmitExercise}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity
              style={styles.customUseBtn}
              disabled={!exerciseName.trim()}
              onPress={handleSubmitExercise}
            >
              <Text style={styles.customUseBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.exerciseBlock}>
          <Text style={styles.variationName}>
            {current.variations.find((v) => v.id === variationId)?.name}
          </Text>

          <Text style={styles.lastTime}>
            {lastSet
              ? `Last time: ${lastSet.weight}kg x ${lastSet.reps} @ RIR ${lastSet.rir}`
              : 'First time logging this variation'}
          </Text>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.weightInput}
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Reps</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setReps((r) => Math.max(0, r - 1))}>
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{reps}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setReps((r) => r + 1)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.stepperLabel}>
            RIR (reps in reserve — how many more reps you could've done)
          </Text>
          <View style={styles.rirRow}>
            {RIR_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.rirOption, rir === opt.value && styles.rirOptionSelected]}
                onPress={() => setRir(opt.value)}
              >
                <Text style={[styles.rirOptionText, rir === opt.value && styles.rirOptionTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.rirHint}>
            {RIR_OPTIONS.find((o) => o.value === rir)?.hint}
          </Text>

          <TouchableOpacity style={styles.addSetBtn} onPress={handleAddSet}>
            <Text style={styles.addSetBtnText}>Add set</Text>
          </TouchableOpacity>

          {loggedSets.length > 0 && (
            <View style={styles.loggedSets}>
              {loggedSets.map((s, i) => (
                <Text key={s.id} style={styles.loggedSet}>
                  Set {i + 1}: {s.weight}kg x {s.reps} @ RIR {s.rir}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.nextBtn} onPress={goToNextSlot}>
            <Text style={styles.nextBtnText}>
              {slotIndex + 1 >= slotGroups.length ? 'Finish session' : 'Next exercise'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sectionKicker: {
    ...mono,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  progress: {
    ...type.kicker,
    letterSpacing: 0,
    textTransform: 'none',
  },
  slotName: {
    ...type.title,
  },
  variationPicker: {
    gap: spacing.md,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.ink,
  },
  customUseBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  customUseBtnText: {
    color: colors.accentInk,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseBlock: {
    gap: spacing.lg,
  },
  variationName: {
    ...type.subtitle,
  },
  lastTime: {
    ...mono,
    fontSize: 14,
    color: colors.inkMuted,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  stepperLabel: {
    ...type.body,
    fontWeight: '600',
  },
  weightInput: {
    ...mono,
    minWidth: 90,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.accent,
  },
  stepperValue: {
    ...mono,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
    color: colors.accent,
  },
  rirRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rirOption: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  rirOptionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  rirOptionText: {
    ...mono,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  rirOptionTextSelected: {
    color: colors.accentInk,
  },
  rirHint: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  addSetBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...glow(colors.accent),
  },
  addSetBtnText: {
    color: colors.accentInk,
    fontSize: 16,
    fontWeight: '700',
  },
  loggedSets: {
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  loggedSet: {
    ...mono,
    fontSize: 14,
    color: colors.accent,
  },
  nextBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
});
