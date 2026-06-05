import { analyzeComposition, getNeededRoles } from '../TeamCompositionAnalyzer';

describe('analyzeComposition', () => {
  test('empty team has all essential roles missing', () => {
    const result = analyzeComposition([]);
    expect(result.missingRoles).toContain('Tank');
    expect(result.missingRoles).toContain('Marksman');
    expect(result.missingRoles).toContain('Support');
    expect(result.hasFrontline).toBe(false);
    expect(result.hasADC).toBe(false);
    expect(result.hasSupport).toBe(false);
  });

  test('balanced team has no missing essential roles', () => {
    const result = analyzeComposition([
      ['Tank'],
      ['Fighter'],
      ['Mage'],
      ['Marksman'],
      ['Support'],
    ]);
    expect(result.missingRoles).toHaveLength(0);
    expect(result.hasFrontline).toBe(true);
    expect(result.hasADC).toBe(true);
    expect(result.hasSupport).toBe(true);
    expect(result.hasMage).toBe(true);
  });

  test('counts tags correctly', () => {
    const result = analyzeComposition([
      ['Tank', 'Fighter'],
      ['Tank'],
      ['Mage'],
      ['Marksman'],
      ['Support'],
    ]);
    expect(result.tags.Tank).toBe(2);
    expect(result.tags.Fighter).toBe(1);
    expect(result.tags.Mage).toBe(1);
  });

  test('detects frontline from Fighter when no Tank', () => {
    const result = analyzeComposition([
      ['Fighter'],
      ['Fighter'],
      ['Mage'],
      ['Marksman'],
      ['Support'],
    ]);
    expect(result.hasFrontline).toBe(true);
    expect(result.missingRoles).toContain('Tank');
  });

  test('all-assassin team has high weaknesses', () => {
    const result = analyzeComposition([
      ['Assassin'],
      ['Assassin'],
      ['Assassin'],
      ['Assassin'],
      ['Assassin'],
    ]);
    expect(result.hasADC).toBe(false);
    expect(result.hasSupport).toBe(false);
    expect(result.hasFrontline).toBe(false);
    expect(result.weaknesses.length).toBeGreaterThan(2);
  });

  test('balanced team score is higher than incomplete team', () => {
    const balanced = analyzeComposition([
      ['Tank'], ['Mage'], ['Marksman'], ['Support'], ['Fighter'],
    ]);
    const incomplete = analyzeComposition([
      ['Assassin'], ['Assassin'], ['Assassin'],
    ]);
    expect(balanced.score).toBeGreaterThan(incomplete.score);
  });

  test('score is always between 0 and 100', () => {
    const extremes = [
      analyzeComposition([]),
      analyzeComposition([['Tank'], ['Mage'], ['Marksman'], ['Support'], ['Fighter']]),
      analyzeComposition([['Assassin'], ['Assassin'], ['Assassin'], ['Assassin'], ['Assassin']]),
    ];
    for (const r of extremes) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('getNeededRoles', () => {
  test('returns missing essential roles', () => {
    const analysis = analyzeComposition([['Tank'], ['Mage']]);
    const needed = getNeededRoles(analysis);
    expect(needed).toContain('Marksman');
    expect(needed).toContain('Support');
  });

  test('includes Fighter when no frontline exists', () => {
    const analysis = analyzeComposition([['Mage'], ['Marksman'], ['Support']]);
    const needed = getNeededRoles(analysis);
    expect(needed).toContain('Fighter');
  });

  test('balanced team needs nothing', () => {
    const analysis = analyzeComposition([
      ['Tank'], ['Fighter'], ['Mage'], ['Marksman'], ['Support'],
    ]);
    const needed = getNeededRoles(analysis);
    expect(needed).toHaveLength(0);
  });
});
