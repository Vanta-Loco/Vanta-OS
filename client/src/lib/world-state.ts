// ─── Vanta City world state — saved in sessionStorage so returning to /world
//     restores the exact position, camera and radio state the user left from.

const KEY = "vantaCity.worldState";
const RADIO_VOL_KEY = "vantaCity.radioVol";

export interface WorldSave {
  playerX:  number;
  playerZ:  number;
  angle:    number;
  camYaw:   number;
  camPitch: number;
  camDist:  number;
  nearId:   string | null;
}

export const DEFAULT_WORLD_SAVE: WorldSave = {
  playerX:  0,
  playerZ:  0,
  angle:    0,
  camYaw:   0,
  camPitch: 0.32,
  camDist:  10,
  nearId:   null,
};

export function saveWorldState(s: WorldSave): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function loadWorldState(): WorldSave | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorldSave;
  } catch {
    return null;
  }
}

// Radio volume — saved by VaultRadio, read back on mount
export function saveRadioVol(vol: number): void {
  try { sessionStorage.setItem(RADIO_VOL_KEY, String(vol)); } catch {}
}

export function loadRadioVol(): number | null {
  try {
    const raw = sessionStorage.getItem(RADIO_VOL_KEY);
    return raw !== null ? parseFloat(raw) : null;
  } catch {
    return null;
  }
}
