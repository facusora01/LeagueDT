import type { LiveGameState, LiveGameEvent, StrategicTip, TipCategory, TipPriority } from './types';

// Dragon spawn: 5:00, respawn 5 min after death
const DRAGON_FIRST_SPAWN = 300;
const DRAGON_RESPAWN = 300;
// Baron spawn: 20:00, respawn 6 min after death
const BARON_FIRST_SPAWN = 1200;
const BARON_RESPAWN = 360;
// Tower plates fall at 14:00
const PLATES_FALL = 840;
// Expected CS per minute benchmarks by game phase
const CS_PER_MIN_TARGET = 7; // reasonable for any role
// Vision reminder interval in mid/late game (seconds)
const WARD_REMINDER_INTERVAL = 90;

interface TipsContext {
  lastDragonKillTime: number | null;
  lastBaronKillTime: number | null;
  lastWardReminderTime: number;
  shownTipIds: Set<string>;
}

export function createTipsContext(): TipsContext {
  return {
    lastDragonKillTime: null,
    lastBaronKillTime: null,
    lastWardReminderTime: 0,
    shownTipIds: new Set(),
  };
}

export function generateTips(
  state: LiveGameState,
  ctx: TipsContext,
): StrategicTip[] {
  const tips: StrategicTip[] = [];
  const t = state.gameTime;

  // Update context from events
  for (const ev of state.events) {
    if (ev.name === 'DragonKill') ctx.lastDragonKillTime = ev.time;
    if (ev.name === 'BaronKill') ctx.lastBaronKillTime = ev.time;
  }

  // ── Dragon timing ──────────────────────────────────────────────────────────
  const dragonSpawnTime = ctx.lastDragonKillTime !== null
    ? ctx.lastDragonKillTime + DRAGON_RESPAWN
    : DRAGON_FIRST_SPAWN;

  if (isNear(t, dragonSpawnTime, 60) && !ctx.shownTipIds.has(`dragon:${Math.floor(dragonSpawnTime)}`)) {
    const tipId = `dragon:${Math.floor(dragonSpawnTime)}`;
    tips.push(makeTip(tipId, 'macro', 'high', `Dragón aparece en ~${formatSecs(dragonSpawnTime - t)} — juntá al equipo`, dragonSpawnTime + 30));
    ctx.shownTipIds.add(tipId);
  }

  // ── Baron timing ───────────────────────────────────────────────────────────
  {
    const baronSpawnTime = ctx.lastBaronKillTime !== null
      ? ctx.lastBaronKillTime + BARON_RESPAWN
      : BARON_FIRST_SPAWN;

    if (isNear(t, baronSpawnTime, 90) && !ctx.shownTipIds.has(`baron:${Math.floor(baronSpawnTime)}`)) {
      const tipId = `baron:${Math.floor(baronSpawnTime)}`;
      tips.push(makeTip(tipId, 'macro', 'critical', `Baron Nashor aparece en ~${formatSecs(baronSpawnTime - t)} — wardear pit y prepararse`, baronSpawnTime + 30));
      ctx.shownTipIds.add(tipId);
    }
  }

  // ── Tower plates reminder ──────────────────────────────────────────────────
  if (t < PLATES_FALL && isNear(t, PLATES_FALL, 120) && !ctx.shownTipIds.has('plates')) {
    tips.push(makeTip('plates', 'macro', 'medium', `Las placas de torres caen en ~${formatSecs(PLATES_FALL - t)} — aprovechá el oro extra`, PLATES_FALL));
    ctx.shownTipIds.add('plates');
  }

  // ── CS deficit ──────────────────────────────────────────────────────────────
  // Supports don't farm minions, so the CS benchmark doesn't apply to them.
  const pos = (state.localPlayer.position || '').toUpperCase();
  const isSupport = pos === 'UTILITY' || pos === 'SUPPORT';
  const minElapsed = t / 60;
  if (minElapsed >= 3 && !isSupport) {
    const expectedCS = Math.floor(minElapsed * CS_PER_MIN_TARGET);
    const csDeficit = expectedCS - state.localPlayer.cs;
    // Re-evaluate at most every 3 minutes to avoid spamming the same advice.
    const tipId = `cs:${Math.floor(t / 180)}`;

    if (csDeficit >= 25 && !ctx.shownTipIds.has(tipId)) {
      const priority: TipPriority = csDeficit >= 50 ? 'high' : 'medium';
      tips.push(makeTip(tipId, 'micro', priority, `CS bajo: ${state.localPlayer.cs} (esperado ~${expectedCS}). Enfocate en farmear minions`));
      ctx.shownTipIds.add(tipId);
    }
  }

  // ── Level power spikes ─────────────────────────────────────────────────────
  for (const spikeLvl of [6, 11, 16]) {
    const tipId = `spike:${spikeLvl}`;
    if (state.localPlayer.level >= spikeLvl && !ctx.shownTipIds.has(tipId)) {
      tips.push(makeTip(tipId, 'timing', 'medium', `Nivel ${spikeLvl} — power spike activo. Buscá un all-in o roam`));
      ctx.shownTipIds.add(tipId);
    }
  }

  // ── Vision reminder (mid/late) ─────────────────────────────────────────────
  if (t > 600 && t - ctx.lastWardReminderTime >= WARD_REMINDER_INTERVAL) {
    const wardTipId = `ward:${Math.floor(t / WARD_REMINDER_INTERVAL)}`;
    if (!ctx.shownTipIds.has(wardTipId)) {
      const lowWards = state.localPlayer.wardScore < (t / 60) * 0.5;
      if (lowWards) {
        tips.push(makeTip(wardTipId, 'vision', 'medium', `Ward score bajo (${state.localPlayer.wardScore}) — colocá wards en objetivos`));
        ctx.lastWardReminderTime = t;
        ctx.shownTipIds.add(wardTipId);
      }
    }
  }

  // ── Elder Dragon warning ───────────────────────────────────────────────────
  const dragonKills = state.events.filter(e => e.name === 'DragonKill').length;
  if (dragonKills >= 3) {
    const tipId = 'elder-warning';
    if (!ctx.shownTipIds.has(tipId)) {
      tips.push(makeTip(tipId, 'macro', 'critical', `¡${dragonKills} dragones muertos! El próximo puede ser Elder — objetivo crítico`));
      ctx.shownTipIds.add(tipId);
    }
  }

  return tips;
}

function isNear(current: number, target: number, windowSecs: number): boolean {
  return current >= target - windowSecs && current <= target + 10;
}

function formatSecs(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function makeTip(
  id: string,
  category: TipCategory,
  priority: TipPriority,
  message: string,
  expiresAt?: number,
): StrategicTip {
  return { id, category, priority, message, expiresAt };
}
