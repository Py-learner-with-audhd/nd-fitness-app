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
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  progress: {
    fontSize: 13,
    color: '#666',
  },
  slotName: {
    fontSize: 24,
    fontWeight: '700',
  },
  variationPicker: {
    gap: 10,
  },
  variationOption: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 16,
  },
  variationOptionText: {
    fontSize: 16,
  },
  customToggle: {
    paddingVertical: 10,
  },
  customToggleText: {
    fontSize: 15,
    color: '#333',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  customUseBtn: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  customUseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseBlock: {
    gap: 14,
  },
  variationName: {
    fontSize: 18,
    fontWeight: '600',
  },
  lastTime: {
    fontSize: 14,
    color: '#555',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 15,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
  },
  stepperValue: {
    fontSize: 18,
    minWidth: 40,
    textAlign: 'center',
  },
  rirRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rirOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  rirOptionSelected: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  rirOptionText: {
    fontSize: 16,
  },
  rirOptionTextSelected: {
    color: '#fff',
  },
  rirHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  addSetBtn: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addSetBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loggedSets: {
    gap: 4,
  },
  loggedSet: {
    fontSize: 14,
    color: '#333',
  },
  nextBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
