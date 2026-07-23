// Client helper: check a community post/reply against the guidelines before
// showing it. A small local keyword check catches the obvious cases instantly
// (and offline); the `moderate` Edge Function (Gemini) handles the nuanced ones.
import { supabase } from './supabase';

export interface ModerationResult {
  allowed: boolean;
  reason: string;
}

// High-precision, unambiguous phrases — kept deliberately small so genuine
// posts aren't blocked. The AI check does the nuanced work.
const LOCAL_BLOCK: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(sex partner|hook[\s-]?up|sugar daddy|send nudes|nudes)\b/i, reason: 'Soliciting partners or explicit content isn’t allowed in the Greenhouse.' },
  { pattern: /\b(for sale|selling my|buy my|venmo|cashapp|cash app|paypal|onlyfans|promo code|discount code)\b/i, reason: 'Buying, selling, or advertising isn’t allowed here — this is a support space, not a marketplace.' },
];

export async function moderateText(text: string): Promise<ModerationResult> {
  const content = text.trim();
  if (!content) return { allowed: false, reason: 'Please write something first.' };

  for (const { pattern, reason } of LOCAL_BLOCK) {
    if (pattern.test(content)) return { allowed: false, reason };
  }

  const { data, error } = await supabase.functions.invoke('moderate', { body: { text: content } });
  if (error) return { allowed: true, reason: '' }; // fail open — local check already passed
  const p = data as { allowed?: boolean; reason?: string } | null;
  if (!p || typeof p.allowed !== 'boolean') return { allowed: true, reason: '' };
  return {
    allowed: p.allowed,
    reason: p.reason?.trim() || 'That post goes against our community guidelines.',
  };
}
