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
  {
    id: 'l9',
    title: 'Hydration matters',
    subtitle: 'Water and your cycle',
    body: 'Bloating and headaches late-cycle are often partly dehydration. Sipping steadily through the day eases both more than you’d expect.',
    accent: '#33502F',
  },
  {
    id: 'l10',
    title: 'Iron after your period',
    subtitle: 'Replenishing what you lose',
    body: 'Bleeding depletes iron, which can leave you tired. Pairing leafy greens or legumes with a little vitamin C helps your body absorb more.',
    accent: '#B05A3C',
  },
  {
    id: 'l11',
    title: 'The power of tracking',
    subtitle: 'Why patterns beat guesswork',
    body: 'After a couple of months of logging, your ‘random’ bad days start to line up with your cycle — and once you can predict them, you can plan around them.',
    accent: '#9B4A6B',
  },
  {
    id: 'l12',
    title: 'Warmth for cramps',
    subtitle: 'A simple, proven remedy',
    body: 'Heat relaxes the muscles behind period cramps. A hot water bottle or warm bath can work about as well as over-the-counter pain relief for many people.',
    accent: '#A99A6B',
  },
  {
    id: 'l13',
    title: 'Caffeine, late-cycle',
    subtitle: 'Why coffee hits different before your period',
    body: 'Progesterone can heighten anxiety sensitivity in your luteal phase, so the same coffee may feel more jittery. Switching to half-caff that week often smooths it out.',
    accent: '#5E5286',
  },
  {
    id: 'l14',
    title: 'Blood sugar and mood',
    subtitle: 'Steady meals, steadier mood',
    body: 'Big blood-sugar swings amplify PMS irritability. Pairing carbs with protein or fat keeps your energy — and your mood — more even.',
    accent: '#2E6066',
  },
  {
    id: 'l15',
    title: 'Move gently on hard days',
    subtitle: 'Exercise isn’t all-or-nothing',
    body: 'On low-energy days, a 10-minute walk still boosts circulation and mood. You don’t have to earn rest with an intense workout.',
    accent: '#3F6F8F',
  },
  {
    id: 'l16',
    title: 'Magnesium, your quiet ally',
    subtitle: 'For cramps, sleep and calm',
    body: 'Magnesium supports muscle relaxation and sleep, which is why many people find it eases both cramps and luteal restlessness. Leafy greens, nuts and seeds are good sources.',
    accent: '#7C6F8F',
  },
  {
    id: 'l17',
    title: 'Your follicular focus',
    subtitle: 'Ride the clarity wave',
    body: 'As estrogen climbs after your period, verbal memory and focus sharpen. It’s a natural week to tackle big projects or learn something new.',
    accent: '#33502F',
  },
  {
    id: 'l18',
    title: 'Understanding PMS',
    subtitle: 'It’s biology, not a flaw',
    body: 'The mood dip before your period tracks the drop in estrogen and serotonin. Naming it as hormonal — not personal — takes some of the sting out.',
    accent: '#B05A3C',
  },
  {
    id: 'l19',
    title: 'Sunlight and your rhythm',
    subtitle: 'Morning light steadies everything',
    body: 'A few minutes of morning daylight helps regulate the sleep and mood systems your hormones lean on. It’s one of the simplest wins there is.',
    accent: '#9B4A6B',
  },
  {
    id: 'l20',
    title: 'Fiber and hormones',
    subtitle: 'How your gut helps balance estrogen',
    body: 'Fiber helps your body clear excess estrogen through digestion, which can ease bloating and tenderness. Beans, oats and veg all count.',
    accent: '#A99A6B',
  },
  {
    id: 'l21',
    title: 'Protein through your cycle',
    subtitle: 'Building block for steady energy',
    body: 'Getting enough protein supports stable blood sugar and muscle recovery — especially useful in your higher-energy follicular and ovulatory weeks.',
    accent: '#5E5286',
  },
  {
    id: 'l22',
    title: 'Rest is training too',
    subtitle: 'Recovery makes you stronger',
    body: 'In your luteal and menstrual phases, gentler movement and real rest let your body adapt and repair. Slowing down is part of getting stronger, not the opposite.',
    accent: '#2E6066',
  },
  {
    id: 'l23',
    title: 'Bloating, explained',
    subtitle: 'Why you feel puffy before your period',
    body: 'Rising progesterone makes your body hold on to more water and slows digestion. Less salt, more water and gentle movement all help it pass.',
    accent: '#3F6F8F',
  },
  {
    id: 'l24',
    title: 'Your ovulation window',
    subtitle: 'Knowing your fertile days',
    body: 'Ovulation usually lands about 14 days before your next period, with the few days before it the most fertile. Whether you’re planning for or avoiding pregnancy, it’s worth knowing.',
    accent: '#7C6F8F',
  },
  {
    id: 'l25',
    title: 'Breathe through the tension',
    subtitle: 'A 60-second reset',
    body: 'Slow exhales calm the stress response that PMS can amplify. When you feel wound up, try breathing out for longer than you breathe in for a minute.',
    accent: '#33502F',
  },
  {
    id: 'l26',
    title: 'Alcohol and your cycle',
    subtitle: 'Why it can hit harder',
    body: 'Late-cycle hormone shifts can make alcohol disrupt your sleep and mood more than usual. Going lighter in your luteal week often means fewer next-day blues.',
    accent: '#B05A3C',
  },
  {
    id: 'l27',
    title: 'Cravings aren’t weakness',
    subtitle: 'Your body is asking for fuel',
    body: 'The pre-period urge for carbs comes from a real dip in serotonin. Reaching for complex carbs and a little dark chocolate is a kinder answer than willpower.',
    accent: '#9B4A6B',
  },
  {
    id: 'l28',
    title: 'Skin across your cycle',
    subtitle: 'Why breakouts time themselves',
    body: 'Skin is often clearest mid-cycle and breaks out before your period as hormones shift. Knowing the pattern helps you go easy on yourself — and your skin.',
    accent: '#A99A6B',
  },
  {
    id: 'l29',
    title: 'Plan your month in phases',
    subtitle: 'Cycle syncing your calendar',
    body: 'Front-load demanding meetings and social plans into your follicular and ovulatory weeks, and protect quieter time in your luteal phase — the whole month feels smoother.',
    accent: '#5E5286',
  },
  {
    id: 'l30',
    title: 'Vitamin D and mood',
    subtitle: 'A common, fixable gap',
    body: 'Low vitamin D is linked to lower mood and can worsen PMS. Sunlight helps; if you’re often indoors, it’s worth asking your doctor about testing.',
    accent: '#2E6066',
  },
  {
    id: 'l31',
    title: 'Omega-3s for cramps',
    subtitle: 'Fats that fight inflammation',
    body: 'Omega-3s — in oily fish, walnuts and flax — have been shown to ease period pain for some people by calming inflammation. A gentle, food-first option.',
    accent: '#3F6F8F',
  },
  {
    id: 'l32',
    title: 'Sleep is hormonal',
    subtitle: 'Why your cycle changes your nights',
    body: 'Body temperature rises in your luteal phase, which can fragment sleep. A cooler room and an earlier wind-down help you ride it out.',
    accent: '#7C6F8F',
  },
  {
    id: 'l33',
    title: 'Be your own baseline',
    subtitle: 'Compare you to you, not others',
    body: 'Cycle ‘normal’ is wildly individual. Tracking your own rhythm tells you far more than any average — and makes real changes easier to spot.',
    accent: '#33502F',
  },
  {
    id: 'l34',
    title: 'Ovulation twinges',
    subtitle: 'That mid-cycle ache is normal',
    body: 'A brief one-sided ache around ovulation is common and usually harmless. Pain that’s severe or lasts, though, is worth a check-up.',
    accent: '#B05A3C',
  },
  {
    id: 'l35',
    title: 'Stress and your cycle',
    subtitle: 'Why hard months feel irregular',
    body: 'High, sustained stress can delay ovulation and shift your whole cycle. Managing stress isn’t just self-care — it genuinely steadies your rhythm.',
    accent: '#9B4A6B',
  },
  {
    id: 'l36',
    title: 'A note on the pill',
    subtitle: 'How it changes what you track',
    body: 'Hormonal birth control replaces your natural cycle with a steady dose, so ‘periods’ on the pill are withdrawal bleeds. Your tracking still helps — just know the pattern is different.',
    accent: '#A99A6B',
  },
  {
    id: 'l37',
    title: 'When to see a doctor',
    subtitle: 'Signs worth flagging',
    body: 'Very heavy bleeding, cycles that suddenly change a lot, or pain that stops your day aren’t things to tough out. It’s always okay to get them checked.',
    accent: '#5E5286',
  },
  {
    id: 'l38',
    title: 'Kindness on day one',
    subtitle: 'Lower the bar, on purpose',
    body: 'The first day of your period isn’t the day to prove anything. Fewer commitments and more comfort is a plan, not a cop-out.',
    accent: '#2E6066',
  },
  {
    id: 'l39',
    title: 'Batch the follicular',
    subtitle: 'Use your momentum week',
    body: 'Energy and confidence peak after your period. It’s a great week to batch the tasks you’ve been putting off — your future luteal self will thank you.',
    accent: '#3F6F8F',
  },
  {
    id: 'l40',
    title: 'Notice your wins',
    subtitle: 'Progress hides in the pattern',
    body: 'Tracking isn’t only for hard days. Looking back at the weeks you felt strong shows you what’s working — and that good days come back around.',
    accent: '#7C6F8F',
  },
];

// Rotates through the lessons over the day — a different one every few hours.
const LESSON_ROTATE_MS = 3 * 60 * 60 * 1000;
export function lessonIndexForTime(ts: number): number {
  return Math.floor(ts / LESSON_ROTATE_MS) % LESSONS.length;
}
