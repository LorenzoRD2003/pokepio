const { getMessagesArrayFromChat } = require("./databaseFunctions");
const mathFunctions = require("./mathFunctions");

exports.resetBattle = battle => {
    battle.players = 0;
    battle.id = null;
    battle.room = null;
    battle.user1 = null;
    battle.user2 = null;
    battle.result = "";
    battle.weather = null;
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

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
exports.useAction = (player, opponent, action, turnMessages) => {
    if (action.name) { // Si es un movimiento
        console.log(action);
        action.pp--; // Reduzco un PP del movimiento
        turnMessages.push(`¡${capitalize(player.activePokemon.name)} usó ${action.name}!`);

        // Si acierta el movimiento, se ejecuta lo demás
        if (hasHit(player.activePokemon.stats.acc, opponent.activePokemon.stats.eva, action)) {
            let damage;
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
                    reduceHP(opponent.activePokemon, damage, turnMessages);
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
            moveSecondaryEffects(player.activePokemon, opponent.activePokemon, action, turnMessages);
        } else {
            turnMessages.push(`¡${capitalize(opponent.activePokemon.name)} esquivó el ataque!`);
        }
    }
}

const hasHit = (acc, eva, move) => {
    let accuracy = 100;
    accuracy *= mathFunctions.getAccEvaMultiplier(acc.stage);
    accuracy *= 1 / mathFunctions.getAccEvaMultiplier(eva.stage);
    accuracy *= move.accuracy / 100;
    return mathFunctions.probability(accuracy, 100);
}

/**
 * Devuelve el multiplicador de daño si es crítico o no.
 * @param {Object} pokemon 
 * @param {Object} move 
 * @param {Array} turnMessages
 * @returns {Boolean} true o false.
 */
const criticalHit = (pokemon, move, turnMessages) => {
    let criticalRate = 0;
    criticalRate += pokemon.crit_rate + move.crit_rate;
    let isCrit = false;
    switch (criticalRate) {
        case 0:
            isCrit = mathFunctions.probability(1, 16);
            break;
        case 1:
            isCrit = mathFunctions.probability(1, 8);
            break;
        case 2:
            isCrit = mathFunctions.probability(1, 4);
            break;
        case 3:
            isCrit = mathFunctions.probability(1, 3);
            break;
        case 4:
            isCrit = mathFunctions.probability(1, 2);
            break;
    }
    if (isCrit) turnMessages.push("¡Un golpe crítico!");
    return isCrit;
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
 * @param {Object} move El movimiento.
 * @param {Array} turnMessages
 * @return {Number}
 */
const effectiveness = (pokemon, move, turnMessages) => {
    let multiplier = 1;
    pokemon.types.forEach(type => {
        if (type.double_damage_from.includes(move.type)) {
            multiplier *= 2;
        } else if (type.half_damage_from.includes(move.type)) {
            multiplier *= 0.5;
        } else if (type.no_damage_from.includes(move.type)) {
            multiplier *= 0;
        }
    });
    if (multiplier >= 2) {
        turnMessages.push(`¡Es súper efectivo contra ${capitalize(pokemon.name)}!`);
    } else if (multiplier == 0) {
        turnMessages.push(`${capitalize(pokemon.name)} es inmune al ataque.`);
    } else {
        turnMessages.push(`Es poco efectivo contra ${capitalize(pokemon.name)}...`);
    }
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
 * @param {Array} turnMessages
 */
const reduceHP = (pokemon, damage, turnMessages) => {
    pokemon.stats.hp.currentHP -= damage;
    turnMessages.push(`${capitalize(pokemon.name)} recibió ${damage} puntos de daño.`);
    if (pokemon.stats.hp.currentHP <= 0) {
        pokemon.stats.hp.currentHP = 0;
        pokemon.isAlive = false;
        turnMessages.push(`¡${capitalize(pokemon.name)} fue debilitado!`);
    }
}

const moveSecondaryEffects = (battle, user, opponent, move, turnMessages) => {
    if (!mathFunctions.probability(move.effect_chance, 100)) return;
    switch (move.name) {
        case "fire-punch":
        case "ember":
        case "flamethrower":
        case "fire-blast":
        case "flame-wheel":
        case "sacred-fire":
        case "heat-wave":
        case "blaze-kick":
            burn(opponent, turnMessages); break;
        case "ice-punch":
        case "ice-beam":
        case "blizzard":
        case "powder-snow":
            freeze(opponent, battle.weather, turnMessages); break;
        case "thunder-punch":
        case "body-slam":
        case "thunder-shock":
        case "thunderbolt":
        case "thunder":
        case "lick":
        case "zap-cannon":
        case "spark":
        case "dragon-breath":
            paralyze(opponent, turnMessages); break;
        case "tri-attack":
            let statusChoice = mathFunctions.chooseRandom(["burn", "freeze", "paralysis"]);
            switch (statusChoice) {
                case "burn":
                    burn(opponent, turnMessages); break;
                case "freeze":
                    freeze(opponent, battle.weather, turnMessages); break;
                case "paralysis":
                    paralyze(opponent, turnMessages); break;
                default:
                    break;
            }
            break;
        case "poison-sting":
        case "twineedle":
        case "smog":
        case "sludge":
        case "sludge-bomb":
        case "poison-tail":
            poison(opponent, turnMessages); break;
        case "poison-fang":
            badlyPoison(opponent, turnMessages); break;
        case "stomp":
        case "rolling-kick":
        case "headbutt":
        case "bite":
        case "bone-club":
        case "waterfall":
        case "rock-slide":
        case "hyper-fang":
        case "snore":
        case "twister":
        case "fake-out":
        case "needle-arm":
        case "astonish":
        case "extrasensory":
            flinch(opponent, turnMessages); break;
        case "psybeam":
        case "confusion":
        case "dizzy-punch":
        case "dynamic-punch":
        case "signal-beam":
        case "water-pulse":
            confuse(opponent, turnMessages); break;
        case "aurora-beam":
            changeStatStage(opponent.name, opponent.stats.atk, -1, turnMessages); break;
        case "iron-tail":
        case "crunch":
        case "rock-smash":
        case "crush-claw":
            changeStatStage(opponent.name, opponent.stats.def, -1, turnMessages); break;
        case "mist-ball":
            changeStatStage(opponent.name, opponent.stats.spa, -1, turnMessages); break;
        case "psychic":
        case "shadow-ball":
        case "luster-purge":
            changeStatStage(opponent.name, opponent.stats.spd, -1, turnMessages); break;
        case "bubble-beam":
        case "constrict":
        case "bubble":
        case "icy-wind":
        case "rock-tomb":
        case "mud-shot":
            changeStatStage(opponent.name, opponent.stats.spe, -1, turnMessages); break;
        case "mud-slap":
        case "octazooka":
        case "muddy-water":
            changeStatStage(opponent.name, opponent.stats.acc, -1, turnMessages); break;
        case "metal-claw":
        case "meteor-mash":
            changeStatStage(user.name, user.stats.atk, 1, turnMessages); break;
        case "steel-wing":
            changeStatStage(user.name, user.stats.def, 1, turnMessages); break;
        case "ancient-power":
        case "silver-wind":
            changeStatStage(user.name, user.stats.atk, 1, turnMessages);
            changeStatStage(user.name, user.stats.def, 1, turnMessages);
            changeStatStage(user.name, user.stats.spa, 1, turnMessages);
            changeStatStage(user.name, user.stats.spd, 1, turnMessages);
            changeStatStage(user.name, user.stats.spe, 1, turnMessages);
            break;
        case "superpower":
            changeStatStage(user.name, user.stats.atk, -1, turnMessages);
            changeStatStage(user.name, user.stats.def, -1, turnMessages);
            break;
        case "overheat":
        case "psycho-boost":
            changeStatStage(user.name, user.stats.spa, -2, turnMessages); break;
        default:
            break;
    }
}

const burn = (pokemon, turnMessages) => {
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("fire")) return;
    if (pokemon.otherStatus.safeguard) return;
    pokemon.status = "burned";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue quemado!`);
}
const freeze = (pokemon, weather, turnMessages) => {
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("ice")) return;
    if (weather == "sunny") return;
    if (pokemon.otherStatus.safeguard) return;
    pokemon.status = "frozen";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue congelado!`);
}
const paralyze = (pokemon, turnMessages) => {
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("electric")) return;
    if (pokemon.otherStatus.safeguard) return;
    opponent.status = "paralyzed";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue paralizado!`);
}
const poison = (pokemon, turnMessages) => {
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("poison")) return;
    if (pokemon.types.includes("steel")) return;
    if (pokemon.otherStatus.safeguard) return;
    opponent.status = "poisoned";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue envenenado!`);
}
const badlyPoison = (pokemon, turnMessages) => {
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("poison")) return;
    if (pokemon.types.includes("steel")) return;
    if (pokemon.otherStatus.safeguard) return;
    opponent.status = "badly-poisoned";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue gravemente envenenado!`);
}
const flinch = (pokemon, turnMessages) => {
    pokemon.otherStatus.flinched = true;
    turnMessages.push(`¡${capitalize(pokemon.name)} retrocedió!`);
}
const confuse = (pokemon, turnMessages) => {
    if (pokemon.otherStatus.safeguard) return;
    pokemon.otherStatus.confused = true;
    turnMessages.push(`¡${capitalize(pokemon.name)} está confuso!`);
}
const changeStatStage = (pokemonName, stat, stages, turnMessages) => {
    if (stat.stage == 6 && stages > 0) {
        turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} no puede subir más!`);
        return;
    }
    if (stat.stage == -6 && stages < 0) {
        turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} no puede bajar más!`);
        return;
    }
    switch (stages) {
        case 3:
            turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} subió muchísimo!`);
            break;
        case 2:
            turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} subió mucho!`);
            break;
        case 1:
            turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} subió!`);
            break;
        case -1:
            turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} bajó!`);
            break;
        case -2:
            turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} bajó mucho!`);
            break;
        case -3:
            turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} bajó muchísimo!`);
            break;
        default:
            console.log("error stat stage change");
            break;
    }
    stat.stage += stages;
    if (stat.stage > 6) stat.stage = 6;
    if (stat.stage < -6) stat.stage = 6;
}
