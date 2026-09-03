export type PlayerUI = 'classic' | 'light';

const STORAGE_KEY = 'baselayer_player_ui';

export function getSavedPlayerUI(): PlayerUI {
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'classic';
}

export function savePlayerUI(ui: PlayerUI): void {
  localStorage.setItem(STORAGE_KEY, ui);
}
