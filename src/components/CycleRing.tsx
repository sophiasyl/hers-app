import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { fonts, useTheme } from '@/lib/theme';

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function CycleRing({
  size = 220,
  strokeWidth = 10,
  progress,
  day,
  label,
  color,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number;
  day: number;
  label: string;
  color: string;
}) {
  const c = useTheme();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const p = Math.max(0, Math.min(0.9999, progress));

  // Arc from the top (12 o'clock), sweeping clockwise — drawn as a Path so we
  // avoid SVG transforms (which trigger noisy web warnings in react-native-svg).
  const [sx, sy] = polar(cx, cy, r, -90);
  const [ex, ey] = polar(cx, cy, r, -90 + 360 * p);
  const largeArc = p > 0.5 ? 1 : 0;
  const arc = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
        {p > 0 ? (
          <Path d={arc} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, { pointerEvents: 'none' }]}>
        <Text style={[styles.day, { color: c.text }]}>{day}</Text>
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 54, fontFamily: fonts.serif, lineHeight: 60 },
  label: { fontSize: 12, letterSpacing: 2, marginTop: 2 },
});
