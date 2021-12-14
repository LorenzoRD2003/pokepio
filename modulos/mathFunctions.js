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

const randomNumberInInterval = (max, min) => Math.floor(Math.random() * (max - min + 1) + min);
exports.damageCalculator = (power, attack_stat, defense_stat, weatherMultiplier, isCritical, stab, effectiveness, isBurned) => {
    const baseDamage = ((0.4 * POKEMON_LEVEL + 2) * power * attack_stat/defense_stat)/50 + 2;
    const damageWithMultipliers = baseDamage * weatherMultiplier * isCritical * stab * effectiveness * isBurned;
    const damageAfterRandomMultiplier = Math.floor(damageWithMultipliers * randomNumberInInterval(85, 100) * 0.01);
    return damageAfterRandomMultiplier;
}

exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
