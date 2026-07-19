import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  accent: string;
  accentText: string;
  green: string;
  greenDark: string;
  greenSoft: string;
  tan: string;
  tanSoft: string;
  info: string;
  infoSoft: string;
  infoText: string;
}

/**
 * The "Hers." palette: editorial wellness — deep forest green, warm tan,
 * cream surfaces on white. Works in light and dark mode.
 */
export const palette: { light: Palette; dark: Palette } = {
  light: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F2E9',
    text: '#2B2A26',
    textSecondary: '#6E6A5E',
    textTertiary: '#A8A395',
    border: '#ECE8DC',
    accent: '#33502F',
    accentText: '#FFFFFF',
    green: '#33502F',
    greenDark: '#243B22',
    greenSoft: '#E5EAE0',
    tan: '#A99A6B',
    tanSoft: '#E9E3D0',
    info: '#3F6F8F',
    infoSoft: '#E6EFF4',
    infoText: '#2A4F66',
  },
  dark: {
    bg: '#14160F',
    surface: '#1C1E15',
    surfaceAlt: '#24271B',
    text: '#F0EFE6',
    textSecondary: '#B0AE9D',
    textTertiary: '#7C7A6A',
    border: '#2E3124',
    accent: '#5C8A54',
    accentText: '#0E120B',
    green: '#5C8A54',
    greenDark: '#33502F',
    greenSoft: '#26321F',
    tan: '#C3B486',
    tanSoft: '#2C2C20',
    info: '#7FB0CE',
    infoSoft: '#1C2730',
    infoText: '#BBD6E6',
  },
};

// ── Accent palettes (user-selectable in Settings) ──────────────────────────

export type Appearance = 'system' | 'light' | 'dark';

export interface AccentTheme {
  key: string;
  label: string;
  primary: string;
  secondary: string;
}

export const THEMES: AccentTheme[] = [
  { key: 'forest', label: 'Forest', primary: '#33502F', secondary: '#A99A6B' },
  { key: 'rose', label: 'Rose', primary: '#9B4A6B', secondary: '#CD9AAB' },
  { key: 'lavender', label: 'Lavender', primary: '#5E5286', secondary: '#A99AC9' },
  { key: 'ocean', label: 'Ocean', primary: '#2E6066', secondary: '#86AEB2' },
  { key: 'clay', label: 'Clay', primary: '#B05A3C', secondary: '#CBA98D' },
];

function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function mix(hex: string, target: string, amt: number): string {
  const a = parseHex(hex);
  const b = parseHex(target);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amt));
  return '#' + c.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}

type Accents = Pick<
  Palette,
  'accent' | 'accentText' | 'green' | 'greenDark' | 'greenSoft' | 'tan' | 'tanSoft'
>;

export function buildAccents(primary: string, secondary: string, scheme: 'light' | 'dark'): Accents {
  if (scheme === 'dark') {
    const green = mix(primary, '#FFFFFF', 0.32);
    return {
      accent: green,
      accentText: '#12140D',
      green,
      greenDark: primary,
      greenSoft: mix(primary, '#14160F', 0.72),
      tan: mix(secondary, '#FFFFFF', 0.12),
      tanSoft: mix(secondary, '#14160F', 0.78),
    };
  }
  return {
    accent: primary,
    accentText: '#FFFFFF',
    green: primary,
    greenDark: mix(primary, '#000000', 0.22),
    greenSoft: mix(primary, '#FFFFFF', 0.86),
    tan: secondary,
    tanSoft: mix(secondary, '#FFFFFF', 0.7),
  };
}

export interface SettingsValue {
  themeKey: string;
  appearance: Appearance;
  ready: boolean;
  settingsOpen: boolean;
  setThemeKey: (k: string) => void;
  setAppearance: (a: Appearance) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const SettingsContext = createContext<SettingsValue>({
  themeKey: 'forest',
  appearance: 'system',
  ready: false,
  settingsOpen: false,
  setThemeKey: () => {},
  setAppearance: () => {},
  openSettings: () => {},
  closeSettings: () => {},
});

export function useTheme(): Palette {
  const { themeKey, appearance } = useContext(SettingsContext);
  const system = useColorScheme();
  const scheme: 'light' | 'dark' =
    appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const base = palette[scheme];
  const theme = THEMES.find((t) => t.key === themeKey) ?? THEMES[0];
  return { ...base, ...buildAccents(theme.primary, theme.secondary, scheme) };
}

export const fonts = {
  /** Rounded display font for headings & big numbers (cute, friendly). */
  display: 'Fredoka_600SemiBold',
  heading: 'Fredoka_500Medium',
  /** Rounded body font. */
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  /** Back-compat alias — existing heading styles pick up the cute display font. */
  serif: 'Fredoka_600SemiBold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export type MoodKey = 'great' | 'good' | 'okay' | 'low' | 'rough';

export interface Mood {
  key: MoodKey;
  label: string;
  icon: string;
  color: string;
}

export const MOODS: Mood[] = [
  { key: 'great', label: 'Great', icon: 'emoticon-excited-outline', color: '#1D9E75' },
  { key: 'good', label: 'Good', icon: 'emoticon-happy-outline', color: '#7FB069' },
  { key: 'okay', label: 'Okay', icon: 'emoticon-neutral-outline', color: '#E0A458' },
  { key: 'low', label: 'Low', icon: 'emoticon-sad-outline', color: '#D77A61' },
  { key: 'rough', label: 'Rough', icon: 'emoticon-cry-outline', color: '#B5546E' },
];

export function moodByKey(key: MoodKey | null): Mood | undefined {
  if (!key) return undefined;
  return MOODS.find((m) => m.key === key);
}
