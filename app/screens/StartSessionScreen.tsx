import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { createSession, getSessionHistory } from '../db/queries';
import { computeStreakWeeks } from '../gamification';
import type { CapacityRating } from '../types';
import { colors, glow, mono, radius, spacing, type } from '../theme';

const CAPACITY_OPTIONS: { value: CapacityRating; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
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
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    getSessionHistory(db).then((sessions) => setStreak(computeStreakWeeks(sessions)));
  }, []);

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
      {streak !== null && streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>🔥 {streak} week{streak === 1 ? '' : 's'} in a row</Text>
        </View>
      )}
      <Text style={styles.title}>Are you ready, Emmet?</Text>
      <View style={styles.options}>
        {CAPACITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.option}
            disabled={starting}
            onPress={() => handleStart(opt.value)}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
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
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  streakBadge: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...glow(colors.accent),
  },
  streakBadgeText: {
    ...mono,
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  title: {
    ...type.title,
    textAlign: 'center',
  },
  options: {
    width: '100%',
    gap: spacing.md,
  },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  links: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  historyLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
});
