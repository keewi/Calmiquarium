/**
 * Every tuning number in the game lives here.
 * Speeds are px/sec, timers are ms unless the key says otherwise.
 */
export const CONFIG = {
  start: { coins: 100, fish: 2 },

  layout: { sandHeight: 60, topBarHeight: 72, margin: 40 },

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
    dropByStage: [null, 'silver', 'gold', 'diamond'],
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
    values: { silver: 15, gold: 35, diamond: 200 },
    dropIntervalMs: [5000, 6000],   // medium+ only; starving fish stop dropping
    fallSpeed: 370,
    collectRadius: 28,
    expireMs: 15000,
  },

  food: { cost: 5, maxActive: 3, fallSpeed: 80 },

  shop: { goldfish: 50, eggPieces: [500, 750, 1000] },   // 3 pieces = win

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
