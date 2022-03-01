const mathFunctions = require("./mathFunctions");

/**
 * Reinicia una batalla a sus parámetros base.
 * @param {Object} battle 
 */
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
    // Primero verificamos cuál prioridad es mayor
    if (player.chosenAction.priority > opponent.chosenAction.priority) {
        return true;
    } else if (player.chosenAction.priority < opponent.chosenAction.priority) {
        return false;
    } // Si las prioridades son igualdes, entonces actúa primero el Pokémon más veloz
    else if (mathFunctions.battleStat(player.activePokemon.stats.spe) > mathFunctions.battleStat(opponent.activePokemon.stats.spe)) {
        return true;
    } else if (mathFunctions.battleStat(player.activePokemon.stats.spe) < mathFunctions.battleStat(opponent.activePokemon.stats.spe)) {
        return false;
    } // Si tienen la misma velocidad, entonces se decide al azar.
    else if (mathFunctions.probability(50, 100)) {
        return true;
    } else {
        return false;
    }
}

/**
 * Devuelve una cadena de texto con la primera letra en mayúsculas.
 * @param {String} str Cadena original.
 * @returns Cadena modificada.
 */
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Realiza una acción.
 * @param {Object} player Jugador que realiza la acción.
 * @param {Object} opponent Jugador oponente.
 * @param {Object} action Acción.
 * @param {Array} turnMessages Vector de mensajes.
 * @param {String} weather Clima.
 * @returns 
 */
exports.useAction = (player, opponent, action, turnMessages, weather) => {
    // Primero quiero desarrollar la situación si action es un movimiento
    // Si es un movimiento, action tiene la propiedad .name
    if (action.name) {
        console.log(action);

        // Reduzco un PP del movimiento
        action.pp--;

        // Añado un mensaje al vector de mensajes
        turnMessages.push(`¡${capitalize(player.activePokemon.name)} usó ${capitalize(action.name)}!`);

        // Movimientos que necesitan cargar
        const boolHasFinishedCharging = chargingMoves(player.activePokemon, action, weather, turnMessages);
        if (!boolHasFinishedCharging) return;

        // Movimientos One Hit K.O. - Ignoran precisión y evasión
        const boolOneHitKO = oneHitKO(opponent.activePokemon, action, turnMessages);
        if (boolOneHitKO) return;

        // Si acierta el movimiento, se ejecuta lo demás
        const boolHasHit = hasHit(player.activePokemon.stats.acc, opponent.activePokemon.stats.eva, action);
        if (!boolHasHit) return turnMessages.push(`¡${capitalize(opponent.activePokemon.name)} esquivó el ataque!`);

        // Cuántas veces golpea el movimiento
        const hits = howManyHits(player.activePokemon, action, turnMessages);

        let damage;
        // Segun el tipo de movimiento
        switch (action.damage_class) {
            // Categoría especial
            case "special":
                // Lo hacemos una vez por cada golpe
                for (let i = 1; i <= hits; i++) {
                    // Calculo el daño
                    damage = mathFunctions.damageCalculator(
                        action.power, // Poder del movimiento
                        player.activePokemon.stats.spa, // Ataque especial
                        opponent.activePokemon.stats.spd, // Defensa especial
                        1, // Clima
                        criticalHit(player.activePokemon, action), // Golpe crítico
                        stab(player.activePokemon, action), // STAB
                        effectiveness(opponent.activePokemon, action, turnMessages), // Efectividad
                        1 // Quemado (no afecta en movimientos especiales)
                    );

                    // Reduzco vida al enemigo
                    reduceHP(opponent.activePokemon, damage, turnMessages);

                    // Si el oponente se debilitó, salimos del bucle
                    if (!opponent.activePokemon.isAlive) break;
                }
                break;
            // Categoría física
            case "physical":
                for (let i = 1; i <= hits; i++) {
                    damage = mathFunctions.damageCalculator(
                        action.power, // Poder del movimiento
                        player.activePokemon.stats.atk, // Ataque
                        opponent.activePokemon.stats.def, // Defensa
                        1, // Clima
                        criticalHit(player.activePokemon, action), // Golpe crítico
                        stab(player.activePokemon, action), // STAB
                        effectiveness(opponent.activePokemon, action, turnMessages), // Efectividad
                        isBurnedMultiplier(player.activePokemon) // Quemado
                    );

                    // Reduzco vida al enemigo
                    reduceHP(opponent.activePokemon, damage, turnMessages);

                    // Si el oponente se debilitó, salimos del bucle
                    if (!opponent.activePokemon.isAlive) break;
                }
                break;
            // Categoría de estado
            case "status":
                break;
            default:
                console.log("error movimiento");
                break;
        }

        // CASOS ESPECIALES DE MOVIMIENTOS

        // Movimientos de autodestrucción
        selfDestruct(player.activePokemon, action, turnMessages);

        // Daño de retroceso
        recoilDamage(player.activePokemon, action, damage);

        // Absorber daño
        absorbDamage(player.activePokemon, action, damage, turnMessages);

        // Efectos secundarios
        moveSecondaryEffects(player.activePokemon, opponent.activePokemon, action, turnMessages, weather);

        // Debe descansar luego de usar el movimiento (ejemplo hiperrayo)
        hasToRest(player.activePokemon, action);

        // Movimientos que atrapan al oponente
        trappingMoves(opponent.activePokemon, action, turnMessages);
    }
}

/**
 * Devuelve si el movimiento acertó o falló.
 * @param {Object} acc Precisión del usuario.
 * @param {Object} eva Evasión del oponente.
 * @param {Object} move Movimiento
 * @returns true si acertó, false si falló.
 */
const hasHit = (acc, eva, move) => {
    // Movimientos que no fallan
    const movesThatNeverFail = ["swift", "feint-attack", "vital-throw", "shadow-punch", "aerial-ace", "magical-leaf", "shock-wave"];
    if (movesThatNeverFail.includes(move.name)) return true;

    let accuracy = 100;
    accuracy *= mathFunctions.getAccEvaMultiplier(acc.stage); // Multiplicador de la precisión
    accuracy *= 1 / mathFunctions.getAccEvaMultiplier(eva.stage); // Multiplicador de la evasión
    accuracy *= move.accuracy / 100; // Multiplicador de la precisión del movimiento
    return mathFunctions.probability(accuracy, 100);
}

/**
 * Devuelve el multiplicador de daño si es crítico o no.
 * @param {Object} pokemon Pokémon que usa el movimiento.
 * @param {Object} move Movimiento.
 * @param {Array} turnMessages Vector de mensajes.
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
 * @param {Object} pokemon Pokémon que usa el movimiento.
 * @param {Object} move Movimiento.
 * @returns {Number} 1.5 si es verdadero, 1 si es falso.
 */
const stab = (pokemon, move) => {
    // Necesito saber si el tipo del Pokémon es el mismo que el tipo del movimiento.
    const found = pokemon.types.find(pokemonType => pokemonType.name == move.type);
    return (found) ? 1.5 : 1;
}

/**
 * Devuelve el multiplicador por efectividad.
 * @param {Object} pokemon Pokémon que recibe el ataque.
 * @param {Object} move El movimiento.
 * @param {Array} turnMessages Vector de mensajes
 * @return Multiplicador de daño por efectividad
 */
const effectiveness = (pokemon, move, turnMessages) => {
    let multiplier = 1;
    // Para cada tipo del Pokémon, multiplico lo correspondiente
    pokemon.types.forEach(type => {
        if (type.double_damage_from.includes(move.type)) {
            multiplier *= 2;
        } else if (type.half_damage_from.includes(move.type)) {
            multiplier *= 0.5;
        } else if (type.no_damage_from.includes(move.type)) {
            multiplier *= 0;
        }
    });

    // Hago un
    if (multiplier >= 2) {
        turnMessages.push(`¡Es súper efectivo contra ${capitalize(pokemon.name)}!`);
    } else if (multiplier == 0) {
        turnMessages.push(`${capitalize(pokemon.name)} es inmune al ataque.`);
    } else if (multiplier < 1) {
        turnMessages.push(`Es poco efectivo contra ${capitalize(pokemon.name)}...`);
    }
    return multiplier;
}

/**
 * Devuelve el multiplicador de daño si está quemado o no.
 * @param {Object} pokemon Pokémon a verificar.
 * @returns 0.5 si está quemado, 1 de otro modo.
 */
const isBurnedMultiplier = pokemon => {
    let multiplier = 1;
    if (pokemon.status == "burned") {
        multiplier = 0.5;
    }
    return multiplier;
}

/**
 * Reduce la vida del Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Number} damage Daño recibido.
 * @param {Array} turnMessages Vector de mensajes.
 */
const reduceHP = (pokemon, damage, turnMessages) => {
    // Restamos vida del Pokémon
    pokemon.stats.hp.currentHP -= damage;
    turnMessages.push(`${capitalize(pokemon.name)} recibió ${damage} puntos de daño.`);

    // Si no le queda vida
    if (pokemon.stats.hp.currentHP <= 0) {
        // Dejamos la vida en cero
        pokemon.stats.hp.currentHP = 0;

        // Informamos que el Pokémon fue debilitado
        pokemon.isAlive = false;
        turnMessages.push(`¡${capitalize(pokemon.name)} fue debilitado!`);
    }
}

/**
 * Recupera la vida del Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Number} hp Vida a recuperar. 
 * @param {Array} turnMessages Vector de mensajes.
 */
const restoreHP = (pokemon, hp, turnMessages) => {
    // Sumamos la vida al parámetro del Pokémon
    pokemon.stats.hp.currentHP += hp;

    // Si tiene más vida que la máxima, entonces la dejamos en la máxima
    if (pokemon.stats.hp.currentHP >= pokemon.stats.hp.maxHP) {
        pokemon.stats.stats.hp.currentHP = pokemon.stats.hp.maxHP;
        turnMessages.push(`¡Ahora la vida de ${capitalize(pokemon.name)} está al máximo!`);
    } else {
        turnMessages.push(`${capitalize(pokemon.name)} recuperó ${hp} puntos de vida.`);
    }
}

/**
 * Daño por retroceso al Pokémon según el movimiento y el daño hecho.
 * @param {Object} pokemon Pokémon.
 * @param {Object} move Movimiento.
 * @param {Number} damage Daño realizado al enemigo.
 * @param {Array} turnMessages Vector de mensajes.
 */
const recoilDamage = (pokemon, move, damage, turnMessages) => {
    let recoilMultiplier = 0;
    // Según el movimiento, hay distinto multiplicador de daño por retroceso.
    switch (move.name) {
        case "take-down":
        case "submission":
            recoilMultiplier = 1 / 4; break;
        case "double-edge":
        case "volt-tackle":
            recoilMultiplier = 1 / 3; break;
        default:
            break;
    }

    // Si hay daño de retroceso
    if (recoilMultiplier != 0) {
        // Calculamos vida perdida
        const lostHP = damage * recoilMultiplier;

        // Mostramos el mensaje y reducimos vida del Pokémon
        turnMessages.push(`${capitalize(pokemon.name)} pierde ${lostHP} puntos de vida por daño de retroceso.`);
        reduceHP(pokemon, lostHP, turnMessages);
    }
}

/**
 * Recuperar vida por absorción de daño hecho al enemigo según el movimiento.
 * @param {Object} pokemon Pokémon.
 * @param {Object} move Movimiento.
 * @param {Number} damage Daño realizado al enemigo.
 * @param {Array} turnMessages Vector de mensajes.
 */
const absorbDamage = (pokemon, move, damage, turnMessages) => {
    let absorbMultiplier = 0;
    // Según el movimiento, hay distinto multiplicador de absorción.
    switch (move.name) {
        case "absorb":
        case "mega-drain":
        case "dream-eater":
        case "leech-life":
        case "giga-drain":
            absorbMultiplier = 1 / 2; break;
        default:
            break;
    }

    // Si hay daño por absorción
    if (absorbMultiplier != 0) {
        // Calculamos vida recuperada
        const absorbedHP = damage * absorbMultiplier;

        // Mostramos el mensaje y recuperamos vida del Pokémon
        turnMessages.push(`${capitalize(pokemon.name)} recupera ${absorbedHP} puntos de vida por absorción de daño.`);
        restoreHP(pokemon, absorbedHP, turnMessages);
    }
};

/**
 * Autodestruir a un Pokémon según el movimiento.
 * @param {Object} pokemon Pokémon que usa el movimiento.
 * @param {Object} move Movimiento.
 * @param {Array} turnMessages Vector de mensajes
 */
const selfDestruct = (pokemon, move, turnMessages) => {
    // Si es un ataque que implica autodestruirse
    if (move.name == "self-destruct" || move.name == "explosion") {
        // El Pokémon se debilita
        pokemon.stats.hp.currentHP = 0;
        pokemon.isAlive = false;
        turnMessages.push(`¡${capitalize(pokemon.name)} se auto-destruyó y fue debilitado!`);
    }
}

/**
 * Realiza los efectos secundarios de cada movimiento.
 * @param {Object} user Pokémon que usa el movimiento.
 * @param {Object} opponent Pokémon que recibe el movimiento.
 * @param {Object} move Movimiento.
 * @param {Array} turnMessages Vector de mensajes.
 * @param {String} weather Clima de la batalla.
 */
const moveSecondaryEffects = (user, opponent, move, turnMessages, weather) => {
    // Los efectos secundarios tienen un porcentaje de éxito
    // Si no ocurre el efecto, entonces salimos de la función
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
            freeze(opponent, weather, turnMessages); break;
        case "thunder-punch":
        case "body-slam":
        case "thunder-shock":
        case "thunderbolt":
        case "thunder":
        case "lick":
        case "zap-cannon":
        case "spark":
        case "dragon-breath":
        case "volt-tackle":
            paralyze(opponent, turnMessages); break;
        case "tri-attack":
            let statusChoice = mathFunctions.chooseRandom(["burn", "freeze", "paralysis"]);
            switch (statusChoice) {
                case "burn":
                    burn(opponent, turnMessages); break;
                case "freeze":
                    freeze(opponent, weather, turnMessages); break;
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
        case "sky-attack":
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

/**
 * Hace que el Pokémon deba descansar si usó ciertos movimientos.
 * @param {Object} pokemon Pokémon que usó el movimiento.
 * @param {Object} move Movimiento.
 */
const hasToRest = (pokemon, move) => {
    switch (move.name) {
        case "hyper-beam":
        case "blast-burn":
        case "hydro-cannon":
        case "frenzy-plant":
            // Actualizamos el estado de que debe descansar e impedimos que pueda cambiar
            pokemon.otherStatus.hasToRest = true;
            pokemon.canChange = false;
            break;
    }
}

/**
 * Trabaja con los movimientos que deben cargarse para poderse ejecutar.
 * @param {Object} pokemon Pokémon que usa el movimiento.
 * @param {Object} move Movimiento.
 * @param {String} weather Clima de la batalla.
 * @param {Object} turnMessages Vector de mensajes.
 * @returns true si se libera en este turno, false si debe ser en el turno siguiente
 */
const chargingMoves = (pokemon, move, weather, turnMessages) => {
        switch (move.name) {
        case "skull-bash":
        case "razor-wind":
        case "sky-attack":
        case "solar-beam":
            // En el caso de solar-beam, si el clima es soleado se ejecuta automáticamente
            if (move.name == "solar-beam" && weather == "sunny") return true;

            // Si está cargado, entonces devolvemos true porque se libera en este turno
            if (pokemon.otherStatus.charging_turn) {
                // Ya no está cargado
                pokemon.charging_turn = false;
                turnMessages.push(`${capitalize(pokemon.name)} libera su movimiento.`);
                return true;
            } else {
                // Ahora el movimiento está cargado
                pokemon.otherStatus.charging_turn = true;
                
                // El Pokémon no puede ser cambiado
                pokemon.canChange = false;
                turnMessages.push(`${capitalize(pokemon.name)} está cargando su movimiento.`);

                // En el caso de skull-bash, se aumenta la defensa en el turno de carga
                if (move.name == "skull-bash") {
                    changeStatStage(pokemon.name, pokemon.stats.def, 1, turnMessages);
                }
                return false;
            }
        default:
            return true;
    }
}

/**
 * Trabaja con los movimientos de one-hit-ko. Devuelve booleano porque se ignora todo el resto de la función si se
 * usa uno de estos movimientos.
 * @param {Object} pokemon Pokémon que usa el movimiento.
 * @param {Object} move Movimiento.
 * @param {Array} turnMessages Vector de mensajes.
 * @returns Devuelve true si acierta, devuelve false si falla.
 */
const oneHitKO = (pokemon, move, turnMessages) => {
    if (move.name == "guillotine" || move.name == "horn-drill" || move.name == "fissure" || move.name == "sheer-cold") {
        // La probabilidad siempre es 30%. Si se acierta
        if (mathFunctions.probability(30, 100)) {
            // El Pokémon enemigo es debilitado
            turnMessages.push(`¡Es un movimiento de daño masivo!`);
            pokemon.stats.hp.currentHP = 0;
            pokemon.isAlive = false;
            turnMessages.push(`¡${capitalize(pokemon.name)} fue debilitado!`);
        } else {
            turnMessages.push(`¡${capitalize(pokemon.name)} esquivó el ataque!`);
        }
        return true;
    }
    return false;
}

/**
 * Trabaja con los movimientos que atrapan al Pokémon enemigo.
 * @param {Object} pokemon Pokémon que recibe el movimiento.
 * @param {Object} move Movimiento.
 * @param {Array} turnMessages Vector de mensajes. 
 */
const trappingMoves = (pokemon, move, turnMessages) => {
    const array = ["bind", "wrap", "fire-spin", "clamp", "whirlpool", "sand-tomb"];
    if (array.includes(move.name)) {
        // Elijo aleatoriamente la cantidad de turnos que va a estar atrapado
        const howManyTurns = mathFunctions.chooseRandom(2, 2, 2, 3, 3, 3, 4, 5);
        pokemon.otherStatus.bounded = howManyTurns;
        
        // Ahora, el Pokémon enemigo no puede cambiar
        pokemon.canChange = false;
        turnMessages.push(`¡${capitalize(pokemon.name)} fue atrapado por el ataque de su oponente!`);
    }
}

/**
 * Trabaja con los movimientos que golpean varias veces.
 * @param {Object} pokemon Pokémon que usa el movimiento.
 * @param {Object} move Movimiento.
 * @param {Array} turnMessages Vector de mensajes.
 * @returns El número de golpes que se dan. 
 */
const howManyHits = (pokemon, move, turnMessages) => {
    switch (move.name) {
        case "double-slap":
        case "comet-punch":
        case "fury-attack":
        case "twineedle":
        case "pin-missile":
        case "spike-cannon":
        case "barrage":
        case "fury-swipes":
        case "bone-rush":
        case "arm-thrust":
        case "bullet-seed":
        case "icicle-spear":
        case "rock-blast":
            const hits = mathFunctions.chooseRandom(2, 2, 2, 3, 3, 3, 4, 5);
            turnMessages.push(`¡${capitalize(pokemon.name)} ataca ${hits} veces!`);
            return hits;
        case "double-kick":
            turnMessages.push(`¡${capitalize(pokemon.name)} ataca 2 veces!`);
            return 2;
        case "triple-kick":
            turnMessages.push(`¡${capitalize(pokemon.name)} ataca 3 veces!`);
            return 3;
        default:
            return 1;
    }
}

/**
 * Quema a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const burn = (pokemon, turnMessages) => {
    // Verificamos si no puede ser quemado, en ese caso salimos de la función
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("fire")) return;
    if (pokemon.otherStatus.safeguard) return;

    // Quemamos al Pokémon
    pokemon.status = "burned";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue quemado!`);
}

/**
 * Congela a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const freeze = (pokemon, weather, turnMessages) => {
    // Verificamos si no puede ser congelado, en ese caso salimos de la función
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("ice")) return;
    if (weather == "sunny") return;
    if (pokemon.otherStatus.safeguard) return;

    // Congelamos al Pokémon
    pokemon.status = "frozen";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue congelado!`);
}

/**
 * Paraliza a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const paralyze = (pokemon, turnMessages) => {
    // Verificamos si no puede ser paralizado, en ese caso salimos de la función
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("electric")) return;
    if (pokemon.otherStatus.safeguard) return;

    // Se paraliza al Pokémon
    opponent.status = "paralyzed";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue paralizado!`);
}

/**
 * Envenena a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const poison = (pokemon, turnMessages) => {
    // Verificamos si no puede ser envenenado, en ese caso salimos de la función
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("poison")) return;
    if (pokemon.types.includes("steel")) return;
    if (pokemon.otherStatus.safeguard) return;

    // Se envenena al Pokémon
    opponent.status = "poisoned";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue envenenado!`);
}

/**
 * Envenena gravemente a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const badlyPoison = (pokemon, turnMessages) => {
    // Verificamos si no puede ser envenenado gravemente, en ese caso salimos de la función
    if (pokemon.status != "OK") return;
    if (pokemon.types.includes("poison")) return;
    if (pokemon.types.includes("steel")) return;
    if (pokemon.otherStatus.safeguard) return;

    // Se envenena gravemente al Pokémon
    opponent.status = "badly-poisoned";
    turnMessages.push(`¡${capitalize(pokemon.name)} fue gravemente envenenado!`);
}

/**
 * Se hace retroceder a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const flinch = (pokemon, turnMessages) => {
    pokemon.otherStatus.flinched = true;
    turnMessages.push(`¡${capitalize(pokemon.name)} retrocedió!`);
}

/**
 * Se confunde a un Pokémon.
 * @param {Object} pokemon Pokémon.
 * @param {Array} turnMessages Vector de mensajes.
 */
const confuse = (pokemon, turnMessages) => {
    // Si no puede ser confundido, salimos de la función
    if (pokemon.otherStatus.safeguard) return;

    pokemon.otherStatus.confused = true;
    turnMessages.push(`¡${capitalize(pokemon.name)} está confuso!`);
}

/**
 * Trabaja con la modificación de los stats por niveles.
 * @param {Object} pokemonName Nombre del Pokémon (para los mensajes).
 * @param {Object} stat Stat a modificar.
 * @param {Number} stages Cantidad de niveles a subir(+) o bajar (-).
 * @param {Array} turnMessages Vector de mensajes.
 */
const changeStatStage = (pokemonName, stat, stages, turnMessages) => {
    // Si un stat está al máximo, no se puede incrementar.
    if (stat.stage == 6 && stages > 0) {
        turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} no puede subir más!`);
        return;
    }

    // Si un stat está al mínimo, no se puede bajar.
    if (stat.stage == -6 && stages < 0) {
        turnMessages.push(`¡${stat.name} de ${capitalize(pokemonName)} no puede bajar más!`);
        return;
    }

    // Un mensaje distinto según la cantidad de niveles.
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

    // Aumentamos/Bajamos el stat, y si excede el máximo o el mínimo lo dejamos en los correspondientes.
    stat.stage += stages;
    if (stat.stage > 6) stat.stage = 6;
    if (stat.stage < -6) stat.stage = 6;
}
