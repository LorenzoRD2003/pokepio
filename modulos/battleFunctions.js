const mathFunctions = require("./mathFunctions");

exports.resetBattle = battle => {
    battle.players = 0;
    battle.id = null;
    battle.room = null;
    battle.user1 = null;
    battle.user2 = null;
    battle.result = "";
}

/**
 * Devuelve cuál jugador actúa primero 
 * @param {Object} player 
 * @param {Object} opponent 
 * @returns {Boolean} true si es player, false si es opponent
 */
exports.whoActsFirst = (player, opponent) => {
    if (player.chosenAction.priority > opponent.chosenAction.priority) {
        return true;
    } else if (player.chosenAction.priority < opponent.chosenAction.priority) {
        return false;
    } else if (mathFunctions.battleStat(player.activePokemon.stats.spe) > mathFunctions.battleStat(opponent.activePokemon.stats.spe)) {
        return true;
    } else if (mathFunctions.battleStat(player.activePokemon.stats.spe) < mathFunctions.battleStat(opponent.activePokemon.stats.spe)) {
        return false;
    } else if (mathFunctions.probability(50, 100)) {
        return true;
    } else {
        return false;
    }
}

exports.useAction = (player, opponent, action) => {
    if (action.name) { // Si es un movimiento
        let damage;
        console.log(action);
        action.pp--; // Reduzco un PP del movimiento

        // Si acierta el movimiento, se ejecuta lo demás
        if (hasHit(player.activePokemon.stats.acc, opponent.activePokemon.stats.eva, action)) {
            switch (action.damage_class) {
                case "special":
                    damage = mathFunctions.damageCalculator(
                        action.power,
                        player.activePokemon.stats.spa,
                        opponent.activePokemon.stats.spd,
                        1, // Clima
                        criticalHit(player.activePokemon, action), // Golpe crítico
                        stab(player.activePokemon, action), // Stab
                        effectiveness(opponent.activePokemon, action), // Efectividad,
                        1 // Quemado (no afecta en movimientos especiales)
                    );
                    reduceHP(opponent.activePokemon, damage);
                    break;
                case "physical":
                    damage = mathFunctions.damageCalculator(
                        action.power,
                        player.activePokemon.stats.atk,
                        opponent.activePokemon.stats.def,
                        1, // Clima
                        criticalHit(player.activePokemon, action), // Golpe crítico
                        stab(player.activePokemon, action), // Stab
                        effectiveness(opponent.activePokemon, action), // Efectividad,
                        isBurnedMultiplier(player.activePokemon) // Quemado
                    );
                    reduceHP(opponent.activePokemon, damage);
                    break;
                case "status":
                    break;
                default:
                    console.log("error movimiento");
                    break;
            }
        }
    }
}

const hasHit = (acc, eva, move) => {
    let accuracy = 100;
    accuracy *= acc.multiplier;
    accuracy *= 1/eva.multiplier;
    accuracy *= move.accuracy / 100;
    return mathFunctions.probability(accuracy, 100);
}

/**
 * Devuelve el multiplicador de daño si es crítico o no.
 * @param {Object} pokemon 
 * @param {Object} move 
 * @returns {Boolean} true o false.
 */
const criticalHit = (pokemon, move) => {
    let criticalRate = 0;
    criticalRate += move.crit_rate;
    switch (criticalRate) {
        case 0:
            return mathFunctions.probability(1, 16);
        case 1:
            return mathFunctions.probability(1, 8);
        case 2:
            return mathFunctions.probability(1, 4);
        case 3:
            return mathFunctions.probability(1, 3);
        case 4:
            return mathFunctions.probability(1, 2);
    }
}

/**
 * Devuelve el multiplicador por STAB de un movimiento respecto a un Pokémon.
 * @param {Object} pokemon 
 * @param {Object} move 
 * @returns {Number} 1.5 si es verdadero, 1 si es falso.
 */
const stab = (pokemon, move) => {
    const found = pokemon.types.find(pokemonType => pokemonType.name == move.type);
    return (found) ? 1.5 : 1;
}

/**
 * Devuelve el multiplicador por efectividad.
 * @param {Object} pokemon Pokémon que recibe el ataque.
 * @param {Object} move 
 * @return {Number}
 */
const effectiveness = (pokemon, move) => {
    let multiplier = 1;
    pokemon.types.forEach(type => {
        if (type.double_damage_from.includes(move.type)) {
            console.log("Super efectivo");
            multiplier *= 2;
        } else if (type.half_damage_from.includes(move.type)) {
            console.log("Poco efectivo");
            multiplier *= 0.5;
        } else if (type.no_damage_from.includes(move.type)) {
            console.log("Inmune");
            multiplier *= 0;
        }
    });
    return multiplier;
}

/**
 * Devuelve el multiplicador de daño si está quemado o no
 * @param {Object} pokemon 
 * @returns {Number}
 */
const isBurnedMultiplier = pokemon => {
    let multiplier = 1;
    if (pokemon.status == "burned") {
        multiplier = 0.5;
    }
    return multiplier;
}

/**
 * Reduce la vida del Pokémon
 * @param {Object} pokemon 
 * @param {Number} damage
 */
const reduceHP = (pokemon, damage) => {
    pokemon.stats.hp.currentHP -= damage;
}

