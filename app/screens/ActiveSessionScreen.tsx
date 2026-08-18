import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  addExerciseToSession,
  addSet,
  addVariation,
  getLastSetForVariation,
  getSetsForExerciseInSession,
  getSlotsWithVariations,
} from '../db/queries';
import type { LastSetForVariation, SetEntry, Slot, Variation } from '../types';
import { colors, glow, mono, radius, spacing, type } from '../theme';

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
  onSessionComplete,
}: {
  sessionId: number;
  onSessionComplete: () => void;
}) {
  const db = useSQLiteContext();
  const [slotGroups, setSlotGroups] = useState<SlotGroup[] | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [variationId, setVariationId] = useState<number | null>(null);
  const [exerciseInSessionId, setExerciseInSessionId] = useState<number | null>(null);
  const [lastSet, setLastSet] = useState<LastSetForVariation | null>(null);
  const [loggedSets, setLoggedSets] = useState<SetEntry[]>([]);

  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(8);
  const [rir, setRir] = useState(2);

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    getSlotsWithVariations(db).then((groups) => {
      setSlotGroups(groups);
      const first = groups[0];
      if (first.variations.length === 1) {
        selectVariation(first.variations[0].id, groups, 0);
      }
    });
  }, []);

  async function selectVariation(varId: number, groups: SlotGroup[], idx: number) {
    setVariationId(varId);
    const slot = groups[idx].slot;
    const eisId = await addExerciseToSession(db, sessionId, slot.id, varId, idx);
    setExerciseInSessionId(eisId);
    setLoggedSets([]);
    const last = await getLastSetForVariation(db, varId, sessionId);
    setLastSet(last);
    setWeight(last?.weight ?? 0);
    setReps(last?.reps ?? 8);
    setRir(last ? last.rir : 2);
  }

  async function handleAddCustomVariation() {
    if (!slotGroups) return;
    const name = customName.trim();
    if (!name) return;
    const slot = slotGroups[slotIndex].slot;
    const newId = await addVariation(db, slot.id, name);

    const updatedGroups = slotGroups.map((g, i) =>
      i === slotIndex
        ? { ...g, variations: [...g.variations, { id: newId, slot_id: slot.id, name, is_default: 0 }] }
        : g
    );
    setSlotGroups(updatedGroups);
    setShowCustomInput(false);
    setCustomName('');
    await selectVariation(newId, updatedGroups, slotIndex);
  }

  async function handleAddSet() {
    if (!exerciseInSessionId) return;
    await addSet(db, exerciseInSessionId, weight, reps, rir);
    const sets = await getSetsForExerciseInSession(db, exerciseInSessionId);
    setLoggedSets(sets);
  }

  function goToNextSlot() {
    if (!slotGroups) return;
    const nextIndex = slotIndex + 1;
    if (nextIndex >= slotGroups.length) {
      onSessionComplete();
      return;
    }
    setSlotIndex(nextIndex);
    setVariationId(null);
    setExerciseInSessionId(null);
    setLastSet(null);
    setLoggedSets([]);
    setShowCustomInput(false);
    setCustomName('');
    const nextSlot = slotGroups[nextIndex];
    if (nextSlot.variations.length === 1) {
      selectVariation(nextSlot.variations[0].id, slotGroups, nextIndex);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>
        Exercise {slotIndex + 1} of {slotGroups.length}
      </Text>
      <Text style={styles.slotName}>{current.slot.name}</Text>

      {variationId === null ? (
        <View style={styles.variationPicker}>
          {current.variations.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.variationOption}
              onPress={() => selectVariation(v.id, slotGroups, slotIndex)}
            >
              <Text style={styles.variationOptionText}>{v.name}</Text>
            </TouchableOpacity>
          ))}

          {showCustomInput ? (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Exercise name"
                value={customName}
                onChangeText={setCustomName}
                autoFocus
              />
              <TouchableOpacity
                style={styles.customUseBtn}
                disabled={!customName.trim()}
                onPress={handleAddCustomVariation}
              >
                <Text style={styles.customUseBtnText}>Use this</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.customToggle} onPress={() => setShowCustomInput(true)}>
              <Text style={styles.customToggleText}>+ Type your own</Text>
            </TouchableOpacity>
          )}
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
            <View style={styles.stepperControls}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setWeight((w) => Math.max(0, w - 2.5))}>
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{weight}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setWeight((w) => w + 2.5)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
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
  progress: {
    ...type.kicker,
  },
  slotName: {
    ...type.title,
  },
  variationPicker: {
    gap: spacing.md,
  },
  variationOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  variationOptionText: {
    ...type.body,
    fontWeight: '600',
  },
  customToggle: {
    paddingVertical: spacing.sm,
  },
  customToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
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
