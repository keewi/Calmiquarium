const SAVE_KEY = 'calmiquarium-save';

export interface FishSaveData {
  stage: number;
  growthPoints: number;
}

export interface SaveData {
  coins: number;
  fishCount: number;
  fishData: FishSaveData[];
  eggStage: number; // 0=not started, 1=first piece, 2=second piece, 3=complete
}

const DEFAULT_SAVE: SaveData = {
  coins: 100,
  fishCount: 2,
  fishData: [],
  eggStage: 0,
};

export function loadGame(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, fishData: [] };
    const data = JSON.parse(raw);
    const fishData: FishSaveData[] = Array.isArray(data.fishData)
      ? data.fishData.map((f: any) => ({
          stage: typeof f.stage === 'number' ? f.stage : 0,
          growthPoints: typeof f.growthPoints === 'number' ? f.growthPoints : 0,
        }))
      : [];
    return {
      coins: typeof data.coins === 'number' ? data.coins : DEFAULT_SAVE.coins,
      fishCount: typeof data.fishCount === 'number' ? data.fishCount : DEFAULT_SAVE.fishCount,
      fishData,
      eggStage: typeof data.eggStage === 'number' ? data.eggStage : DEFAULT_SAVE.eggStage,
    };
  } catch {
    return { ...DEFAULT_SAVE, fishData: [] };
  }
}

export function saveGame(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
