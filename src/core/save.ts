import { CONFIG } from '../config';

const KEY = 'calmiquarium-save';

export interface FishRecord { stage: number; points: number }
export interface SaveData { coins: number; fish: FishRecord[]; eggStage: number }

function fresh(): SaveData {
  return {
    coins: CONFIG.start.coins,
    fish: Array.from({ length: CONFIG.start.fish }, () => ({ stage: 0, points: 0 })),
    eggStage: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw);
    const fish: FishRecord[] = Array.isArray(d.fish)
      ? d.fish.map((f: any) => ({
          stage: typeof f?.stage === 'number' ? f.stage : 0,
          points: typeof f?.points === 'number' ? f.points : 0,
        }))
      : [];
    return {
      coins: typeof d.coins === 'number' ? d.coins : CONFIG.start.coins,
      fish,
      eggStage: typeof d.eggStage === 'number' ? d.eggStage : 0,
    };
  } catch {
    return fresh();
  }
}

export function writeSave(data: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
