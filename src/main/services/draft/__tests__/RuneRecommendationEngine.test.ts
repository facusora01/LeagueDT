import { recommendRunes } from '../RuneRecommendationEngine';

describe('recommendRunes', () => {
  test('marksman gets Precision primary', () => {
    const r = recommendRunes(['Marksman']);
    expect(r.primaryTree.id).toBe(8000);
    expect(r.keystone.id).toBe(8008); // Lethal Tempo
  });

  test('assassin gets Domination + Electrocute', () => {
    const r = recommendRunes(['Assassin']);
    expect(r.primaryTree.id).toBe(8100);
    expect(r.keystone.id).toBe(8112);
  });

  test('mage gets Sorcery', () => {
    expect(recommendRunes(['Mage']).primaryTree.id).toBe(8200);
  });

  test('tank gets Resolve', () => {
    expect(recommendRunes(['Tank']).primaryTree.id).toBe(8400);
  });

  test('support gets Resolve + Guardian', () => {
    const r = recommendRunes(['Support']);
    expect(r.primaryTree.id).toBe(8400);
    expect(r.keystone.id).toBe(8465);
  });

  test('priority: Marksman beats Fighter when both present', () => {
    const r = recommendRunes(['Fighter', 'Marksman']);
    expect(r.primaryTree.id).toBe(8000);
    expect(r.keystone.id).toBe(8008); // marksman keystone, not conqueror
  });

  test('priority: Assassin beats Mage', () => {
    expect(recommendRunes(['Mage', 'Assassin']).keystone.id).toBe(8112);
  });

  test('unknown tags fall back to a balanced page', () => {
    const r = recommendRunes([]);
    expect(r.primaryTree.id).toBe(8000);
    expect(r.keystone).toBeDefined();
    expect(r.reasoning).toBeTruthy();
  });

  test('primary and secondary trees differ', () => {
    for (const tag of ['Marksman', 'Assassin', 'Mage', 'Tank', 'Fighter', 'Support']) {
      const r = recommendRunes([tag]);
      expect(r.primaryTree.id).not.toBe(r.secondaryTree.id);
    }
  });

  test('every recommendation has reasoning', () => {
    for (const tag of ['Marksman', 'Assassin', 'Mage', 'Tank', 'Fighter', 'Support']) {
      expect(recommendRunes([tag]).reasoning.length).toBeGreaterThan(0);
    }
  });
});
