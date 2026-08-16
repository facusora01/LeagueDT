import { recommendRunes, type RuneTree } from '../RuneRecommendationEngine';

// Mirrors the real Data Dragon runesReforged structure (rune key === name in the
// fixture for readable assertions). The engine resolves everything from this.
const TREE_SLOTS: Record<string, [number, string[][]]> = {
  Domination: [8100, [
    ['Electrocute', 'DarkHarvest', 'HailOfBlades'],
    ['CheapShot', 'TasteOfBlood', 'SuddenImpact'],
    ['SixthSense', 'GrislyMementos', 'DeepWard'],
    ['TreasureHunter', 'RelentlessHunter', 'UltimateHunter'],
  ]],
  Inspiration: [8300, [
    ['GlacialAugment', 'UnsealedSpellbook', 'FirstStrike'],
    ['HextechFlashtraption', 'MagicalFootwear', 'CashBack'],
    ['PerfectTiming', 'TimeWarpTonic', 'BiscuitDelivery'],
    ['CosmicInsight', 'ApproachVelocity', 'JackOfAllTrades'],
  ]],
  Precision: [8000, [
    ['PressTheAttack', 'LethalTempo', 'FleetFootwork', 'Conqueror'],
    ['AbsorbLife', 'Triumph', 'PresenceOfMind'],
    ['LegendAlacrity', 'LegendHaste', 'LegendBloodline'],
    ['CoupDeGrace', 'CutDown', 'LastStand'],
  ]],
  Resolve: [8400, [
    ['GraspOfTheUndying', 'Aftershock', 'Guardian'],
    ['Demolish', 'FontOfLife', 'ShieldBash'],
    ['Conditioning', 'SecondWind', 'BonePlating'],
    ['Overgrowth', 'Revitalize', 'Unflinching'],
  ]],
  Sorcery: [8200, [
    ['SummonAery', 'ArcaneComet', 'PhaseRush', 'DeathfireTouch'],
    ['NullifyingOrb', 'ManaflowBand', 'NimbusCloak'],
    ['Transcendence', 'Celerity', 'AbsoluteFocus'],
    ['Scorch', 'Waterwalking', 'GatheringStorm'],
  ]],
};

let runeId = 9000;
const TREES: RuneTree[] = Object.entries(TREE_SLOTS).map(([key, [id, slots]]) => ({
  id,
  key,
  name: key,
  slots: slots.map(runes => ({ runes: runes.map(k => ({ id: ++runeId, key: k, name: k })) })),
}));

describe('recommendRunes', () => {
  test('returns null when no rune data is loaded', () => {
    expect(recommendRunes(['Mage'], [])).toBeNull();
  });

  test('marksman gets Precision + Lethal Tempo from live data', () => {
    const r = recommendRunes(['Marksman'], TREES)!;
    expect(r.primaryTree.id).toBe(8000);
    expect(r.keystone.name).toBe('LethalTempo');
  });

  test('assassin gets Domination + Electrocute', () => {
    const r = recommendRunes(['Assassin'], TREES)!;
    expect(r.primaryTree.id).toBe(8100);
    expect(r.keystone.name).toBe('Electrocute');
  });

  test('mage gets Sorcery + Arcane Comet', () => {
    const r = recommendRunes(['Mage'], TREES)!;
    expect(r.primaryTree.id).toBe(8200);
    expect(r.keystone.name).toBe('ArcaneComet');
  });

  test('tank gets Resolve + Aftershock', () => {
    const r = recommendRunes(['Tank'], TREES)!;
    expect(r.primaryTree.id).toBe(8400);
    expect(r.keystone.name).toBe('Aftershock');
  });

  test('support gets Resolve + Guardian', () => {
    const r = recommendRunes(['Support'], TREES)!;
    expect(r.primaryTree.id).toBe(8400);
    expect(r.keystone.name).toBe('Guardian');
  });

  test('priority: Marksman beats Fighter when both present', () => {
    const r = recommendRunes(['Fighter', 'Marksman'], TREES)!;
    expect(r.keystone.name).toBe('LethalTempo');
  });

  test('priority: Assassin beats Mage', () => {
    expect(recommendRunes(['Mage', 'Assassin'], TREES)!.keystone.name).toBe('Electrocute');
  });

  test('unknown tags fall back to a balanced page', () => {
    const r = recommendRunes([], TREES)!;
    expect(r.primaryTree.id).toBe(8000);
    expect(r.keystone.name).toBe('PressTheAttack');
    expect(r.reasoning).toBeTruthy();
  });

  test('resolves minor + secondary runes from the dataset', () => {
    const r = recommendRunes(['Marksman'], TREES)!;
    expect(r.primaryRunes.length).toBe(3);
    expect(r.secondaryRunes.length).toBe(2);
    expect(r.primaryRunes.map(x => x.name)).toEqual(['PresenceOfMind', 'LegendAlacrity', 'CoupDeGrace']);
  });

  test('every class has distinct trees + reasoning', () => {
    for (const tag of ['Marksman', 'Assassin', 'Mage', 'Tank', 'Fighter', 'Support']) {
      const r = recommendRunes([tag], TREES)!;
      expect(r.primaryTree.id).not.toBe(r.secondaryTree.id);
      expect(r.reasoning.length).toBeGreaterThan(0);
    }
  });
});
