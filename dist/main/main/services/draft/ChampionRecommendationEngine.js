"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendations = generateRecommendations;
const TeamCompositionAnalyzer_1 = require("./TeamCompositionAnalyzer");
// Simplified counter-tag map: which tags tend to counter which
const COUNTER_MAP = {
    Assassin: ['Mage', 'Marksman'],
    Tank: ['Assassin', 'Fighter'],
    Mage: ['Fighter', 'Tank'],
    Fighter: ['Support', 'Mage'],
    Marksman: ['Tank', 'Fighter'],
    Support: ['Assassin'],
};
function generateRecommendations(input) {
    const { allyPicks, enemyPicks, availableChampions, masteries, bannedIds } = input;
    const masteryMap = new Map(masteries.map(m => [m.championId, m]));
    const pickedIds = new Set([
        ...allyPicks.map(c => c.id),
        ...enemyPicks.map(c => c.id),
        ...bannedIds,
    ]);
    const allyAnalysis = (0, TeamCompositionAnalyzer_1.analyzeComposition)(allyPicks.map(c => c.tags));
    const enemyAnalysis = (0, TeamCompositionAnalyzer_1.analyzeComposition)(enemyPicks.map(c => c.tags));
    const neededRoles = (0, TeamCompositionAnalyzer_1.getNeededRoles)(allyAnalysis);
    const candidates = availableChampions.filter(c => !pickedIds.has(c.id));
    const recommendations = candidates.map(champion => {
        const mastery = masteryMap.get(champion.id);
        const reasons = [];
        let score = 0;
        // ── Role fill score (0–40) ────────────────────────────────────────────
        const filledRole = neededRoles.find(role => champion.tags.includes(role)) ?? null;
        if (filledRole) {
            score += 40;
            reasons.push(`Cubre ${filledRole} que falta en el equipo`);
        }
        // ── Mastery score (0–30) ──────────────────────────────────────────────
        if (mastery) {
            const masteryScore = Math.min(30, Math.floor((mastery.level / 7) * 30));
            score += masteryScore;
            reasons.push(`Maestría ${mastery.level} (${mastery.points.toLocaleString()} pts)`);
        }
        // ── Counter score (0–20) ──────────────────────────────────────────────
        let counterCount = 0;
        for (const tag of champion.tags) {
            const countered = COUNTER_MAP[tag] ?? [];
            for (const enemyChamp of enemyPicks) {
                if (enemyChamp.tags.some(et => countered.includes(et))) {
                    counterCount++;
                }
            }
        }
        if (counterCount > 0) {
            const counterScore = Math.min(20, counterCount * 7);
            score += counterScore;
            reasons.push(`Contrajugada efectiva vs. composición enemiga`);
        }
        // ── Synergy score (0–10) ──────────────────────────────────────────────
        if (allyAnalysis.hasADC && champion.tags.includes('Support')) {
            score += 5;
            reasons.push('Synergizes con ADC aliado');
        }
        if (allyAnalysis.hasSupport && champion.tags.includes('Marksman')) {
            score += 5;
            reasons.push('Synergizes con Support aliado');
        }
        if (!allyAnalysis.hasEngage && (champion.tags.includes('Tank') || champion.tags.includes('Fighter'))) {
            score += 10;
            reasons.push('Provee engage que falta');
        }
        // ── Enemy weakness score (bonus) ──────────────────────────────────────
        if (!enemyAnalysis.hasFrontline && (champion.tags.includes('Assassin') || champion.tags.includes('Mage'))) {
            score += 5;
            reasons.push('Explota la falta de frontline enemiga');
        }
        if (reasons.length === 0)
            reasons.push('Pick disponible');
        return {
            champion,
            score: Math.min(100, score),
            reasons,
            masteryLevel: mastery?.level ?? 0,
            masteryPoints: mastery?.points ?? 0,
            fillsRole: filledRole,
        };
    });
    return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}
