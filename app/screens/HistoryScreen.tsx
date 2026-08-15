import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getExercisesForSession, getSessionHistory, getSetsForExerciseInSession } from '../db/queries';
import type { ExerciseInSession, Session, SetEntry } from '../types';

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

      {sessions === null && <Text>Loading...</Text>}
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
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  backLink: {
    fontSize: 15,
    color: '#333',
    textDecorationLine: 'underline',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  empty: {
    color: '#666',
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseList: {
    gap: 10,
  },
  exerciseRow: {
    gap: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
  },
  setLine: {
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
  },
});
