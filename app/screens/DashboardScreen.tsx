import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getAllSetsForStats,
  getTotalWorkouts,
  getVariationsWithData,
  getWeightHistoryForVariation,
} from '../db/queries';
import { computeXpAndLevel, type XpResult } from '../gamification';
import ProgressChart from '../components/ProgressChart';
import { colors, glow, mono, radius, spacing, type } from '../theme';

type VariationOption = { id: number; name: string; slotName: string };

export default function DashboardScreen({ onBack }: { onBack: () => void }) {
  const db = useSQLiteContext();
  const [totalWorkouts, setTotalWorkouts] = useState<number | null>(null);
  const [totalVolume, setTotalVolume] = useState<number | null>(null);
  const [xp, setXp] = useState<XpResult | null>(null);
  const [variations, setVariations] = useState<VariationOption[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [chartPoints, setChartPoints] = useState<{ date: string; maxWeight: number }[]>([]);

  useEffect(() => {
    (async () => {
      const workouts = await getTotalWorkouts(db);
      setTotalWorkouts(workouts);

      const sets = await getAllSetsForStats(db);
      const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      setTotalVolume(volume);
      setXp(computeXpAndLevel(sets));

      const vars = await getVariationsWithData(db);
      setVariations(vars);
      if (vars.length > 0) {
        setSelectedVariationId(vars[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedVariationId == null) return;
    getWeightHistoryForVariation(db, selectedVariationId).then(setChartPoints);
  }, [selectedVariationId]);

  const selectedVariation = variations.find((v) => v.id === selectedVariationId);
  const xpProgress = xp ? xp.xpIntoLevel / xp.xpForNextLevel : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Dashboard</Text>

      {xp && (
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelBadge}>Level {xp.level}</Text>
            <Text style={styles.levelXpText}>{xp.xpIntoLevel} / {xp.xpForNextLevel} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
          </View>
          {xp.prCount > 0 && (
            <Text style={styles.prLine}>🏆 {xp.prCount} PR{xp.prCount === 1 ? '' : 's'} all-time</Text>
          )}
        </View>
      )}

      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Total workouts</Text>
          <Text style={styles.statValue}>{totalWorkouts ?? '—'}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Total volume</Text>
          <Text style={styles.statValue}>
            {totalVolume != null ? `${Math.round(totalVolume).toLocaleString()}kg` : '—'}
          </Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Total XP</Text>
          <Text style={styles.statValue}>{xp?.totalXp ?? '—'}</Text>
        </View>
      </View>

      {variations.length === 0 ? (
        <Text style={styles.emptyText}>Log a session to start seeing progress here.</Text>
      ) : (
        <View style={styles.chartSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
            {variations.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.pickerChip, v.id === selectedVariationId && styles.pickerChipSelected]}
                onPress={() => setSelectedVariationId(v.id)}
              >
                <Text
                  style={[
                    styles.pickerChipText,
                    v.id === selectedVariationId && styles.pickerChipTextSelected,
                  ]}
                >
                  {v.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedVariation && (
            <ProgressChart title={`${selectedVariation.name} — weight (kg)`} points={chartPoints} />
          )}
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
    gap: spacing.xl,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  title: {
    ...type.title,
  },
  levelCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...glow(colors.accent),
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  levelBadge: {
    ...mono,
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
  },
  levelXpText: {
    ...mono,
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  xpTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  prLine: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.celebrate,
    marginTop: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  statValue: {
    ...mono,
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  chartSection: {
    gap: spacing.lg,
  },
  picker: {
    flexGrow: 0,
  },
  pickerChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
  },
  pickerChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  pickerChipTextSelected: {
    color: colors.accentInk,
  },
});
