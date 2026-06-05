import type { Champion } from '../../shared/types';

const DD = 'https://ddragon.leagueoflegends.com/cdn';

let version = '15.1.1'; // fallback; replaced on init
const championKeyById = new Map<number, string>();
const championByName = new Map<string, Champion>();

export function setVersion(v: string | null) {
  if (v) version = v;
}

export function indexChampions(champions: Champion[]) {
  championKeyById.clear();
  championByName.clear();
  for (const c of champions) {
    championKeyById.set(c.id, c.key);
    championByName.set(c.name.toLowerCase(), c);
  }
}

export function championSquare(championId: number): string {
  const key = championKeyById.get(championId);
  if (!key) return '';
  return `${DD}/${version}/img/champion/${key}.png`;
}

/** Live Client API gives champion display names, not IDs. */
export function championSquareByName(name: string): string {
  const champ = championByName.get(name.toLowerCase());
  return champ ? championSquare(champ.id) : '';
}

export function itemIcon(itemId: number): string {
  if (!itemId) return '';
  return `${DD}/${version}/img/item/${itemId}.png`;
}

export function profileIcon(iconId: number): string {
  return `${DD}/${version}/img/profileicon/${iconId}.png`;
}
