import type { LivePlayerStats, EnemyThreat, ThreatLevel } from './types';

// Rough gold value of common item tiers for gold-lead estimation
const AVG_ITEM_VALUE = 2800;

export function analyzeEnemyThreats(
  enemies: LivePlayerStats[],
  allies: LivePlayerStats[],
): EnemyThreat[] {
  const allyAvgGold = estimateAvgGold(allies);

  return enemies
    .map(enemy => assessThreat(enemy, allyAvgGold))
    .sort((a, b) => b.score - a.score);
}

function assessThreat(enemy: LivePlayerStats, allyAvgGold: number): EnemyThreat {
  const reasons: string[] = [];
  let score = 0;

  // ── KDA score (0–30) ──────────────────────────────────────────────────────
  const kda = enemy.deaths === 0
    ? (enemy.kills + enemy.assists)
    : (enemy.kills + enemy.assists) / enemy.deaths;

  if (kda >= 5) {
    score += 30;
    reasons.push(`KDA excepcional: ${kda.toFixed(1)}`);
  } else if (kda >= 3) {
    score += 20;
    reasons.push(`KDA alto: ${kda.toFixed(1)}`);
  } else if (kda >= 2) {
    score += 10;
  }

  // ── "Fed" detection — many kills + positive kda (0–25) ───────────────────
  if (enemy.kills >= 5 && kda >= 3) {
    score += 25;
    reasons.push(`Muy fed: ${enemy.kills}/${enemy.deaths}/${enemy.assists}`);
  } else if (enemy.kills >= 3 && enemy.deaths === 0) {
    score += 20;
    reasons.push(`Imparable: ${enemy.kills}/${enemy.deaths}/${enemy.assists}`);
  } else if (enemy.kills >= 3) {
    score += 10;
    reasons.push(`${enemy.kills} kills`);
  }

  // ── Gold lead estimate (0–25) ─────────────────────────────────────────────
  const enemyGoldEst = estimatePlayerGold(enemy);
  const goldLead = enemyGoldEst - allyAvgGold;

  if (goldLead > 3000) {
    score += 25;
    reasons.push(`Ventaja de oro estimada: ~${Math.round(goldLead / 100) * 100}g`);
  } else if (goldLead > 1500) {
    score += 15;
    reasons.push(`Ligera ventaja de oro`);
  } else if (goldLead > 500) {
    score += 5;
  }

  // ── Level lead (0–10) ─────────────────────────────────────────────────────
  if (enemy.level >= 16) {
    score += 10;
    reasons.push(`Nivel máximo: ${enemy.level}`);
  } else if (enemy.level >= 11) {
    score += 6;
  } else if (enemy.level >= 6) {
    score += 3;
  }

  // ── Item count (0–10) ─────────────────────────────────────────────────────
  if (enemy.items.length >= 5) {
    score += 10;
    reasons.push(`Build casi completa (${enemy.items.length} items)`);
  } else if (enemy.items.length >= 3) {
    score += 5;
  }

  if (reasons.length === 0) reasons.push('Amenaza estándar');

  const clamped = Math.min(100, score);
  return {
    summonerName: enemy.summonerName,
    championName: enemy.championName,
    threatLevel: toThreatLevel(clamped),
    score: clamped,
    reasons,
    kda,
    estimatedGoldLead: goldLead,
  };
}

function estimatePlayerGold(player: LivePlayerStats): number {
  const itemGold = player.items.length * AVG_ITEM_VALUE;
  const killGold = player.kills * 300;
  const assistGold = player.assists * 150;
  const csGold = player.cs * 20;
  return itemGold + killGold + assistGold + csGold;
}

function estimateAvgGold(players: LivePlayerStats[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + estimatePlayerGold(p), 0);
  return total / players.length;
}

function toThreatLevel(score: number): ThreatLevel {
  if (score >= 70) return 'extreme';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}
