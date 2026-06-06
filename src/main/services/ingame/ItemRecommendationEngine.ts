import type { GamePhase, ItemBuildRecommendation, ItemSuggestion } from './types';

export interface ItemInput {
  championTags: string[];         // ['Mage'] | ['Fighter', 'Tank'] etc.
  ownedItemIds: number[];
  currentGold: number;
  gameTime: number;               // seconds
  goldAdvantage: number;          // positive = ahead, negative = behind
  enemyADCount: number;
  enemyAPCount: number;
  enemyHasHealing: boolean;
}

// ─── Item catalogue (patch-pinned, update when items change) ─────────────────

const ITEMS: Record<string, ItemSuggestion & { tags: string[] }> = {
  // AD / Assassin mythics
  duskblade:       { itemId: 6691, name: "Duskblade of Draktharr", priority: 'core',        reason: 'Mythic de assassin AD — burst letal',          tags: ['ad','assassin','mythic'] },
  prowlerClaw:     { itemId: 6692, name: "Prowler's Claw",          priority: 'core',        reason: 'Mythic AD con dash — ideal en duelistas',      tags: ['ad','assassin','mythic'] },
  // AD / Bruiser mythics
  goredrinker:     { itemId: 6630, name: 'Goredrinker',              priority: 'core',        reason: 'Mythic bruiser — sustain en peleas',           tags: ['ad','fighter','mythic'] },
  triforce:        { itemId: 3078, name: 'Trinity Force',            priority: 'core',        reason: 'Mythic on-hit — bueno en bruisers',            tags: ['ad','fighter','mythic'] },
  // ADC mythics
  kraken:          { itemId: 6672, name: 'Kraken Slayer',            priority: 'core',        reason: 'Mythic ADC — destruye tanques',                tags: ['ad','marksman','mythic'] },
  galeforce:       { itemId: 6671, name: 'Galeforce',                priority: 'core',        reason: 'Mythic ADC — movilidad + burst',               tags: ['ad','marksman','mythic'] },
  // AP mythics
  ludens:          { itemId: 6655, name: "Luden's Tempest",          priority: 'core',        reason: 'Mythic AP burst — poke y roaming',             tags: ['ap','mage','mythic'] },
  shadowflame:     { itemId: 4645, name: 'Shadowflame',              priority: 'core',        reason: 'AP burst con pen — mata squishies',            tags: ['ap','mage','mythic'] },
  riftmaker:       { itemId: 4629, name: 'Riftmaker',                priority: 'core',        reason: 'Mythic AP sustain — bueno en bruisers AP',    tags: ['ap','fighter','mythic'] },
  // Tank mythics
  sunfireAegis:    { itemId: 3068, name: 'Sunfire Aegis',            priority: 'core',        reason: 'Mythic tank — daño AOE y durabilidad',        tags: ['tank','mythic'] },
  heartsteel:      { itemId: 3181, name: 'Heartsteel',               priority: 'core',        reason: 'Mythic HP — escala con tiempo',               tags: ['tank','mythic'] },
  // Support mythics
  moonstone:       { itemId: 6617, name: 'Moonstone Renewer',        priority: 'core',        reason: 'Mythic support — heal/shield en combate',     tags: ['support','mythic'] },
  // AD damage
  infinityEdge:    { itemId: 3031, name: 'Infinity Edge',            priority: 'core',        reason: 'Máximo daño ADC — crítico masivo',            tags: ['ad','marksman'] },
  lordDominiks:    { itemId: 3036, name: "Lord Dominik's Regards",   priority: 'situational', reason: 'Penetración de armadura — machaca tanques',   tags: ['ad','armorpen'] },
  mortalReminder:  { itemId: 3033, name: 'Mortal Reminder',          priority: 'situational', reason: 'Anti-heal + penetración de armadura',         tags: ['ad','antiheal','armorpen'] },
  blackCleaver:    { itemId: 3071, name: 'Black Cleaver',            priority: 'core',        reason: 'Reduce armadura + HP — bruiser AD',           tags: ['ad','fighter','armorpen'] },
  // AP damage
  voidStaff:       { itemId: 3135, name: 'Void Staff',               priority: 'situational', reason: 'Penetración mágica % — esencial vs MR',      tags: ['ap','mpen'] },
  morellonomicon:  { itemId: 3165, name: 'Morellonomicon',           priority: 'situational', reason: 'Anti-heal AP — contra sustain enemigo',       tags: ['ap','antiheal'] },
  rabadon:         { itemId: 3089, name: "Rabadon's Deathcap",       priority: 'core',        reason: 'AP masivo — amplifica todo tu daño mágico',   tags: ['ap'] },
  // Defensive — Armor
  thornmail:       { itemId: 3075, name: 'Thornmail',                priority: 'defensive',   reason: 'Armadura + anti-heal — vs ADC/bruiser',       tags: ['armor','antiheal'] },
  randuins:        { itemId: 3143, name: "Randuin's Omen",           priority: 'defensive',   reason: 'Armadura + reduce crits — vs ADC',            tags: ['armor'] },
  steelcaps:       { itemId: 3047, name: 'Plated Steelcaps',         priority: 'defensive',   reason: 'Botas con armadura — reduce daño físico',     tags: ['armor','boots'] },
  // Defensive — MR
  spiritVisage:    { itemId: 3065, name: 'Spirit Visage',            priority: 'defensive',   reason: 'MR + amplifica healing — vs AP',              tags: ['mr','healing'] },
  forceOfNature:   { itemId: 4401, name: 'Force of Nature',          priority: 'defensive',   reason: 'MR + movimiento — vs AP pesado',              tags: ['mr'] },
  mercTreads:      { itemId: 3111, name: "Mercury's Treads",         priority: 'defensive',   reason: 'MR + tenacidad — vs AP/CC',                  tags: ['mr','boots'] },
  // Defensive — HP
  warmogs:         { itemId: 3083, name: "Warmog's Armor",           priority: 'defensive',   reason: 'Bulk masivo + regeneración pasiva',           tags: ['hp','tank'] },
  // Boots — standard
  sorceresShoes:   { itemId: 3020, name: "Sorcerer's Shoes",         priority: 'core',        reason: 'Penetración mágica — básico para magos',      tags: ['ap','boots'] },
  berserkGreaves:  { itemId: 3006, name: "Berserker's Greaves",      priority: 'core',        reason: 'Velocidad de ataque — esencial para ADC',     tags: ['ad','marksman','boots'] },
};

const ALL_ITEMS = Object.values(ITEMS);

// All tier-2 boots + basic boots — used to detect that boots are already owned
// (the catalogue above only lists a few, so check against the full set).
const BOOTS_IDS = new Set([1001, 3006, 3009, 3010, 3020, 3047, 3111, 3117, 3158, 2422, 3013]);
// Trinkets/wards occupy a slot but don't count toward the 6 item slots.
const TRINKET_IDS = new Set([3340, 3363, 3364, 3330, 3865, 2055, 2052]);

export function recommendItems(input: ItemInput): ItemBuildRecommendation {
  const phase = getPhase(input.gameTime);
  const buildStyle = getBuildStyle(input.goldAdvantage, input.enemyHasHealing);
  const champType = getChampType(input.championTags);

  // If all 6 item slots are filled, nothing new can be bought.
  const filledSlots = input.ownedItemIds.filter(id => id && !TRINKET_IDS.has(id)).length;
  if (filledSlots >= 6) {
    return {
      phase,
      buildStyle,
      items: [],
      reasoning: 'Build completa — no hay slots libres para nuevos items.',
    };
  }

  const selected: ItemSuggestion[] = [];

  // ── 1. Core mythic (if not owned) ────────────────────────────────────────
  const mythics = ALL_ITEMS.filter(i => i.tags.includes('mythic') && i.tags.includes(champType));
  const ownsMythic = mythics.some(m => input.ownedItemIds.includes(m.itemId));
  if (!ownsMythic && mythics.length > 0) {
    const pick = phase === 'early' ? mythics[0] : mythics[Math.min(1, mythics.length - 1)];
    selected.push(toSuggestion(pick));
  }

  // ── 2. Anti-heal if applicable ────────────────────────────────────────────
  if (input.enemyHasHealing) {
    const antiHealTag = champType === 'ap' ? 'morellonomicon' : 'mortalReminder';
    const antiHeal = ITEMS[antiHealTag];
    if (antiHeal && !input.ownedItemIds.includes(antiHeal.itemId)) {
      selected.push(toSuggestion(antiHeal));
    }
  }

  // ── 3. Armor/MR if behind or enemy heavy ─────────────────────────────────
  if (buildStyle === 'defensive' || input.goldAdvantage < -1500) {
    if (input.enemyADCount >= input.enemyAPCount) {
      addIfNotOwned(selected, ITEMS['thornmail'], input.ownedItemIds);
      addIfNotOwned(selected, ITEMS['steelcaps'], input.ownedItemIds);
    } else {
      addIfNotOwned(selected, ITEMS['spiritVisage'], input.ownedItemIds);
      addIfNotOwned(selected, ITEMS['mercTreads'], input.ownedItemIds);
    }
  }

  // ── 4. Damage amplifiers if ahead ────────────────────────────────────────
  if (buildStyle === 'aggressive') {
    if (champType === 'ap') {
      addIfNotOwned(selected, ITEMS['rabadon'], input.ownedItemIds);
      addIfNotOwned(selected, ITEMS['voidStaff'], input.ownedItemIds);
    } else if (champType === 'ad') {
      addIfNotOwned(selected, ITEMS['lordDominiks'], input.ownedItemIds);
      addIfNotOwned(selected, ITEMS['infinityEdge'], input.ownedItemIds);
    }
  }

  // ── 5. Penetration items in mid/late vs tanky enemies ────────────────────
  if (phase !== 'early') {
    if (champType === 'ap') {
      addIfNotOwned(selected, ITEMS['voidStaff'], input.ownedItemIds);
    } else {
      addIfNotOwned(selected, ITEMS['blackCleaver'], input.ownedItemIds);
    }
  }

  // ── 6. Boots if not owned ────────────────────────────────────────────────
  const ownBoots = input.ownedItemIds.some(id => BOOTS_IDS.has(id));
  if (!ownBoots) {
    if (champType === 'ap') addIfNotOwned(selected, ITEMS['sorceresShoes'], input.ownedItemIds);
    else if (champType === 'marksman') addIfNotOwned(selected, ITEMS['berserkGreaves'], input.ownedItemIds);
    else if (input.enemyAPCount > input.enemyADCount) addIfNotOwned(selected, ITEMS['mercTreads'], input.ownedItemIds);
    else addIfNotOwned(selected, ITEMS['steelcaps'], input.ownedItemIds);
  }

  const reasoning = buildReasoning(buildStyle, phase, input.enemyHasHealing, input.goldAdvantage);

  return {
    phase,
    buildStyle,
    items: selected.slice(0, 6),
    reasoning,
  };
}

function getPhase(gameTime: number): GamePhase {
  if (gameTime < 600) return 'early';    // < 10 min
  if (gameTime < 1500) return 'mid';     // < 25 min
  return 'late';
}

function getBuildStyle(goldAdv: number, hasHealing: boolean): ItemBuildRecommendation['buildStyle'] {
  if (hasHealing) return 'anti-heal';
  if (goldAdv > 2000) return 'aggressive';
  if (goldAdv < -1000) return 'defensive';
  return 'balanced';
}

function getChampType(tags: string[]): 'ap' | 'ad' | 'marksman' | 'tank' | 'support' {
  if (tags.includes('Marksman')) return 'marksman';
  if (tags.includes('Mage') || tags.includes('Assassin') && tags.includes('Mage')) return 'ap';
  if (tags.includes('Tank')) return 'tank';
  if (tags.includes('Support')) return 'support';
  if (tags.includes('Assassin') || tags.includes('Fighter')) return 'ad';
  return 'ad';
}

function addIfNotOwned(
  list: ItemSuggestion[],
  item: (typeof ITEMS)[string] | undefined,
  owned: number[],
) {
  if (item && !owned.includes(item.itemId) && !list.some(s => s.itemId === item.itemId)) {
    list.push(toSuggestion(item));
  }
}

function toSuggestion(item: (typeof ITEMS)[string]): ItemSuggestion {
  return { itemId: item.itemId, name: item.name, priority: item.priority, reason: item.reason };
}

function buildReasoning(
  style: string,
  phase: GamePhase,
  antiHeal: boolean,
  goldAdv: number,
): string {
  const parts: string[] = [`Fase: ${phase}`];
  const adv = Math.round(goldAdv);
  if (adv > 2000) parts.push(`estás ${adv.toLocaleString()}g adelante — maximizá daño`);
  else if (adv < -1000) parts.push(`estás ${Math.abs(adv).toLocaleString()}g atrás — priorizar durabilidad`);
  if (antiHeal) parts.push('enemigo con healing — anti-heal obligatorio');
  return parts.join('. ') + '.';
}
