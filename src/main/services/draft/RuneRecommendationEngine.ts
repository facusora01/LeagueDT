// Rune page suggestions. Every id/name/icon is resolved from the live Data
// Dragon runesReforged dataset injected at runtime — nothing about which runes
// exist is hardcoded here. The only heuristic is the class → page *plan*, which
// references runes by their stable Data Dragon string keys (e.g. 'LethalTempo'),
// not by numeric id, so it survives icon/name/localization changes upstream.

export interface RuneRef {
  id: number;
  name: string;
}

export interface RuneRecommendation {
  primaryTree: RuneRef;
  keystone: RuneRef;
  primaryRunes: RuneRef[];   // minor runes from the primary tree
  secondaryTree: RuneRef;
  secondaryRunes: RuneRef[]; // two picks from the secondary tree
  reasoning: string;
}

// Subset of the Data Dragon runesReforged shape that we read.
export interface RuneTree {
  id: number;
  key: string;
  name: string;
  slots: { runes: { id: number; key: string; name: string }[] }[];
}

// A page expressed entirely in Data Dragon keys — resolved against live data.
interface RunePlan {
  primary: string;          // primary tree key
  keystone: string;         // keystone rune key
  primaryPicks: string[];   // minor rune keys from the primary tree
  secondary: string;        // secondary tree key
  secondaryPicks: string[]; // rune keys from the secondary tree
  reasoning: string;
}

// Checked in priority order — the most build-defining tag wins.
const CLASS_ORDER: Array<{ tag: string; plan: RunePlan }> = [
  {
    tag: 'Marksman',
    plan: {
      primary: 'Precision', keystone: 'LethalTempo',
      primaryPicks: ['PresenceOfMind', 'LegendAlacrity', 'CoupDeGrace'],
      secondary: 'Domination', secondaryPicks: ['TasteOfBlood', 'RelentlessHunter'],
      reasoning: 'ADC: velocidad de ataque sostenida + escalado en peleas largas.',
    },
  },
  {
    tag: 'Assassin',
    plan: {
      primary: 'Domination', keystone: 'Electrocute',
      primaryPicks: ['SuddenImpact', 'SixthSense', 'UltimateHunter'],
      secondary: 'Precision', secondaryPicks: ['Triumph', 'CoupDeGrace'],
      reasoning: 'Assassin: burst para eliminar objetivos squishy rápido.',
    },
  },
  {
    tag: 'Mage',
    plan: {
      primary: 'Sorcery', keystone: 'ArcaneComet',
      primaryPicks: ['ManaflowBand', 'Transcendence', 'Scorch'],
      secondary: 'Inspiration', secondaryPicks: ['BiscuitDelivery', 'CosmicInsight'],
      reasoning: 'Mago: daño de poke seguro a distancia + sostén de maná.',
    },
  },
  {
    tag: 'Tank',
    plan: {
      primary: 'Resolve', keystone: 'Aftershock',
      primaryPicks: ['FontOfLife', 'Conditioning', 'Overgrowth'],
      secondary: 'Inspiration', secondaryPicks: ['MagicalFootwear', 'CosmicInsight'],
      reasoning: 'Tank: resistencias tras hacer CC para iniciar peleas.',
    },
  },
  {
    tag: 'Fighter',
    plan: {
      primary: 'Precision', keystone: 'Conqueror',
      primaryPicks: ['Triumph', 'LegendAlacrity', 'LastStand'],
      secondary: 'Resolve', secondaryPicks: ['BonePlating', 'Overgrowth'],
      reasoning: 'Bruiser: daño escalado + durabilidad en combates extendidos.',
    },
  },
  {
    tag: 'Support',
    plan: {
      primary: 'Resolve', keystone: 'Guardian',
      primaryPicks: ['FontOfLife', 'BonePlating', 'Revitalize'],
      secondary: 'Inspiration', secondaryPicks: ['MagicalFootwear', 'CosmicInsight'],
      reasoning: 'Support: protección para tu ADC y utilidad de equipo.',
    },
  },
];

const FALLBACK: RunePlan = {
  primary: 'Precision', keystone: 'PressTheAttack',
  primaryPicks: ['Triumph', 'LegendAlacrity', 'CoupDeGrace'],
  secondary: 'Domination', secondaryPicks: ['TasteOfBlood', 'RelentlessHunter'],
  reasoning: 'Página equilibrada de daño.',
};

export function recommendRunes(tags: string[], trees: RuneTree[]): RuneRecommendation | null {
  if (!trees || trees.length === 0) return null;

  const plan = CLASS_ORDER.find(c => tags.includes(c.tag))?.plan ?? FALLBACK;
  const primaryTree = trees.find(t => t.key === plan.primary);
  const secondaryTree = trees.find(t => t.key === plan.secondary);
  if (!primaryTree || !secondaryTree) return null;

  const keystone = findRune(primaryTree, plan.keystone);
  if (!keystone) return null;

  return {
    primaryTree: { id: primaryTree.id, name: primaryTree.name },
    keystone,
    primaryRunes: resolve(primaryTree, plan.primaryPicks),
    secondaryTree: { id: secondaryTree.id, name: secondaryTree.name },
    secondaryRunes: resolve(secondaryTree, plan.secondaryPicks),
    reasoning: plan.reasoning,
  };
}

// Finds a rune anywhere in a tree's slots by its Data Dragon key.
function findRune(tree: RuneTree, key: string): RuneRef | null {
  for (const slot of tree.slots) {
    const r = slot.runes.find(x => x.key === key);
    if (r) return { id: r.id, name: r.name };
  }
  return null;
}

function resolve(tree: RuneTree, keys: string[]): RuneRef[] {
  return keys.map(k => findRune(tree, k)).filter((r): r is RuneRef => r !== null);
}
