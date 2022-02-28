/**
 * Devuelve la fecha del día de hoy en formato yyyy-mm-dd.
 * @returns Fecha en formato yyyy-mm-dd.
 */
exports.todayDate = () => (new Date).toLocaleDateString("FR-CA");

/**
 * Espera cierta cantidad de tiempo.
 * @param {Number} ms Tiempo en milisegundos.
 * @returns Promesa que se cumple luego de transcurrido el tiempo.
 */
exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Devuelve un valor aleatorio dentro de un intervalo.
 * @param {Number} max Valor máximo.
 * @param {Number} min Valor mínimo.
 * @returns Valor aleatorio.
 */
const randomNumberInInterval = (max, min) => Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Dado un valor de probabilidad sobre otro valor, devuelve si se cumplió la probabilidad.
 * Ejemplo: probability(90, 100) tiene un 90% de probabilidades de devolver true, y un 10% de devolver false.
 * @param {Number} prob Probabilidad.
 * @param {Number} of Sobre cuánto.
 * @returns true/false según se cumplió o no la probabilidad.
 */
exports.probability = (prob, of) => Math.random() * of > of - prob;

/**
 * Devuelve una opción aleatoria de un vector.
 * @param {Array} choices Vector de opciones.
 * @returns Opción elegida aleatoriamente.
 */
exports.chooseRandom = choices => {
    const index = Math.floor(Math.random() * choices.length);
    return choices[index];
}


/**
 * Calcula el valor definitivo para el stat HP de un Pokémon.
 * @param {Number} base_hp Stat base de HP del Pokémon.
 * @param {Number} level Nivel del Pokémon.
 * @param {Number} ev_hp EV's del stat HP.
 * @param {Number} iv_hp IV's del stat HP.
 * @returns Valor definitivo para el stat HP.
 */
exports.calculateHP = (base_hp, level, ev_hp, iv_hp) => Math.floor(0.01 * (2 * base_hp + iv_hp + Math.floor(0.25 * ev_hp)) * level) + level + 10;

/**
 * Calcula el valor definitivo para un stat que no es HP de un Pokémon.
 * @param {Number} base_stat Stat base del Pokémon.
 * @param {Number} level Nivel del Pokémon.
 * @param {Number} ev EV's del stat.
 * @param {Number} iv IV's del stat.
 * @param {Number} natureMultiplier Multiplicador por naturaleza (1, 1.1, 0.9).
 * @returns Valor definitivo para el stat.
 */
exports.calculateStat = (base_stat, level, ev, iv, natureMultiplier) => Math.floor((Math.floor(0.01 * (2 * base_stat + iv + Math.floor(0.25 * ev)) * level) + 5) * natureMultiplier);

/**
 * Devuelve el número que se usa en un stat según su stat base y sus niveles de modificación.
 * @param {Object} stat Stat de un Pokémon.
 * @returns El número que se usa a la hora de calcular con el stat.
 */
const battleStat = stat => stat.baseStat * getStatsMultiplier(stat.stage);
exports.battleStat = battleStat;


/**
 * Calcula el daño de un golpe realizado por un Pokémon a otro.
 * @param {Number} power Poder del movimiento.
 * @param {Object} atk Stat ofensivo del Pokémon atacante.
 * @param {Object} def Stat defensivo del Pokémon receptor.
 * @param {Number} weatherMultiplier Multiplicador de daño por el clima. 
 * @param {Boolean} isCritical Booleano que indica si el movimiento fue un golpe crítico. 
 * @param {Number} stab Multiplicador de daño por STAB.
 * @param {Number} effectiveness Multiplicador de daño por efectividad.
 * @param {Number} isBurned Multiplicador de daño por quemadura.
 * @returns 
 */
exports.damageCalculator = (power, atk, def, weatherMultiplier, isCritical, stab, effectiveness, isBurned) => {
    // Calculo los números a usar como ofensivo y defensivo.
    // Depende de los golpes críticos, ya que estos siempre toman la postura más favorable para el atacante.
    // Entonces, si es crítico se ignora baja del ataque del atacante y/o subida de la defensa del receptor.
    const attack = (isCritical && getStatsMultiplier(atk.stage) < 1) ? atk.baseStat : battleStat(atk);
    const defense = (isCritical && getStatsMultiplier(def.stage) > 1) ? def.baseStat : battleStat(def);

    // Calculo el daño base
    const baseDamage = ((0.4 * POKEMON_LEVEL + 2) * power * attack / defense) / 50 + 2;

    // Daño luego de los multiplicadores
    const damageWithMultipliers = baseDamage * weatherMultiplier * stab * effectiveness * isBurned;
    
    // Si es un golpe crítico, multiplico el daño por 2;
    const critHit = (isCritical) ? damageWithMultipliers * 2 : damageWithMultipliers;

    // Multiplico por un valor aleatorio entre 0.85 y 1
    const damageAfterRandomMultiplier = Math.floor(critHit * randomNumberInInterval(85, 100) * 0.01);
    return damageAfterRandomMultiplier;
}

/**
 * Devuelve el multiplicador de un stat (distinto de acc/eva) dados sus niveles de modificación.
 * @param {Number} statStage Niveles de modificación del stat.
 * @returns Multiplicador.
 */
const getStatsMultiplier = statStage => Math.max(2, 2 + statStage) / Math.max(2, 2 - statStage);
exports.getStatsMultiplier = getStatsMultiplier;

/**
 * Devuelve el multiplicador de los stats acc o eva dados sus niveles de modificación.
 * @param {Number} statStage Niveles de modificación del stat.
 * @returns Multiplicador.
 */
const getAccEvaMultiplier = statStage => Math.max(3, 3 + statStage) / Math.max(3, 3 - statStage);
exports.getAccEvaMultiplier = getAccEvaMultiplier;

