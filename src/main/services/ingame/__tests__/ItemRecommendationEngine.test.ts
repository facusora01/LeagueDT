import { recommendItems, type ItemInput, type ItemMeta } from '../ItemRecommendationEngine';

// ─── A small but realistic slice of the live Data Dragon item pool. The engine
// is data-driven, so tests feed real-shaped items and assert it *scores* the
// right ones — nothing about these IDs is baked into the engine.
function meta(o: Partial<ItemMeta> & { id: number }): ItemMeta {
  return {
    name: `item-${o.id}`,
    tags: [],
    stats: {},
    goldTotal: 3000,
    into: [],
    from: [],
    isBoots: false,
    isTrinket: false,
    isConsumable: false,
    sr: true,
    purchasable: true,
    grievous: false,
    requiredChampion: false,
    ...o,
  };
}

const POOL: ItemMeta[] = [
  // AD / crit / on-hit
  meta({ id: 3031, name: 'Infinity Edge', tags: ['Damage', 'CriticalStrike'], stats: { FlatPhysicalDamageMod: 75, FlatCritChanceMod: 0.25 }, from: [1038, 1018] }),
  meta({ id: 6672, name: 'Kraken Slayer', tags: ['Damage', 'AttackSpeed', 'OnHit'], stats: { FlatPhysicalDamageMod: 40, PercentAttackSpeedMod: 0.35 } }),
  meta({ id: 3072, name: 'Bloodthirster', tags: ['Damage', 'LifeSteal'], stats: { FlatPhysicalDamageMod: 55 } }),
  meta({ id: 3036, name: "Lord Dominik's", tags: ['Damage', 'CriticalStrike', 'ArmorPenetration'], stats: { FlatPhysicalDamageMod: 35, FlatCritChanceMod: 0.25 } }),
  // AP
  meta({ id: 3089, name: "Rabadon's", tags: ['SpellDamage'], stats: { FlatMagicDamageMod: 130 } }),
  meta({ id: 6655, name: "Luden's", tags: ['SpellDamage', 'Mana', 'AbilityHaste', 'MagicPenetration'], stats: { FlatMagicDamageMod: 90, FlatMPPoolMod: 600 } }),
  // Anti-heal (Grievous Wounds)
  meta({ id: 3165, name: 'Morellonomicon', tags: ['Health', 'SpellDamage', 'AbilityHaste'], stats: { FlatMagicDamageMod: 75, FlatHPPoolMod: 350 }, grievous: true, goldTotal: 2500 }),
  meta({ id: 3033, name: 'Mortal Reminder', tags: ['Damage', 'CriticalStrike', 'ArmorPenetration'], stats: { FlatPhysicalDamageMod: 35, FlatCritChanceMod: 0.25 }, grievous: true }),
  // Defensive
  meta({ id: 3075, name: 'Thornmail', tags: ['Health', 'Armor'], stats: { FlatArmorMod: 70, FlatHPPoolMod: 350 }, grievous: true, goldTotal: 2700 }),
  meta({ id: 3065, name: 'Spirit Visage', tags: ['Health'], stats: { FlatSpellBlockMod: 60, FlatHPPoolMod: 450 }, goldTotal: 2900 }),
  // Boots
  meta({ id: 3047, name: 'Plated Steelcaps', tags: ['Armor', 'Boots'], stats: { FlatArmorMod: 20, FlatMovementSpeedMod: 45 }, isBoots: true, goldTotal: 1100 }),
  meta({ id: 3111, name: "Mercury's Treads", tags: ['Boots', 'Tenacity'], stats: { FlatSpellBlockMod: 25, FlatMovementSpeedMod: 45 }, isBoots: true, goldTotal: 1100 }),
  meta({ id: 3006, name: "Berserker's Greaves", tags: ['AttackSpeed', 'Boots'], stats: { PercentAttackSpeedMod: 0.35, FlatMovementSpeedMod: 45 }, isBoots: true, goldTotal: 1100 }),
  // Components / noise that must never be recommended directly
  meta({ id: 1038, name: 'B.F. Sword', tags: ['Damage'], stats: { FlatPhysicalDamageMod: 40 }, into: [3031], goldTotal: 1300 }),
  meta({ id: 3340, name: 'Stealth Ward', tags: ['Trinket', 'Vision'], isTrinket: true, purchasable: false, goldTotal: 0 }),
  meta({ id: 2003, name: 'Health Potion', tags: ['Consumable'], isConsumable: true, goldTotal: 50 }),
];

function baseInput(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    championTags: ['Mage'],
    ownedItemIds: [],
    currentGold: 1500,
    gameTime: 600,
    goldAdvantage: 0,
    enemyADCount: 2,
    enemyAPCount: 3,
    enemyHasHealing: false,
    items: POOL,
    ...overrides,
  };
}

describe('recommendItems', () => {
  test('returns a valid build recommendation', () => {
    const result = recommendItems(baseInput());
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.phase).toBeDefined();
    expect(result.buildStyle).toBeDefined();
    expect(result.reasoning).toBeTruthy();
  });

  test('returns nothing when the item pool is empty', () => {
    const result = recommendItems(baseInput({ items: [] }));
    expect(result.items).toHaveLength(0);
  });

  test('never recommends components, trinkets or consumables directly', () => {
    const result = recommendItems(baseInput({ championTags: ['Marksman'], goldAdvantage: 3000 }));
    const ids = result.items.map(i => i.itemId);
    expect(ids).not.toContain(1038); // B.F. Sword (component)
    expect(ids).not.toContain(3340); // trinket
    expect(ids).not.toContain(2003); // consumable
  });

  test('detects early/mid/late phase', () => {
    expect(recommendItems(baseInput({ gameTime: 300 })).phase).toBe('early');
    expect(recommendItems(baseInput({ gameTime: 900 })).phase).toBe('mid');
    expect(recommendItems(baseInput({ gameTime: 1600 })).phase).toBe('late');
  });

  test('build style reflects gold + healing', () => {
    expect(recommendItems(baseInput({ goldAdvantage: 3000 })).buildStyle).toBe('aggressive');
    expect(recommendItems(baseInput({ goldAdvantage: -2000 })).buildStyle).toBe('defensive');
    expect(recommendItems(baseInput({ enemyHasHealing: true })).buildStyle).toBe('anti-heal');
  });

  test('mage gets AP items, not AD', () => {
    const ids = recommendItems(baseInput({ championTags: ['Mage'], goldAdvantage: 3000 })).items.map(i => i.itemId);
    expect(ids).toContain(3089); // Rabadon's
    expect(ids).not.toContain(3072); // Bloodthirster (pure AD)
  });

  test('marksman gets AD/crit items, not pure AP', () => {
    const ids = recommendItems(baseInput({ championTags: ['Marksman'], goldAdvantage: 3000 })).items.map(i => i.itemId);
    expect(ids.some(id => [3031, 6672, 3072, 3036].includes(id))).toBe(true);
    expect(ids).not.toContain(3089); // Rabadon's
  });

  test('anti-heal item surfaces against a sustain threat (AP champ)', () => {
    const ids = recommendItems(baseInput({ healingThreat: true, championTags: ['Mage'] })).items.map(i => i.itemId);
    expect(ids).toContain(3165); // Morellonomicon
  });

  test('anti-heal item surfaces against a sustain threat (AD champ)', () => {
    const ids = recommendItems(baseInput({ healingThreat: true, championTags: ['Marksman'] })).items.map(i => i.itemId);
    expect(ids).toContain(3033); // Mortal Reminder
  });

  test('does not suggest already owned items', () => {
    const result = recommendItems(baseInput({ healingThreat: true, ownedItemIds: [3165] }));
    expect(result.items.some(i => i.itemId === 3165)).toBe(false);
  });

  test('returns at most 6 suggestions, each with a reason', () => {
    const result = recommendItems(baseInput({ championTags: ['Marksman'], goldAdvantage: 3000 }));
    expect(result.items.length).toBeLessThanOrEqual(6);
    for (const i of result.items) {
      expect(i.reason).toBeTruthy();
      expect(i.name).toBeTruthy();
    }
  });

  test('threatenedByAP routes to MR items', () => {
    const ids = recommendItems(baseInput({ goldAdvantage: -2000, threatenedByAP: true, threatenedByAD: false })).items.map(i => i.itemId);
    expect(ids.some(id => [3065, 3111].includes(id))).toBe(true); // Spirit Visage / Merc Treads
  });

  test('threatenedByAD routes to armor items', () => {
    const ids = recommendItems(baseInput({ goldAdvantage: -2000, threatenedByAD: true, threatenedByAP: false })).items.map(i => i.itemId);
    expect(ids.some(id => [3075, 3047].includes(id))).toBe(true); // Thornmail / Steelcaps
  });

  test('defensive item appears when heavily behind vs AD', () => {
    const result = recommendItems(baseInput({ championTags: ['Mage'], goldAdvantage: -3000, threatenedByAD: true }));
    expect(result.items.some(i => i.priority === 'defensive')).toBe(true);
  });

  test('full build suggests swaps instead of nothing', () => {
    const result = recommendItems(baseInput({
      championTags: ['Marksman'],
      ownedItemIds: [3031, 6672, 3075, 3089, 3165, 3006], // 6 slots, leaves AD options open
      goldAdvantage: 3000,
      threatenedByAD: true,
    }));
    expect(result.items).toHaveLength(0);
    expect(result.swaps.length).toBeGreaterThan(0);
    for (const s of result.swaps) {
      expect(s.in.itemId).toBeGreaterThan(0);
      expect(s.in.itemId).not.toBe(s.outItemId);
    }
  });

  test('never sells a component of the item it recommends', () => {
    const result = recommendItems(baseInput({
      championTags: ['Marksman'],
      ownedItemIds: [1038, 1038, 1018, 1037, 1043, 1042], // 6 slots, 2x B.F. Sword
      goldAdvantage: 3000,
      componentsOf: (id) => (id === 3031 ? [1038, 1018] : []),
    }));
    expect(result.swaps.every(s => s.outItemId !== 1038)).toBe(true);
  });

  test('recommends completing an in-progress item instead of selling, at 6 slots', () => {
    const result = recommendItems(baseInput({
      championTags: ['Marksman'],
      ownedItemIds: [1038, 1018, 1037, 1043, 1042, 1051], // 6 slots, owns IE components
      goldAdvantage: 3000,
      componentsOf: (id) => (id === 3031 ? [1038, 1018] : []),
    }));
    expect(result.items.some(i => i.itemId === 3031)).toBe(true);
  });

  test('non-full build has no swaps', () => {
    const result = recommendItems(baseInput({ ownedItemIds: [3020] }));
    expect(result.swaps).toHaveLength(0);
    expect(result.items.length).toBeGreaterThan(0);
  });

  test('healingThreat=false keeps anti-heal styling off', () => {
    const result = recommendItems(baseInput({ enemyHasHealing: true, healingThreat: false }));
    expect(result.buildStyle).not.toBe('anti-heal');
    expect(result.items.every(i => !/Heridas/i.test(i.reason))).toBe(true);
  });
});
