// Rune page suggestions per champion class. IDs match Data Dragon
// runesReforged (style + keystone perk IDs) so the UI can resolve icons.

export interface RuneRef {
  id: number;
  name: string;
}

export interface RuneRecommendation {
  primaryTree: RuneRef;
  keystone: RuneRef;
  secondaryTree: RuneRef;
  reasoning: string;
}

const TREES: Record<string, RuneRef> = {
  precision: { id: 8000, name: 'Precisión' },
  domination: { id: 8100, name: 'Dominación' },
  sorcery: { id: 8200, name: 'Brujería' },
  resolve: { id: 8400, name: 'Temple' },
  inspiration: { id: 8300, name: 'Inspiración' },
};

const KEYSTONES: Record<string, RuneRef> = {
  pressAttack: { id: 8005, name: 'Ataque Contundente' },
  lethalTempo: { id: 8008, name: 'Ritmo Letal' },
  conqueror: { id: 8010, name: 'Conquistador' },
  electrocute: { id: 8112, name: 'Electrocutar' },
  darkHarvest: { id: 8128, name: 'Cosecha Oscura' },
  arcaneComet: { id: 8229, name: 'Cometa Arcano' },
  summonAery: { id: 8214, name: 'Invocar a Aery' },
  phaseRush: { id: 8230, name: 'Carrera Veloz' },
  grasp: { id: 8437, name: 'Agarre del No Muerto' },
  aftershock: { id: 8439, name: 'Sacudida' },
  guardian: { id: 8465, name: 'Guardián' },
};

interface ClassConfig {
  primary: RuneRef;
  keystone: RuneRef;
  secondary: RuneRef;
  reasoning: string;
}

// Checked in priority order — the most build-defining tag wins.
const CLASS_ORDER: Array<{ tag: string; config: ClassConfig }> = [
  {
    tag: 'Marksman',
    config: { primary: TREES.precision, keystone: KEYSTONES.lethalTempo, secondary: TREES.domination,
      reasoning: 'ADC: velocidad de ataque sostenida + escalado en peleas largas.' },
  },
  {
    tag: 'Assassin',
    config: { primary: TREES.domination, keystone: KEYSTONES.electrocute, secondary: TREES.precision,
      reasoning: 'Assassin: burst para eliminar objetivos squishy rápido.' },
  },
  {
    tag: 'Mage',
    config: { primary: TREES.sorcery, keystone: KEYSTONES.arcaneComet, secondary: TREES.inspiration,
      reasoning: 'Mago: daño de poke seguro a distancia.' },
  },
  {
    tag: 'Tank',
    config: { primary: TREES.resolve, keystone: KEYSTONES.aftershock, secondary: TREES.inspiration,
      reasoning: 'Tank: resistencias tras hacer CC para iniciar peleas.' },
  },
  {
    tag: 'Fighter',
    config: { primary: TREES.precision, keystone: KEYSTONES.conqueror, secondary: TREES.resolve,
      reasoning: 'Bruiser: daño escalado + durabilidad en combates extendidos.' },
  },
  {
    tag: 'Support',
    config: { primary: TREES.resolve, keystone: KEYSTONES.guardian, secondary: TREES.inspiration,
      reasoning: 'Support: protección para tu ADC y utilidad de equipo.' },
  },
];

const FALLBACK: ClassConfig = {
  primary: TREES.precision,
  keystone: KEYSTONES.pressAttack,
  secondary: TREES.domination,
  reasoning: 'Página equilibrada de daño.',
};

export function recommendRunes(tags: string[]): RuneRecommendation {
  const match = CLASS_ORDER.find(c => tags.includes(c.tag));
  const cfg = match ? match.config : FALLBACK;
  return {
    primaryTree: cfg.primary,
    keystone: cfg.keystone,
    secondaryTree: cfg.secondary,
    reasoning: cfg.reasoning,
  };
}
