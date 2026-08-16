import type { GamePhase, ItemBuildRecommendation, ItemSuggestion, ItemSwap } from './types';

type BuildStyle = ItemBuildRecommendation['buildStyle'];

// A real item straight from Data Dragon (no hardcoded catalogue). The pool is
// injected from main — every purchasable item, with its actual tags, stats,
// recipe and passives. The engine scores these against the champion and the
// game state; nothing about *which* items exist lives in this file.
export interface ItemMeta {
  id: number;
  name: string;
  tags: string[];                 // DD item tags: 'Damage','Armor','ArmorPenetration',…
  stats: Record<string, number>;  // DD flat/percent stat mods
  goldTotal: number;
  into: number[];                 // empty ⇒ final-tier item
  from: number[];                 // direct components
  isBoots: boolean;
  isTrinket: boolean;
  isConsumable: boolean;
  sr: boolean;                    // available on Summoner's Rift (map 11)
  purchasable: boolean;
  grievous: boolean;              // applies Grievous Wounds (anti-heal)
  requiredChampion: boolean;      // champion-locked (Ornn upgrades, etc.)
}

export interface ItemInput {
  championTags: string[];         // ['Mage'] | ['Fighter','Tank'] etc.
  ownedItemIds: number[];
  currentGold: number;
  gameTime: number;               // seconds
  goldAdvantage: number;          // positive = ahead, negative = behind
  enemyADCount: number;
  enemyAPCount: number;
  enemyHasHealing: boolean;
  // Threat-aware signals: only the *actual* threats (fed/relevant enemies)
  // should pull defensive/anti-heal items. When omitted, fall back to comp.
  threatenedByAD?: boolean;
  threatenedByAP?: boolean;
  healingThreat?: boolean;
  // The full live item pool from Data Dragon. When absent (e.g. data still
  // loading) the engine simply returns no item advice.
  items?: ItemMeta[];
  // Resolves the full recursive set of component item IDs that build into a
  // given finished item, so the engine never tells you to sell a component of
  // the item it recommends.
  componentsOf?: (itemId: number) => number[];
}

// ─── Stat categories the scorer reasons about ───────────────────────────────
type Cat =
  | 'ad' | 'ap' | 'attackspeed' | 'crit' | 'armorpen' | 'magicpen' | 'haste'
  | 'lifesteal' | 'spellvamp' | 'onhit' | 'health' | 'armor' | 'mr' | 'mana'
  | 'tenacity' | 'movespeed';

type Weights = Partial<Record<Cat, number>>;

export function recommendItems(input: ItemInput): ItemBuildRecommendation {
  const phase = getPhase(input.gameTime);
  const antiHeal = input.healingThreat ?? input.enemyHasHealing;
  const facingAP = input.threatenedByAP ?? (input.enemyAPCount > input.enemyADCount);
  const facingAD = input.threatenedByAD ?? (input.enemyADCount >= input.enemyAPCount);
  const buildStyle = getBuildStyle(input.goldAdvantage, antiHeal);

  // Build the per-champion + per-situation weight vector. This is the only
  // heuristic in the engine — it says which *stats* matter, never which items.
  const weights = buildWeights(input, buildStyle, facingAP, facingAD);

  // Score every real, relevant item and rank them. Excludes owned items and the
  // trinket/consumable/off-map noise.
  const desired = selectItems(input, weights, antiHeal);

  // Split into items the player is already building (owns a component → finishing
  // frees a slot, no sell needed) and brand-new ones.
  const completable: ItemSuggestion[] = [];
  const fresh: ItemSuggestion[] = [];
  for (const d of desired) {
    if (ownsComponentOf(input, d.itemId)) {
      completable.push({ ...d, priority: 'core', reason: 'Ya tenés sus componentes — completá este item' });
    } else {
      fresh.push(d);
    }
  }

  const trinketIds = bootsOrTrinketIds(input, 'trinket');
  const filledSlots = input.ownedItemIds.filter(id => id && !trinketIds.has(id)).length;

  if (filledSlots >= 6) {
    const swaps = computeSwaps(input, fresh, desired);
    return {
      phase,
      buildStyle,
      items: completable.slice(0, 3),
      swaps,
      reasoning: completable.length
        ? 'Completá los items que ya estás armando antes de vender nada.'
        : swaps.length
          ? 'Build completa — cambios sugeridos según cómo va la partida.'
          : 'Build completa y acorde a la partida.',
    };
  }

  return {
    phase,
    buildStyle,
    items: desired.slice(0, 6),
    swaps: [],
    reasoning: buildReasoning(phase, antiHeal, input.goldAdvantage),
  };
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

// Ranked list of real items worth buying next, scored against the weight vector.
function selectItems(input: ItemInput, weights: Weights, antiHeal: boolean): ItemSuggestion[] {
  const pool = input.items ?? [];
  if (pool.length === 0) return [];

  const owned = new Set(input.ownedItemIds.filter(Boolean));
  const ownsBoots = [...owned].some(id => pool.find(p => p.id === id)?.isBoots);

  // Recommendable = final-tier, purchasable, on SR, not a trinket/consumable,
  // not champion-locked, and worth a real slot (skip sub-1000g standalones).
  const candidates = pool.filter(
    it =>
      it.purchasable &&
      it.sr &&
      it.into.length === 0 &&
      !it.isTrinket &&
      !it.isConsumable &&
      !it.requiredChampion &&
      it.goldTotal >= 1000 &&
      !owned.has(it.id) &&
      // only one pair of boots; skip boots entirely once we own some
      !(it.isBoots && ownsBoots),
  );

  const scored = candidates
    .map(it => ({ it, score: scoreItem(it, weights, antiHeal) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Take the best-scoring items, but never more than one pair of boots and no
  // duplicate names (Data Dragon ships several IDs sharing a display name).
  const out: ItemSuggestion[] = [];
  const seenNames = new Set<string>();
  let bootsTaken = ownsBoots;
  for (const { it, score } of scored) {
    if (seenNames.has(it.name)) continue;
    if (it.isBoots) {
      if (bootsTaken) continue;
      bootsTaken = true;
    }
    seenNames.add(it.name);
    out.push(toSuggestion(it, weights, antiHeal, score));
    if (out.length >= 6) break;
  }
  return out;
}

// Item score = Σ weight[cat] · itemContribution[cat], with an anti-heal bonus
// when a sustain threat is live.
function scoreItem(it: ItemMeta, weights: Weights, antiHeal: boolean): number {
  const vec = itemVector(it);
  let score = 0;
  for (const cat of Object.keys(vec) as Cat[]) {
    score += (weights[cat] ?? 0) * (vec[cat] ?? 0);
  }
  if (antiHeal && it.grievous) score += 6; // sustain threat ⇒ strongly prefer GW
  return score;
}

// Normalised contribution vector for a real item, from its DD stats + tags.
// Stats give magnitudes; tags capture effects DD has no numeric field for
// (penetration, haste, on-hit, tenacity…).
function itemVector(it: ItemMeta): Weights {
  const v: Weights = {};
  const s = it.stats ?? {};
  const cap = (x: number, d: number) => (x ? Math.min(x / d, 1.5) : 0);
  const bump = (c: Cat, n: number) => { v[c] = Math.max(v[c] ?? 0, n); };

  if (s.FlatPhysicalDamageMod) v.ad = cap(s.FlatPhysicalDamageMod, 80);
  if (s.FlatMagicDamageMod) v.ap = cap(s.FlatMagicDamageMod, 120);
  if (s.PercentAttackSpeedMod) v.attackspeed = cap(s.PercentAttackSpeedMod, 0.5);
  if (s.FlatCritChanceMod) v.crit = cap(s.FlatCritChanceMod, 0.25);
  if (s.FlatHPPoolMod) v.health = cap(s.FlatHPPoolMod, 500);
  if (s.FlatArmorMod) v.armor = cap(s.FlatArmorMod, 80);
  if (s.FlatSpellBlockMod) v.mr = cap(s.FlatSpellBlockMod, 80);
  if (s.FlatMPPoolMod) v.mana = cap(s.FlatMPPoolMod, 600);
  if (s.PercentLifeStealMod) v.lifesteal = cap(s.PercentLifeStealMod, 0.2);
  if (s.PercentMovementSpeedMod || s.FlatMovementSpeedMod) bump('movespeed', 0.6);

  const t = (tag: string) => it.tags.includes(tag);
  if (t('ArmorPenetration')) bump('armorpen', 1);
  if (t('MagicPenetration')) bump('magicpen', 1);
  if (t('AbilityHaste') || t('CooldownReduction')) bump('haste', 1);
  if (t('OnHit')) bump('onhit', 1);
  if (t('LifeSteal')) bump('lifesteal', 0.8);
  if (t('SpellVamp')) bump('spellvamp', 0.8);
  if (t('Tenacity')) bump('tenacity', 1);
  return v;
}

// ─── Champion + situation → stat weights (the only heuristic) ────────────────

function buildWeights(
  input: ItemInput,
  buildStyle: BuildStyle,
  facingAP: boolean,
  facingAD: boolean,
): Weights {
  const w = champProfile(input.championTags);
  const add = (c: Cat, n: number) => { w[c] = (w[c] ?? 0) + n; };

  // Every champion values some movement speed — keeps boots on the radar.
  add('movespeed', 0.5);

  const behind = input.goldAdvantage < -1500;
  const defensive = buildStyle === 'defensive' || behind;

  // Pull resistances toward the damage type that actually threatens us. The
  // resistance the enemy forces should outweigh raw health when behind.
  const armorPull = defensive ? 3.5 : 1;
  const mrPull = defensive ? 3.5 : 1;
  if (facingAD) add('armor', armorPull);
  if (facingAP) add('mr', mrPull);
  if (defensive) add('health', 1.5);

  // When ahead, lean harder into offense + penetration.
  if (buildStyle === 'aggressive') {
    if ((w.ap ?? 0) >= (w.ad ?? 0)) { add('ap', 1); add('magicpen', 1.5); }
    else { add('ad', 1); add('armorpen', 1.5); }
  }
  return w;
}

// Maps a champion's Data Dragon class tags to the stats that class wants. Multi-
// class champions merge naturally. No item IDs here — only stat preferences.
function champProfile(tags: string[]): Weights {
  const w: Weights = {};
  const add = (c: Cat, n: number) => { w[c] = (w[c] ?? 0) + n; };
  const has = (t: string) => tags.includes(t);
  const apAssassin = has('Assassin') && has('Mage');

  if (has('Marksman')) { add('ad', 3); add('attackspeed', 3); add('crit', 3); add('lifesteal', 1.5); add('armorpen', 1.5); add('onhit', 1); }
  if (has('Mage')) { add('ap', 3); add('magicpen', 2); add('haste', 2); add('mana', 1.5); }
  if (has('Assassin')) {
    if (apAssassin) { add('ap', 3); add('magicpen', 2); }
    else { add('ad', 3); add('armorpen', 2.5); }
    add('haste', 1);
  }
  if (has('Fighter')) { add('ad', 2.5); add('health', 2); add('haste', 1.5); add('attackspeed', 1); add('lifesteal', 1); add('armorpen', 1); }
  if (has('Tank')) { add('health', 3); add('armor', 2); add('mr', 2); add('haste', 1.5); add('tenacity', 1); }
  if (has('Support')) { add('haste', 2); add('health', 1.5); add('mana', 1); add('armor', 1); add('mr', 1); add('movespeed', 1); }

  if (Object.keys(w).length === 0) { add('ad', 2); add('health', 1); } // unknown → bruiser-ish
  return w;
}

// ─── Swaps / completion (recipe-aware, unchanged in spirit) ──────────────────

function computeSwaps(
  input: ItemInput,
  targets: ItemSuggestion[],
  protectComponentsOf: ItemSuggestion[] = targets,
): ItemSwap[] {
  const targetIds = new Set(targets.map(d => d.itemId));
  const bootsIds = bootsOrTrinketIds(input, 'boots');
  const trinketIds = bootsOrTrinketIds(input, 'trinket');

  // Never sell a component of any item we're suggesting — it completes the build.
  const desiredComponents = new Set<number>();
  if (input.componentsOf) {
    for (const d of protectComponentsOf) {
      for (const c of input.componentsOf(d.itemId)) desiredComponents.add(c);
    }
  }

  const replaceable = input.ownedItemIds.filter(
    id =>
      id &&
      !trinketIds.has(id) &&
      !bootsIds.has(id) &&
      !targetIds.has(id) &&
      !desiredComponents.has(id),
  );

  const swaps: ItemSwap[] = [];
  let ri = 0;
  for (const item of targets) {
    if (ri >= replaceable.length) break;
    swaps.push({ outItemId: replaceable[ri++], in: item });
  }
  return swaps.slice(0, 3);
}

function ownsComponentOf(input: ItemInput, itemId: number): boolean {
  if (!input.componentsOf) return false;
  return input.componentsOf(itemId).some(c => input.ownedItemIds.includes(c));
}

// Set of owned boots/trinket IDs, derived from the live pool (data-driven).
function bootsOrTrinketIds(input: ItemInput, kind: 'boots' | 'trinket'): Set<number> {
  const pool = input.items ?? [];
  const pick = (it: ItemMeta) => (kind === 'boots' ? it.isBoots : it.isTrinket);
  return new Set(pool.filter(pick).map(it => it.id));
}

// ─── Presentation helpers ────────────────────────────────────────────────────

function toSuggestion(it: ItemMeta, weights: Weights, antiHeal: boolean, _score: number): ItemSuggestion {
  return {
    itemId: it.id,
    name: it.name,
    priority: itemPriority(it, antiHeal),
    reason: itemReason(it, weights, antiHeal),
  };
}

function itemPriority(it: ItemMeta, antiHeal: boolean): ItemSuggestion['priority'] {
  if (antiHeal && it.grievous) return 'situational';
  const v = itemVector(it);
  const def = (v.armor ?? 0) + (v.mr ?? 0) + (v.health ?? 0);
  const off = (v.ad ?? 0) + (v.ap ?? 0) + (v.attackspeed ?? 0) + (v.crit ?? 0);
  if (def > off) return 'defensive';
  return 'core';
}

function itemReason(it: ItemMeta, weights: Weights, antiHeal: boolean): string {
  if (antiHeal && it.grievous) return 'Aplica Heridas Graves — corta el sustain enemigo';
  const v = itemVector(it);
  // Name the highest-weighted category this item actually provides.
  let best: Cat | null = null;
  let bestW = -1;
  for (const cat of Object.keys(v) as Cat[]) {
    const contrib = (weights[cat] ?? 0) * (v[cat] ?? 0);
    if (contrib > bestW) { bestW = contrib; best = cat; }
  }
  return best ? CAT_REASON[best] : 'Buen valor de stats para tu campeón';
}

const CAT_REASON: Record<Cat, string> = {
  ad: 'Daño físico para tu campeón',
  ap: 'Poder de habilidad para tu campeón',
  attackspeed: 'Velocidad de ataque — DPS sostenido',
  crit: 'Golpe crítico — pico de daño',
  armorpen: 'Penetración de armadura — vs tanques',
  magicpen: 'Penetración mágica — vs MR',
  haste: 'Aceleración de habilidad — más rotaciones',
  lifesteal: 'Robo de vida — sustain en línea',
  spellvamp: 'Robo de vida con habilidades',
  onhit: 'Efectos on-hit — DPS continuo',
  health: 'Vida — durabilidad en peleas',
  armor: 'Armadura — reduce daño físico',
  mr: 'Resistencia mágica — reduce daño AP',
  mana: 'Maná — sostén tu rotación',
  tenacity: 'Tenacidad — menos CC',
  movespeed: 'Velocidad de movimiento — posicionamiento',
};

function getPhase(gameTime: number): GamePhase {
  if (gameTime < 600) return 'early';
  if (gameTime < 1500) return 'mid';
  return 'late';
}

function getBuildStyle(goldAdv: number, hasHealing: boolean): BuildStyle {
  if (hasHealing) return 'anti-heal';
  if (goldAdv > 2000) return 'aggressive';
  if (goldAdv < -1000) return 'defensive';
  return 'balanced';
}

function buildReasoning(phase: GamePhase, antiHeal: boolean, goldAdv: number): string {
  const parts: string[] = [`Fase: ${phase}`];
  const adv = Math.round(goldAdv);
  if (adv > 2000) parts.push(`estás ${adv.toLocaleString()}g adelante — maximizá daño`);
  else if (adv < -1000) parts.push(`estás ${Math.abs(adv).toLocaleString()}g atrás — priorizar durabilidad`);
  if (antiHeal) parts.push('enemigo con healing — anti-heal obligatorio');
  return parts.join('. ') + '.';
}
