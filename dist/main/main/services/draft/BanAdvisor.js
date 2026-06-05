"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBanSuggestions = generateBanSuggestions;
const TeamCompositionAnalyzer_1 = require("./TeamCompositionAnalyzer");
// Tags that threaten specific ally compositions
const THREAT_MAP = {
    Assassin: ['Mage', 'Support'],
    Tank: ['Assassin'],
    Mage: ['Fighter'],
    Marksman: ['Tank'],
};
function generateBanSuggestions(input) {
    const { allyPicks, allChampions, allyMasteries, alreadyBanned, highPriorityMeta } = input;
    const banned = new Set(alreadyBanned);
    const picked = new Set([...allyPicks.map(c => c.id), ...input.enemyPicks.map(c => c.id)]);
    const allyMasteryMap = new Map(allyMasteries.map(m => [m.championId, m]));
    const allyAnalysis = (0, TeamCompositionAnalyzer_1.analyzeComposition)(allyPicks.map(c => c.tags));
    const candidates = allChampions.filter(c => !banned.has(c.id) && !picked.has(c.id));
    const suggestions = candidates.map(champion => {
        const reasons = [];
        let score = 0;
        // ── Meta priority (0–30) ─────────────────────────────────────────────
        if (highPriorityMeta.includes(champion.id)) {
            score += 30;
            reasons.push('Campeón de alto nivel en la meta actual');
        }
        // ── Ally weakness counter (0–35) ──────────────────────────────────────
        let threatScore = 0;
        for (const tag of champion.tags) {
            const threatens = THREAT_MAP[tag] ?? [];
            for (const threatened of threatens) {
                if (allyAnalysis.tags[threatened] > 0) {
                    threatScore += 12;
                }
            }
        }
        if (threatScore > 0) {
            score += Math.min(35, threatScore);
            reasons.push('Amenaza directa a la composición aliada');
        }
        // ── Ally low mastery penalty — avoid banning allies' comfort picks ────
        // (don't suggest banning something our team is good at)
        const allyMastery = allyMasteryMap.get(champion.id);
        if (allyMastery && allyMastery.level >= 5) {
            score -= 40;
            reasons.length = 0; // clear
            reasons.push('Comfort pick del equipo aliado — no banear');
        }
        // ── High pick rate proxy: many tags coverage = flexible champ ─────────
        if (champion.tags.length >= 2 && !allyMastery) {
            score += 5;
            if (reasons.length === 0)
                reasons.push('Campeón flexible con múltiples roles');
        }
        if (reasons.length === 0 && score > 0)
            reasons.push('Potencial amenaza para el equipo');
        return { champion, score: Math.max(0, Math.min(100, score)), reasons };
    });
    return suggestions
        .filter(s => s.score > 0 && !s.reasons[0]?.includes('no banear'))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}
