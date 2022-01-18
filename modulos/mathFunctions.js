exports.todayDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const intMonth = date.getMonth() + 1;
    const strMonth = (intMonth < 10) ? `0${intMonth}` : `${intMonth}`;
    const intDay = date.getDate();
    const strDay = (intDay < 10) ? `0${intDay}` : `${intDay}`;
    return `${year}-${strMonth}-${strDay}`;
}

const POKEMON_LEVEL = 100;
exports.calculateHP = (base_hp, ev_hp, iv_hp) => Math.floor(0.01 * (2 * base_hp + iv_hp + Math.floor(0.25 * ev_hp)) * POKEMON_LEVEL) + POKEMON_LEVEL + 10;
exports.calculateStat = (base_stat, ev, iv, natureMultiplier) => Math.floor((Math.floor(0.01 * (2 * base_stat + iv + Math.floor(0.25 * ev)) * POKEMON_LEVEL) + 5) * natureMultiplier);
exports.battleStat = stat => stat.baseStat * getStatsMultiplier(stat.stage);

const randomNumberInInterval = (max, min) => Math.floor(Math.random() * (max - min + 1) + min);
exports.probability = (prob, of) => Math.random() * of > of - prob;
exports.damageCalculator = (power, atk, def, weatherMultiplier, isCritical, stab, effectiveness, isBurned) => {
    const attack = (isCritical && getStatsMultiplier(atk.stage) < 1) ? atk.baseStat : atk.baseStat * getStatsMultiplier(atk.stage);
    const defense = (isCritical && getStatsMultiplier(def.stage) > 1) ? def.baseStat : def.baseStat * getStatsMultiplier(def.stage);

    const baseDamage = ((0.4 * POKEMON_LEVEL + 2) * power * attack / defense) / 50 + 2;
    const damageWithMultipliers = baseDamage * weatherMultiplier * stab * effectiveness * isBurned;
    const critHit = (isCritical) ? damageWithMultipliers * 2 : damageWithMultipliers;
    const damageAfterRandomMultiplier = Math.floor(critHit * randomNumberInInterval(85, 100) * 0.01);
    return damageAfterRandomMultiplier;
}

exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getStatsMultiplier = statStage => Math.max(2, 2 + statStage) / Math.max(2, 2 - statStage);
exports.getStatsMultiplier = getStatsMultiplier;
const getAccEvaMultiplier = statStage => Math.max(3, 3 + statStage) / Math.max(3, 3 - statStage);
exports.getAccEvaMultiplier = getAccEvaMultiplier;

exports.chooseRandom = choices => {
    const index = Math.floor(Math.random() * choices.length);
    return choices[index];
}
