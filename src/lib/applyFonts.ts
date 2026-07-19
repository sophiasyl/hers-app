import { StyleSheet, Text, TextInput } from 'react-native';

import { fonts } from './theme';

/**
 * Apply the rounded body font (Nunito) to every Text/TextInput by default,
 * while letting any component that sets its own fontFamily (headings → Fredoka)
 * win. We inject as the lowest-priority style and pick the Nunito weight that
 * matches the element's fontWeight so emphasis is preserved (custom fonts on
 * native ignore fontWeight, so we map it to a real weighted family instead).
 */
function familyForWeight(style: unknown): string {
  const flat = (StyleSheet.flatten(style as never) || {}) as { fontWeight?: string };
  const w = flat.fontWeight;
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return fonts.bodyBold;
  if (w === '500' || w === '600') return fonts.bodyMedium;
  return fonts.body;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function patch(Comp: any) {
  if (!Comp || Comp.__hersFontPatched) return;
  const orig = Comp.render;
  if (typeof orig !== 'function') return;
  Comp.render = function (props: any, ref: any) {
    const fam = familyForWeight(props?.style);
    return orig.call(this, { ...props, style: [{ fontFamily: fam }, props?.style] }, ref);
  };
  Comp.__hersFontPatched = true;
}

patch(Text);
patch(TextInput);
