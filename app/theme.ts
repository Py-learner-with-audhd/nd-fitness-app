// Shared design tokens — dark, HUD/terminal-coded. One dominant neon (cyan)
// used consistently for anything actionable/selected, a secondary magenta
// reserved for celebration moments (PR/level-up) only, so it stays a signal
// and doesn't turn into visual noise. Deliberately not glow-everywhere —
// the brief flagged real gym sensory overwhelm as a risk, so restraint here
// is a legibility choice, not a style compromise.

export const colors = {
  bg: '#0a0a12',
  surface: '#13131f',
  surfaceMuted: '#1a1a2c',
  border: '#2a2a42',
  borderStrong: '#3d3d5e',

  ink: '#eef0ff',
  inkMuted: '#8d8db2',
  inkFaint: '#5a5a7c',

  accent: '#00e5ff',
  accentInk: '#03181a',
  accentSoft: '#0e2b30',

  celebrate: '#ff2ec4',
  celebrateSoft: '#2b0e26',

  error: '#ff5470',
  errorSoft: '#2b0f16',
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const mono = { fontFamily: 'monospace' } as const;

export const type = {
  kicker: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2, color: colors.inkMuted, textTransform: 'uppercase' as const },
  title: { fontSize: 26, fontWeight: '800' as const, color: colors.ink },
  subtitle: { fontSize: 18, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 16, color: colors.ink },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.inkMuted },
  small: { fontSize: 13, color: colors.inkMuted },
};

// Subtle neon glow for primary CTAs only — not applied broadly, so it still
// reads as emphasis rather than becoming the default look of everything.
export const glow = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius: 10,
  elevation: 6,
});
