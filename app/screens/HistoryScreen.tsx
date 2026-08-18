import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getExercisesForSession, getSessionHistory, getSetsForExerciseInSession } from '../db/queries';
import type { ExerciseInSession, Session, SetEntry } from '../types';
import { colors, mono, radius, spacing, type } from '../theme';

type ExerciseWithNames = ExerciseInSession & { slot_name: string; variation_name: string };

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const db = useSQLiteContext();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithNames[]>([]);
  const [setsByExercise, setSetsByExercise] = useState<Record<number, SetEntry[]>>({});

  useEffect(() => {
    getSessionHistory(db).then(setSessions);
  }, []);

  async function toggleExpand(sessionId: number) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    const ex = await getExercisesForSession(db, sessionId);
    setExercises(ex);
    const setsMap: Record<number, SetEntry[]> = {};
    for (const e of ex) {
      setsMap[e.id] = await getSetsForExerciseInSession(db, e.id);
    }
    setSetsByExercise(setsMap);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>History</Text>

      {sessions === null && <Text style={styles.empty}>Loading...</Text>}
      {sessions !== null && sessions.length === 0 && (
        <Text style={styles.empty}>No sessions logged yet.</Text>
      )}

      {sessions?.map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <TouchableOpacity onPress={() => toggleExpand(session.id)}>
            <Text style={styles.sessionDate}>
              {new Date(session.date).toLocaleDateString()} — {session.capacity_rating} energy
            </Text>
          </TouchableOpacity>

          {expandedId === session.id && (
            <View style={styles.exerciseList}>
              {exercises.map((e) => (
                <View key={e.id} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>
                    {e.slot_name}: {e.variation_name}
                  </Text>
                  {(setsByExercise[e.id] ?? []).map((s, i) => (
                    <Text key={s.id} style={styles.setLine}>
                      Set {i + 1}: {s.weight}kg x {s.reps} @ RIR {s.rir}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
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
  backLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  title: {
    ...type.title,
  },
  empty: {
    color: colors.inkMuted,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sessionDate: {
    ...mono,
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseRow: {
    gap: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  setLine: {
    ...mono,
    fontSize: 13,
    color: colors.inkMuted,
    marginLeft: spacing.sm,
  },
});
