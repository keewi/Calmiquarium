/**
 * Every tuning number in the game lives here.
 * Speeds are px/sec, timers are ms unless the key says otherwise.
 */
export const CONFIG = {
  start: { gold: 200, fish: 0 },

  layout: { sandHeight: 60, topBarHeight: 0, sidebarWidth: 220, margin: 40 },

  hunger: {
    // seconds
    max: 45,
    hungry: 25,     // chases food faster, still drops coins
    starving: 15,   // turns green, stops dropping coins
    desperate: 4,   // turns purple, last chance
  },

  growth: {
    babyToMedPellets: 3,      // cumulative pellets eaten
    medToLargePellets: 6,
    largeToKingPoints: 75,    // then transforms on the next feed
    stageScale: [0.9, 1.4, 1.7, 2.1],
    dropByStage: ['gold', 'gold', 'gold', 'diamond'],   // every guppy drops gold for now
  },

  fish: {
    wanderSpeed: [60, 180],
    wanderIntervalMs: [2000, 4500],
    wanderForward: [80, 250],
    wanderDrift: [-50, 50],
    chaseCasual: 120,
    chaseHungry: 132,
    chaseStarving: 180,
    chaseDesperate: 240,
    eatRadius: 35,
  },

  coins: {
    values: { silver: 5, gold: 10, diamond: 100 },
    dropIntervalMs: [20000, 35000],   // per fish, staggered; starving fish stop dropping
    firstDropDelayMs: [8000, 20000],  // a new fish's first coin comes sooner than a full interval
    fallSpeed: 90,                    // slow sink so coins can be caught mid-water
    collectRadius: 28,
    expireMs: 20000,                  // time on the sand before it vanishes
  },

  food: { cost: 5, maxActive: 3, fallSpeed: 80 },

  shop: { guppy: 50, santa: 100, pegasus: 150, eggPieces: [500, 750, 1000] },   // 3 pieces = win

  santa: {
    visitMs: 20000,             // time roaming before he heads home
    speed: 70,                  // px/sec
    laughEveryMs: [4000, 7000],
    laughMs: 1800,
  },

  pegasus: {
    speed: 170,        // px/sec
    waveAmp: 32,       // vertical glide amplitude
    waveHz: 0.35,
    trailPoints: 40,
    trailSpacing: 7,   // px between ribbon samples → ~280px ribbon
  },

  alien: {
    spawnIntervalMs: 45000,
    warningMs: 7500,
    graceMs: 2000,
    hitRadius: 40,
    punchNudge: 20,
    types: {
      sylvester: { hp: 10, speed: 40, maxSpeedMult: 1.5, eatCooldownMs: 4000, eatRadius: 40, drop: 'diamond' },
    },
  },
} as const;

export type CoinType = keyof typeof CONFIG.coins.values;

export enum Stage { Baby, Medium, Large, King }
