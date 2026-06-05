export type ChampionTag = 'Fighter' | 'Tank' | 'Mage' | 'Assassin' | 'Marksman' | 'Support';

export interface TagCounts {
  Fighter: number;
  Tank: number;
  Mage: number;
  Assassin: number;
  Marksman: number;
  Support: number;
}

export interface CompositionAnalysis {
  tags: TagCounts;
  missingRoles: ChampionTag[];
  hasFrontline: boolean;
  hasADC: boolean;
  hasSupport: boolean;
  hasMage: boolean;
  hasEngage: boolean;
  strengths: string[];
  weaknesses: string[];
  score: number; // 0–100
}

const ESSENTIAL_ROLES: ChampionTag[] = ['Tank', 'Marksman', 'Support', 'Mage'];

export function analyzeComposition(allTags: string[][]): CompositionAnalysis {
  const tags: TagCounts = {
    Fighter: 0,
    Tank: 0,
    Mage: 0,
    Assassin: 0,
    Marksman: 0,
    Support: 0,
  };

  for (const championTags of allTags) {
    for (const tag of championTags) {
      if (tag in tags) {
        tags[tag as ChampionTag]++;
      }
    }
  }

  const hasFrontline = tags.Tank > 0 || tags.Fighter > 0;
  const hasADC = tags.Marksman > 0;
  const hasSupport = tags.Support > 0;
  const hasMage = tags.Mage > 0;
  const hasEngage = tags.Tank > 0 || tags.Fighter >= 2;

  const missingRoles: ChampionTag[] = ESSENTIAL_ROLES.filter(r => tags[r] === 0);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (hasFrontline) strengths.push('Frontline presente');
  if (hasADC && hasSupport) strengths.push('Bot lane completa');
  if (tags.Mage + tags.Assassin >= 2) strengths.push('Alto daño magico/burst');
  if (tags.Tank >= 2) strengths.push('Composición tanky — difícil de matar');
  if (tags.Assassin >= 2) strengths.push('Alto potencial de pick');

  if (!hasFrontline) weaknesses.push('Sin frontline — equipo frágil');
  if (!hasADC) weaknesses.push('Falta daño físico sostenido (ADC)');
  if (!hasSupport) weaknesses.push('Sin support — poca utilidad/curación');
  if (!hasMage) weaknesses.push('Daño mágico limitado — predecible');
  if (tags.Assassin >= 3) weaknesses.push('Demasiados assassins — poca sustain en teamfight');
  if (!hasEngage) weaknesses.push('Sin engage — difícil iniciar peleas');

  const score = calculateScore(tags, missingRoles);

  return { tags, missingRoles, hasFrontline, hasADC, hasSupport, hasMage, hasEngage, strengths, weaknesses, score };
}

function calculateScore(tags: TagCounts, missing: ChampionTag[]): number {
  let score = 100;

  // Deduct for each missing essential role
  score -= missing.length * 15;

  // Deduct for too many of same type
  if (tags.Assassin >= 3) score -= 10;
  if (tags.Tank >= 3) score -= 5;
  if (tags.Mage >= 3) score -= 5;

  // Bonus for balance
  const diversity = Object.values(tags).filter(v => v > 0).length;
  score += diversity * 2;

  return Math.max(0, Math.min(100, score));
}

/** Returns which roles the team still needs (for recommendation filtering) */
export function getNeededRoles(analysis: CompositionAnalysis): ChampionTag[] {
  const needed: ChampionTag[] = [...analysis.missingRoles];
  if (!analysis.hasFrontline) needed.push('Fighter');
  return [...new Set(needed)];
}
