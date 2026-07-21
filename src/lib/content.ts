/**
 * Seeded content for Unity (community) and Learn (education). In Phase 2 these
 * are replaced by Supabase-backed feeds + a content service.
 */

export interface PostComment {
  id: string;
  author: string;
  initial: string;
  body: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  initial: string;
  anonymous: boolean;
  phase: string;
  badge: string;
  body: string;
  hugs: number;
  tips: number;
  comments: PostComment[];
}

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    author: 'Anonymous',
    initial: 'A',
    anonymous: true,
    phase: 'Follicular',
    badge: 'DAY 12 INSIGHT',
    body: "Finally realized that my mid-cycle anxiety isn't “random.” It's the estrogen spike! Nature walks and switching to decaf helped me so much today.",
    hugs: 42,
    tips: 12,
    comments: [
      { id: 'p1c1', author: 'Maya_Flow', initial: 'M', body: 'Yes! Decaf changed everything for me too 💚' },
      { id: 'p1c2', author: 'Anonymous', initial: 'A', body: 'Saving this — the estrogen thing finally makes sense.' },
    ],
  },
  {
    id: 'p2',
    author: 'Maya_Flow',
    initial: 'M',
    anonymous: false,
    phase: 'Follicular',
    badge: 'REMEDY SHARED',
    body: "If you're feeling on edge, try magnesium glycinate tonight. It stabilized my jitters instantly. We got this!",
    hugs: 28,
    tips: 5,
    comments: [
      { id: 'p2c1', author: 'Anonymous', initial: 'A', body: 'Trying this tonight, thank you 🙏' },
      { id: 'p2c2', author: 'Rae', initial: 'R', body: 'Glycinate specifically — the citrate kind upsets my stomach.' },
    ],
  },
  {
    id: 'p3',
    author: 'Anonymous',
    initial: 'A',
    anonymous: true,
    phase: 'Luteal',
    badge: 'WIN',
    body: 'Tracked for three months and finally moved my big meetings to my follicular week. Game changer for my confidence.',
    hugs: 67,
    tips: 9,
    comments: [
      { id: 'p3c1', author: 'Priya_S', initial: 'P', body: 'So smart. Going to plan my week around my phases too.' },
      { id: 'p3c2', author: 'Anonymous', initial: 'A', body: 'Proud of you! Three months of tracking is real dedication.' },
    ],
  },
  {
    id: 'p4',
    author: 'Anonymous',
    initial: 'A',
    anonymous: true,
    phase: 'Menstrual',
    badge: 'DAY 2',
    body: 'Cramps are brutal today. A heating pad and staying off my feet is the only thing helping. Sending strength to anyone else in their first days 🩸',
    hugs: 51,
    tips: 14,
    comments: [
      { id: 'p4c1', author: 'Nina', initial: 'N', body: 'Heating pad + ibuprofen before it peaks is my combo. Feel better 💛' },
      { id: 'p4c2', author: 'Anonymous', initial: 'A', body: 'You’re not alone, day 2 is the worst. Rest guilt-free.' },
    ],
  },
  {
    id: 'p5',
    author: 'Jess_M',
    initial: 'J',
    anonymous: false,
    phase: 'Luteal',
    badge: 'REMEDY SHARED',
    body: 'PMS insomnia was wrecking me until I started magnesium + no screens after 9pm. Falling asleep so much easier this week.',
    hugs: 33,
    tips: 8,
    comments: [
      { id: 'p5c1', author: 'Anonymous', initial: 'A', body: 'Screens were my problem too. Blue light is no joke late cycle.' },
    ],
  },
];

export interface Circle {
  id: string;
  day: string;
  month: string;
  title: string;
  place: string;
  time: string;
}

export const UPCOMING_CIRCLES: Circle[] = [
  {
    id: 'c1',
    day: '15',
    month: 'MAY',
    title: 'Full Moon Reflection Circle',
    place: 'Sutro Heights Park',
    time: '6:30 PM',
  },
  {
    id: 'c2',
    day: '18',
    month: 'MAY',
    title: 'Yoga for Cycle Prep',
    place: 'The Green Studio',
    time: '10:00 AM',
  },
];

export interface FeelBetter {
  icon: string;
  title: string;
  detail: string;
}

export const INSIGHTS = {
  anxietyPrevalence: 32,
  nextDayFluctuation: 18,
  // relative bar heights for the volatility trend (0..1)
  volatility: [0.4, 0.6, 0.45, 0.55, 0.95, 0.5, 0.42],
  volatilityNote:
    'Your mood stability usually drops 4 days before your period. Current cycle fluctuation is lower than last month.',
  feelBetter: [
    { icon: 'walk-outline', title: 'Nature walks', detail: '85% success in anxiety reduction' },
    { icon: 'cafe-outline', title: 'Magnesium tea', detail: 'Improved sleep quality on Day 22' },
    { icon: 'moon-outline', title: 'Luna check-ins', detail: '70% decrease in mental clutter' },
  ] as FeelBetter[],
};

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  accent: string;
  image?: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'l1',
    title: 'Eat with your cycle',
    subtitle: 'Fuel for your follicular phase',
    body: 'Rising estrogen makes your body better at using carbs for energy — a great week for whole grains, fresh greens and a harder workout.',
    accent: '#33502F',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80&auto=format&fit=crop',
  },
  {
    id: 'l2',
    title: 'Rest is productive',
    subtitle: 'Why your menstrual phase asks for slowness',
    body: 'With hormones at their lowest, your body is doing real recovery work. Gentle movement, warmth and extra sleep aren’t lazy — they’re exactly what this phase needs.',
    accent: '#B05A3C',
  },
  {
    id: 'l3',
    title: 'The estrogen glow',
    subtitle: 'Your skin at its most resilient',
    body: 'Estrogen helps your skin hold moisture and build collagen, so your follicular week is when it bounces back best. Hydrate and enjoy it.',
    accent: '#9B4A6B',
  },
  {
    id: 'l4',
    title: 'Peak power',
    subtitle: 'Making the most of ovulation',
    body: 'Estrogen and testosterone peak together — energy, confidence and libido are highest. A natural window for big conversations, workouts and connection.',
    accent: '#A99A6B',
  },
  {
    id: 'l5',
    title: 'Luteal cravings, explained',
    subtitle: 'Why you want carbs before your period',
    body: 'As progesterone rises and serotonin dips, your body reaches for quick energy. Complex carbs, magnesium and protein steady the cravings better than sugar will.',
    accent: '#5E5286',
  },
  {
    id: 'l6',
    title: 'Move with your phases',
    subtitle: 'Cycle-synced exercise',
    body: 'Save high-intensity training for your follicular and ovulatory weeks when energy is high; lean into walks, yoga and stretching through your luteal and menstrual phases.',
    accent: '#2E6066',
  },
  {
    id: 'l7',
    title: 'Protect your luteal sleep',
    subtitle: 'Resting through PMS',
    body: 'Sleep often fragments late-cycle. A cool, dark room, a little magnesium and no screens after 9pm help you fall — and stay — asleep.',
    accent: '#3F6F8F',
  },
  {
    id: 'l8',
    title: 'Seed cycling 101',
    subtitle: 'Gentle, food-based hormone support',
    body: 'Some people eat flax and pumpkin seeds in the first half of their cycle, then sunflower and sesame in the second, to support the natural hormone shift. Simple and low-risk.',
    accent: '#7C6F8F',
  },
];

// Rotates through the lessons over the day — a different one every few hours.
const LESSON_ROTATE_MS = 3 * 60 * 60 * 1000;
export function lessonIndexForTime(ts: number): number {
  return Math.floor(ts / LESSON_ROTATE_MS) % LESSONS.length;
}
