const SAVE_KEY = 'calmiquarium-save';

export interface SaveData {
  coins: number;
  fishCount: number;
}

const DEFAULT_SAVE: SaveData = {
  coins: 100,
  fishCount: 0,
};

export function loadGame(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const data = JSON.parse(raw);
    return {
      coins: typeof data.coins === 'number' ? data.coins : DEFAULT_SAVE.coins,
      fishCount: typeof data.fishCount === 'number' ? data.fishCount : DEFAULT_SAVE.fishCount,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function saveGame(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
