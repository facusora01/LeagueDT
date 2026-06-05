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
