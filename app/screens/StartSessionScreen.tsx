import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { createSession } from '../db/queries';
import type { CapacityRating } from '../types';

const CAPACITY_OPTIONS: { value: CapacityRating; label: string; suggestedSets: number }[] = [
  { value: 'low', label: 'Low', suggestedSets: 2 },
  { value: 'medium', label: 'Medium', suggestedSets: 3 },
  { value: 'high', label: 'High', suggestedSets: 4 },
];

export default function StartSessionScreen({
  onSessionStarted,
  onViewHistory,
  onViewDashboard,
}: {
  onSessionStarted: (sessionId: number) => void;
  onViewHistory: () => void;
  onViewDashboard: () => void;
}) {
  const db = useSQLiteContext();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(rating: CapacityRating) {
    setStarting(true);
    setError(null);
    try {
      const sessionId = await createSession(db, rating);
      onSessionStarted(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How's your energy today?</Text>
      <View style={styles.options}>
        {CAPACITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.option}
            disabled={starting}
            onPress={() => handleStart(opt.value)}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <Text style={styles.optionSub}>~{opt.suggestedSets} sets/exercise</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.links}>
        <TouchableOpacity onPress={onViewDashboard}>
          <Text style={styles.historyLinkText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewHistory}>
          <Text style={styles.historyLinkText}>View history</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>Error: {error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  options: {
    width: '100%',
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  links: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  historyLinkText: {
    fontSize: 15,
    color: '#333',
    textDecorationLine: 'underline',
  },
  error: {
    color: '#c00',
    fontSize: 13,
    textAlign: 'center',
  },
});
