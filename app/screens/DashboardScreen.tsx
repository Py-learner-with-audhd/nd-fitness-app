import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getAllSetsForStats,
  getTotalWorkouts,
  getVariationsWithData,
  getWeightHistoryForVariation,
} from '../db/queries';
import ProgressChart from '../components/ProgressChart';

type VariationOption = { id: number; name: string; slotName: string };

export default function DashboardScreen({ onBack }: { onBack: () => void }) {
  const db = useSQLiteContext();
  const [totalWorkouts, setTotalWorkouts] = useState<number | null>(null);
  const [totalVolume, setTotalVolume] = useState<number | null>(null);
  const [prCount, setPrCount] = useState<number | null>(null);
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

      const byVariation = new Map<number, typeof sets>();
      for (const s of sets) {
        const list = byVariation.get(s.variationId) ?? [];
        list.push(s);
        byVariation.set(s.variationId, list);
      }
      let prs = 0;
      for (const varSets of byVariation.values()) {
        const maxWeight = Math.max(...varSets.map((s) => s.weight));
        const latest = varSets[varSets.length - 1];
        if (latest.weight >= maxWeight) prs++;
      }
      setPrCount(prs);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Dashboard</Text>

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
          <Text style={styles.statLabel}>Current PRs</Text>
          <Text style={styles.statValue}>{prCount ?? '—'}</Text>
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
    backgroundColor: '#fff',
    padding: 24,
    gap: 20,
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
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e0d9',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#52514e',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0b0b0b',
  },
  emptyText: {
    fontSize: 14,
    color: '#52514e',
  },
  chartSection: {
    gap: 16,
  },
  picker: {
    flexGrow: 0,
  },
  pickerChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  pickerChipSelected: {
    backgroundColor: '#0b0b0b',
    borderColor: '#0b0b0b',
  },
  pickerChipText: {
    fontSize: 13,
    color: '#0b0b0b',
  },
  pickerChipTextSelected: {
    color: '#fff',
  },
});
