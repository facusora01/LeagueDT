"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeComposition = analyzeComposition;
exports.getNeededRoles = getNeededRoles;
const ESSENTIAL_ROLES = ['Tank', 'Marksman', 'Support', 'Mage'];
function analyzeComposition(allTags) {
    const tags = {
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
                tags[tag]++;
            }
        }
    }
    const hasFrontline = tags.Tank > 0 || tags.Fighter > 0;
    const hasADC = tags.Marksman > 0;
    const hasSupport = tags.Support > 0;
    const hasMage = tags.Mage > 0;
    const hasEngage = tags.Tank > 0 || tags.Fighter >= 2;
    const missingRoles = ESSENTIAL_ROLES.filter(r => tags[r] === 0);
    const strengths = [];
    const weaknesses = [];
    if (hasFrontline)
        strengths.push('Frontline presente');
    if (hasADC && hasSupport)
        strengths.push('Bot lane completa');
    if (tags.Mage + tags.Assassin >= 2)
        strengths.push('Alto daño magico/burst');
    if (tags.Tank >= 2)
        strengths.push('Composición tanky — difícil de matar');
    if (tags.Assassin >= 2)
        strengths.push('Alto potencial de pick');
    if (!hasFrontline)
        weaknesses.push('Sin frontline — equipo frágil');
    if (!hasADC)
        weaknesses.push('Falta daño físico sostenido (ADC)');
    if (!hasSupport)
        weaknesses.push('Sin support — poca utilidad/curación');
    if (!hasMage)
        weaknesses.push('Daño mágico limitado — predecible');
    if (tags.Assassin >= 3)
        weaknesses.push('Demasiados assassins — poca sustain en teamfight');
    if (!hasEngage)
        weaknesses.push('Sin engage — difícil iniciar peleas');
    const score = calculateScore(tags, missingRoles);
    return { tags, missingRoles, hasFrontline, hasADC, hasSupport, hasMage, hasEngage, strengths, weaknesses, score };
}
function calculateScore(tags, missing) {
    let score = 100;
    // Deduct for each missing essential role
    score -= missing.length * 15;
    // Deduct for too many of same type
    if (tags.Assassin >= 3)
        score -= 10;
    if (tags.Tank >= 3)
        score -= 5;
    if (tags.Mage >= 3)
        score -= 5;
    // Bonus for balance
    const diversity = Object.values(tags).filter(v => v > 0).length;
    score += diversity * 2;
    return Math.max(0, Math.min(100, score));
}
/** Returns which roles the team still needs (for recommendation filtering) */
function getNeededRoles(analysis) {
    const needed = [...analysis.missingRoles];
    if (!analysis.hasFrontline)
        needed.push('Fighter');
    return [...new Set(needed)];
}
