import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING = 24;

// Re-validated for the dark HUD surface (dataviz method requires re-checking
// a chart color against a new surface, not an automatic carry-over). Reusing
// the UI accent here is deliberate, not a shortcut — it's still one hue
// doing one job (single series, no legend needed), and a second "chart-only"
// color would just be visual noise on top of an already-neon UI.
const LINE_COLOR = colors.accent;
const GRIDLINE_COLOR = colors.border;
const MUTED_TEXT = colors.inkMuted;
const PRIMARY_TEXT = colors.ink;

// Rounds a max value up to a "clean" step (per dataviz mark spec: round axis
// ticks to clean numbers rather than the raw data max).
function niceMax(value: number): number {
  if (value <= 0) return 10;
  const step = value <= 50 ? 5 : value <= 200 ? 20 : 50;
  return Math.ceil(value / step) * step;
}

export default function ProgressChart({
  title,
  points,
}: {
  title: string;
  points: { date: string; maxWeight: number }[];
}) {
  if (points.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.emptyText}>
          Log this one a couple more times to see a progress chart.
        </Text>
      </View>
    );
  }

  const yMax = niceMax(Math.max(...points.map((p) => p.maxWeight)));
  const yMin = 0;
  const plotWidth = CHART_WIDTH - PADDING * 2;
  const plotHeight = CHART_HEIGHT - PADDING * 2;

  const xFor = (i: number) => PADDING + (i / (points.length - 1)) * plotWidth;
  const yFor = (weight: number) =>
    PADDING + plotHeight - ((weight - yMin) / (yMax - yMin)) * plotHeight;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.maxWeight)}`)
    .join(' ');

  const last = points[points.length - 1];
  const lastX = xFor(points.length - 1);
  const lastY = yFor(last.maxWeight);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* gridlines: 0, mid, max */}
        {[yMin, yMax / 2, yMax].map((v) => (
          <Line
            key={v}
            x1={PADDING}
            x2={CHART_WIDTH - PADDING}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke={GRIDLINE_COLOR}
            strokeWidth={1}
          />
        ))}
        <SvgText x={4} y={yFor(yMax) + 4} fontSize={11} fill={MUTED_TEXT}>
          {yMax}
        </SvgText>
        <SvgText x={4} y={yFor(yMin) + 4} fontSize={11} fill={MUTED_TEXT}>
          0
        </SvgText>

        <Path
          d={linePath}
          stroke={LINE_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* end marker with surface ring, plus a direct label — only the endpoint is labeled */}
        <Circle cx={lastX} cy={lastY} r={6} fill={colors.bg} />
        <Circle cx={lastX} cy={lastY} r={4} fill={LINE_COLOR} />
        <SvgText
          x={Math.min(lastX, CHART_WIDTH - 40)}
          y={lastY - 10}
          fontSize={12}
          fontWeight="600"
          fill={PRIMARY_TEXT}
          textAnchor="middle"
        >
          {last.maxWeight}kg
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
});
