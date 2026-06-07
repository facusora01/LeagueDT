import { recommendItems, type ItemInput } from '../ItemRecommendationEngine';

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
    ...overrides,
  };
}

describe('recommendItems', () => {
  test('returns a valid build recommendation', () => {
    const result = recommendItems(baseInput());
    expect(result.items).toBeDefined();
    expect(result.phase).toBeDefined();
    expect(result.buildStyle).toBeDefined();
    expect(result.reasoning).toBeTruthy();
  });

  test('detects early phase for < 10 min', () => {
    const result = recommendItems(baseInput({ gameTime: 300 }));
    expect(result.phase).toBe('early');
  });

  test('detects mid phase for 10-25 min', () => {
    const result = recommendItems(baseInput({ gameTime: 900 }));
    expect(result.phase).toBe('mid');
  });

  test('detects late phase for > 25 min', () => {
    const result = recommendItems(baseInput({ gameTime: 1600 }));
    expect(result.phase).toBe('late');
  });

  test('returns aggressive style when gold advantage > 2000', () => {
    const result = recommendItems(baseInput({ goldAdvantage: 3000 }));
    expect(result.buildStyle).toBe('aggressive');
  });

  test('returns defensive style when gold deficit > 1000', () => {
    const result = recommendItems(baseInput({ goldAdvantage: -2000 }));
    expect(result.buildStyle).toBe('defensive');
  });

  test('returns anti-heal style when enemy has healing', () => {
    const result = recommendItems(baseInput({ enemyHasHealing: true }));
    expect(result.buildStyle).toBe('anti-heal');
  });

  test('anti-heal item included when enemy has healing (AP champion)', () => {
    const result = recommendItems(baseInput({ enemyHasHealing: true, championTags: ['Mage'] }));
    const hasAntiHeal = result.items.some(i => i.itemId === 3165); // Morellonomicon
    expect(hasAntiHeal).toBe(true);
  });

  test('anti-heal item included when enemy has healing (AD champion)', () => {
    const result = recommendItems(baseInput({ enemyHasHealing: true, championTags: ['Marksman'] }));
    const hasAntiHeal = result.items.some(i => i.itemId === 3033); // Mortal Reminder
    expect(hasAntiHeal).toBe(true);
  });

  test('does not suggest already owned items', () => {
    // Own Morellonomicon (3165)
    const result = recommendItems(baseInput({ enemyHasHealing: true, ownedItemIds: [3165] }));
    const hasMorello = result.items.some(i => i.itemId === 3165);
    expect(hasMorello).toBe(false);
  });

  test('returns at most 6 item suggestions', () => {
    const result = recommendItems(baseInput());
    expect(result.items.length).toBeLessThanOrEqual(6);
  });

  test('each item has a non-empty reason', () => {
    const result = recommendItems(baseInput());
    for (const item of result.items) {
      expect(item.reason).toBeTruthy();
      expect(item.name).toBeTruthy();
    }
  });

  test('marksman champion gets ADC items', () => {
    const result = recommendItems(baseInput({ championTags: ['Marksman'], goldAdvantage: 3000 }));
    const hasADCItem = result.items.some(i => [3031, 6671, 6672].includes(i.itemId));
    expect(hasADCItem).toBe(true);
  });

  test('full build suggests swaps instead of nothing', () => {
    const result = recommendItems(baseInput({
      championTags: ['Marksman'],
      ownedItemIds: [3031, 6672, 3036, 3072, 3046, 3006], // 6 filled slots
      goldAdvantage: -2000,
      threatenedByAD: true,
      threatenedByAP: false,
    }));
    expect(result.items).toHaveLength(0);
    expect(result.swaps.length).toBeGreaterThan(0);
    // each swap replaces an owned item with a desired one
    for (const s of result.swaps) {
      expect(result.swaps.every(x => x.in.itemId !== s.outItemId)).toBe(true);
      expect(s.in.itemId).toBeGreaterThan(0);
    }
  });

  test('never sells a component of the item it recommends', () => {
    // Slots full, but two of them (1038 B.F. Sword) are components of Infinity
    // Edge (3031), which the engine wants for a fed AD. It must not tell us to
    // sell a B.F. Sword to buy Infinity Edge.
    const result = recommendItems(baseInput({
      championTags: ['Fighter'],
      ownedItemIds: [1038, 1038, 1018, 1037, 1043, 3035], // 6 slots, 2x B.F. Sword
      goldAdvantage: 3000,
      componentsOf: (id) => (id === 3031 ? [1038, 1018] : []),
    }));
    expect(result.swaps.every(s => s.outItemId !== 1038)).toBe(true);
  });

  test('recommends completing an in-progress item instead of selling, at 6 slots', () => {
    const result = recommendItems(baseInput({
      championTags: ['Fighter'],
      ownedItemIds: [1038, 1018, 1037, 1043, 3035, 3134], // 6 slots, IE components
      goldAdvantage: 3000,
      componentsOf: (id) => (id === 3031 ? [1038, 1018] : []),
    }));
    // Infinity Edge offered as a completion buy, not a swap.
    expect(result.items.some(i => i.itemId === 3031)).toBe(true);
  });

  test('non-full build has no swaps', () => {
    const result = recommendItems(baseInput({ ownedItemIds: [3020] }));
    expect(result.swaps).toHaveLength(0);
    expect(result.items.length).toBeGreaterThan(0);
  });

  test('healingThreat=false suppresses anti-heal even if enemy has healing', () => {
    // A healer exists but is not a threat (e.g. 0/10) → no anti-heal.
    const result = recommendItems(baseInput({ enemyHasHealing: true, healingThreat: false }));
    const hasAntiHeal = result.items.some(i => i.itemId === 3165 || i.itemId === 3033);
    expect(hasAntiHeal).toBe(false);
    expect(result.buildStyle).not.toBe('anti-heal');
  });

  test('healingThreat=true triggers anti-heal', () => {
    const result = recommendItems(baseInput({ championTags: ['Mage'], healingThreat: true }));
    expect(result.items.some(i => i.itemId === 3165)).toBe(true);
  });

  test('threatenedByAP routes to MR defensive items', () => {
    const result = recommendItems(baseInput({
      goldAdvantage: -2000,
      threatenedByAP: true,
      threatenedByAD: false,
    }));
    const hasMR = result.items.some(i => [3065, 3111].includes(i.itemId)); // Spirit Visage / Merc Treads
    expect(hasMR).toBe(true);
    const hasArmor = result.items.some(i => [3075, 3047].includes(i.itemId));
    expect(hasArmor).toBe(false);
  });

  test('threatenedByAD routes to armor defensive items', () => {
    const result = recommendItems(baseInput({
      goldAdvantage: -2000,
      threatenedByAD: true,
      threatenedByAP: false,
    }));
    const hasArmor = result.items.some(i => [3075, 3047].includes(i.itemId)); // Thornmail / Steelcaps
    expect(hasArmor).toBe(true);
  });

  test('defensive items suggested when heavily behind', () => {
    const result = recommendItems(baseInput({
      championTags: ['Mage'],
      goldAdvantage: -3000,
      enemyADCount: 4,
      enemyAPCount: 1,
    }));
    const hasDefensive = result.items.some(i => i.priority === 'defensive');
    expect(hasDefensive).toBe(true);
  });
});
