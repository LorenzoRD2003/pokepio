const { capitalize, chooseRandom, probability } = require("../mathFunctions.js");

/**
 * Clase para un movimiento.
 */
class Move {
    /**
     * Crea un objeto de la clase Move.
     * @param {String} name Nombre del movimiento.
     * @param {Number} power Poder del movimiento.
     * @param {String} type Tipo del movimiento.
     * @param {Number} pp PP del movimiento.
     * @param {Number} accuracy Porcentaje de precisión del movimiento.
     * @param {Number} priority Prioridad del movimiento.
     * @param {String} damage_class Tipo de daño del movimiento.
     * @param {Number} effect_chance Probabilidad de efecto secundario.
     * @param {Number} crit_rate Ratio de golpe crítico.
     */
    constructor(name, power, type, pp, accuracy, priority, damage_class, effect_chance, crit_rate) {
        this.name = name;
        this.power = power;
        this.type = type;
        this.pp = pp;
        this.accuracy = accuracy;
        this.priority = priority;
        this.damage_class = damage_class;
        this.effect_chance = effect_chance;
        this.crit_rate = crit_rate;
    }

    hasPP() {
        return this.pp > 0;
    }

    reducePP() {
        if (this.pp > 0)
            this.pp--;
        else
            console.log("There are not PP left");
    }

    /**
     * Devuelve el multiplicador de daño si es crítico o no.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Array} messages Vector de mensajes.
     * @returns {Boolean} true o false.
     */
    criticalHit(pokemon, messages) {
        let criticalRate = pokemon.crit_rate + this.crit_rate;
        let isCrit = false;

        switch (criticalRate) {
            case 0:
                isCrit = probability(1, 16);
                break;
            case 1:
                isCrit = probability(1, 8);
                break;
            case 2:
                isCrit = probability(1, 4);
                break;
            case 3:
                isCrit = probability(1, 3);
                break;
            case 4:
                isCrit = probability(1, 2);
                break;
        }

        if (isCrit)
            messages.push("¡Un golpe crítico!");

        return isCrit;
    }

    /**
     * Devuelve el multiplicador por STAB de un movimiento respecto a un Pokémon.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @returns {Number} 1.5 si es verdadero, 1 si es falso.
     */
    stab(pokemon) {
        // Necesito saber si el tipo del Pokémon es el mismo que el tipo del movimiento.
        const found = pokemon.types.find(pokemonType => pokemonType.name == this.type);
        return (found) ? 1.5 : 1;
    }

    /**
     * Devuelve el multiplicador por efectividad.
     * @param {Object} opponent Pokémon que recibe el ataque.
     * @param {Array} messages Vector de mensajes.
     * @return Multiplicador de daño por efectividad.
    */
    effectiveness(opponent, messages) {
        let multiplier = 1;

        // Para cada tipo del Pokémon, multiplico lo correspondiente
        opponent.types.forEach(type => {
            if (type.double_damage_from.includes(this.type)) {
                multiplier *= 2;
            } else if (type.half_damage_from.includes(this.type)) {
                multiplier *= 0.5;
            } else if (type.no_damage_from.includes(this.type)) {
                multiplier *= 0;
            }
        });

        // Agrego el mensaje correspondiente.
        if (multiplier >= 2) {
            messages.push(`¡Es súper efectivo contra ${capitalize(opponent.name)}!`);
        } else if (multiplier == 0) {
            messages.push(`${capitalize(opponent.name)} es inmune al ataque.`);
        } else if (multiplier < 1) {
            messages.push(`Es poco efectivo contra ${capitalize(opponent.name)}...`);
        }
        return multiplier;
    }

    /**
     * Devuelve el multiplicador de daño si el Pokémon está quemado o no.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @returns 0.5 si está quemado y es un movimiento fisico, 1 de otro modo.
     */
    isBurnedMultiplier(pokemon) {
        return (pokemon.status == "burned" && this.damage_class == "physical") ? 0.5 : 1;
    }

    /**
     * Daño por retroceso al Pokémon según el movimiento y el daño hecho.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Number} damage Daño realizado.
     * @param {Array} messages Vector de mensajes.
     */
    recoilDamage(pokemon, damage, messages) {
        let lostHP;
        // Según el movimiento, hay distinta vida perdida.
        switch (this.name) {
            case "take-down":
            case "submission":
                lostHP = Math.floor((1 / 4) * damage); break;
            case "double-edge":
            case "volt-tackle":
                lostHP = Math.floor((1 / 3) * damage); break;
            case "struggle":
                lostHP = Math.floor((1 / 4) * pokemon.stats.hp.max_hp); break;
            default:
                return;
        }

        // Mostramos el mensaje y reducimos vida del Pokémon
        messages.push(`${capitalize(pokemon.name)} pierde ${lostHP} puntos de vida por daño de retroceso.`);
        pokemon.reduceHP(damage, messages);
    }

    /**
     * Devuelve si el movimiento acertó o falló.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Object} opponent Pokémon oponente.
     * @param {Array} messages Vector de mensajes. 
     * @param {String} weather Clima de la batalla.
     * @returns true si acertó, false si falló.
     */
    hasHit(pokemon, opponent, messages, weather) {
        // Movimientos que no fallan
        if (this.accuracy === null)
            return true;

        if (this.name == "blizzard" && weather == "hail")
            return true;

        if (this.name == "thunder" && weather == "rainy")
            return true;

        let accuracy = this.accuracy; // Precisión base del movimiento
        accuracy *= pokemon.getStatMultiplier("acc"); // Multiplicador de la precisión
        accuracy *= 1 / opponent.getStatMultiplier("eva"); // Multiplicador de la evasión
        let result = probability(accuracy, 100);

        if (!result)
            messages.push(`¡${capitalize(opponent.name)} esquivó el ataque!`);

        return result;
    }

    /**
     * Recuperar vida por absorción de daño hecho al enemigo según el movimiento.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Number} damage Daño realizado.
     * @param {Array} messages Vector de mensajes.
     */
    absorbDamage(pokemon, damage, messages) {
        let absorbMultiplier;
        // Según el movimiento, hay distinto multiplicador de absorción.
        switch (this.name) {
            case "absorb":
            case "mega-drain":
            case "dream-eater":
            case "leech-life":
            case "giga-drain":
                absorbMultiplier = 1 / 2; break;
            default:
                absorbMultiplier = 0; break;
        }

        // Si hay daño por absorción
        if (absorbMultiplier != 0) {
            // Calculamos vida recuperada
            const absorbedHP = Math.floor(damage * absorbMultiplier);

            // Mostramos el mensaje y recuperamos vida del Pokémon
            messages.push(`${capitalize(pokemon.name)} recupera ${absorbedHP} puntos de vida por absorción de daño.`);
            pokemon.restoreHP(absorbedHP, messages);
        }
    };

    /**
     * Autodestruir a un Pokémon según el movimiento.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Array} messages Vector de mensajes.
     */
    selfDestruct(pokemon, messages) {
        // Si es un ataque que implica autodestruirse
        if (this.name == "self-destruct" || this.name == "explosion")
            pokemon.selfDestruct(messages);
    }

    /**
     * Realiza los efectos secundarios de cada movimiento.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Object} opponent Pokémon que recibe el movimiento.
     * @param {String} weather Clima de la batalla.
     * @param {Array} messages Vector de mensajes.
     */
    moveSecondaryEffects(pokemon, opponent, weather, messages) {
        // Los efectos secundarios tienen un porcentaje de éxito
        // Si no ocurre el efecto, entonces salimos de la función
        if (!probability(this.effect_chance, 100))
            return;

        // Actuamos segun el nombre del movimiento
        switch (this.name) {
            case "fire-punch":
            case "ember":
            case "flamethrower":
            case "fire-blast":
            case "flame-wheel":
            case "sacred-fire":
            case "heat-wave":
            case "blaze-kick":
                opponent.burn(messages); break;
            case "ice-punch":
            case "ice-beam":
            case "blizzard":
            case "powder-snow":
                opponent.freeze(weather, messages); break;
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
                opponent.paralyze(messages); break;
            case "poison-sting":
            case "twineedle":
            case "smog":
            case "sludge":
            case "sludge-bomb":
            case "poison-tail":
                opponent.poison(messages, false); break;
            case "poison-fang":
                opponent.poison(messages, true); break;
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
                opponent.flinch(messages); break;
            case "psybeam":
            case "confusion":
            case "dizzy-punch":
            case "dynamic-punch":
            case "signal-beam":
            case "water-pulse":
                opponent.confuse(messages); break;
            case "tri-attack":
                let statusChoice = chooseRandom(["burn", "freeze", "paralysis"]);
                switch (statusChoice) {
                    case "burn":
                        opponent.burn(messages); break;
                    case "freeze":
                        opponent.freeze(weather, messages); break;
                    case "paralysis":
                        opponent.paralyze(messages); break;
                    default:
                        break;
                }
                break;
            case "aurora-beam":
                opponent.changeStatStage("atk", -1, messages); break;
            case "iron-tail":
            case "crunch":
            case "rock-smash":
            case "crush-claw":
                opponent.changeStatStage("def", -1, messages); break;
            case "mist-ball":
                opponent.changeStatStage("spa", -1, messages); break;
            case "psychic":
            case "shadow-ball":
            case "luster-purge":
                opponent.changeStatStage("spd", -1, messages); break;
            case "bubble-beam":
            case "constrict":
            case "bubble":
            case "icy-wind":
            case "rock-tomb":
            case "mud-shot":
                opponent.changeStatStage("spe", -1, messages); break;
            case "mud-slap":
            case "octazooka":
            case "muddy-water":
                opponent.changeStatStage("acc", -1, messages); break;
            case "metal-claw":
            case "meteor-mash":
                pokemon.changeStatStage("atk", 1, messages); break;
            case "steel-wing":
                pokemon.changeStatStage("def", 1, messages); break;
            case "ancient-power":
            case "silver-wind":
                pokemon.changeStatStage("atk", 1, messages);
                pokemon.changeStatStage("def", 1, messages);
                pokemon.changeStatStage("spa", 1, messages);
                pokemon.changeStatStage("spd", 1, messages);
                pokemon.changeStatStage("spe", 1, messages);
                break;
            case "superpower":
                pokemon.changeStatStage("atk", -1, messages);
                pokemon.changeStatStage("def", -1, messages);
                break;
            case "overheat":
            case "psycho-boost":
                pokemon.changeStatStage("spa", -2, messages); break;
            default:
                break;
        }
    }

    /**
     * Hace que el Pokémon deba descansar si usó ciertos movimientos.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     */
    hasToRest(pokemon) {
        switch (this.name) {
            case "hyper-beam":
            case "blast-burn":
            case "hydro-cannon":
            case "frenzy-plant":
                pokemon.other_status.has_to_rest = true;
        }
    }

    /**
     * Trabaja con los movimientos que deben cargarse para poderse ejecutar.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {String} weather Clima de la batalla.
     * @param {Array} messages Vector de mensajes.
     * @returns true si se libera en este turno, false si debe ser en el turno siguiente
     */
    chargingMoves(pokemon, weather, messages) {
        switch (this.name) {
            case "skull-bash":
            case "razor-wind":
            case "sky-attack":
            case "solar-beam":
                // En el caso de solar-beam, si el clima es soleado se ejecuta automáticamente
                if (this.name == "solar-beam" && weather == "sunny")
                    return true;

                // Si está cargado, entonces devolvemos true porque se libera en este turno
                if (pokemon.other_status.charging_turn) {
                    pokemon.liberateMovement(messages);
                    return true;
                } else {
                    pokemon.chargeTurn(messages);

                    // En el caso de skull-bash, se aumenta la defensa en el turno de carga
                    if (this.name == "skull-bash")
                        pokemon.changeStatStage("def", 1, messages);

                    return false;
                }
            default:
                return true;
        }
    }

    /**
     * Trabaja con los movimientos que atrapan al Pokémon enemigo.
     * @param {Object} opponent Pokémon oponente.
     * @param {Array} messages Vector de mensajes.
     */
    trappingMoves(opponent, messages) {
        const array = ["bind", "wrap", "fire-spin", "clamp", "whirlpool", "sand-tomb"];
        if (array.includes(this.name))
            opponent.getTrapped(messages);
    }

    /**
     * Trabaja con los movimientos de one-hit-ko. Devuelve booleano porque se ignora todo el resto de la función si se
     * usa uno de estos movimientos.
     * @param {Object} opponent Pokémon que recibe el movimiento.
     * @param {Array} messages Vector de mensajes.
     * @returns Devuelve true si acierta, devuelve false si falla.
     */
    oneHitKO(opponent, messages) {
        const array = ["guillotine", "horn-drill", "fissure", "sheer-cold"];
        if (array.includes(this.name)) {
            // La probabilidad siempre es 30%
            if (probability(30, 100)) {
                messages.push(`¡Es un movimiento de daño masivo!`);
                opponent.die(messages);
                return true;
            } else
                messages.push(`¡${capitalize(opponent.name)} esquivó el ataque!`);
        }
        return false;
    }

    /**
     * Trabaja con los movimientos que golpean varias veces.
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Array} messages Vector de mensajes.
     * @returns El número de golpes que se dan. 
     */
    howManyHits(pokemon, messages) {
        switch (this.name) {
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
                const hits = chooseRandom(2, 2, 2, 3, 3, 3, 4, 5);
                messages.push(`¡${capitalize(pokemon.name)} ataca ${hits} veces!`);
                return hits;
            case "double-kick":
                messages.push(`¡${capitalize(pokemon.name)} ataca 2 veces!`);
                return 2;
            case "triple-kick":
                messages.push(`¡${capitalize(pokemon.name)} ataca 3 veces!`);
                return 3;
            default:
                return 1;
        }
    }

    /**
     * Trabaja con los movimientos de estado (cambios de stats y efectos de estado)
     * @param {Object} pokemon Pokémon que usa el movimiento.
     * @param {Object} opponent Pokémon que recibe el movimiento. 
     * @param {String} weather Clima de la batalla.
     * @param {Array} messages Vector de mensajes.
     */
    statusMoves(pokemon, opponent, weather, messages) {
        // Según el nombre del movimiento
        switch (this.name) {
            case "poison-powder":
            case "poison-gas":
                opponent.poison(messages, false); break;
            case "toxic":
                opponent.poison(messages, true); break;
            case "will-o-wisp":
                opponent.burn(messages); break;
            case "stun-spore":
            case "thunder-wave":
            case "glare":
                opponent.paralyze(messages); break;
            case "sing":
            case "sleep-powder":
            case "hypnosis":
            case "lovely-kiss":
            case "spore":
            case "grass-whistle":
                opponent.sleep(messages); break;
            case "supersonic":
            case "confuse-ray":
            case "sweet-kiss":
            case "teeter-dance":
                opponent.confuse(messages); break;
            case "swagger":
                opponent.changeStatStage("atk", 2, messages);
                opponent.confuse(messages);
                break;
            case "flatter":
                opponent.changeStatStage("spa", 1, messages);
                opponent.confuse(messages);
                break;
            case "meditate":
            case "sharpen":
            case "howl":
                pokemon.changeStatStage("atk", 1, messages); break;
            case "swords-dance":
                pokemon.changeStatStage("atk", 2, messages); break;
            case "harden":
            case "withdraw":
            case "defense-curl":
                pokemon.changeStatStage("def", 1, messages); break;
            case "barrier":
            case "acid-armor":
            case "iron-defense":
                pokemon.changeStatStage("def", 2, messages); break;
            case "tail-glow":
                pokemon.changeStatStage("spa", 3, messages); break;
            case "amnesia":
                pokemon.changeStatStage("spd", 2, messages); break;
            case "agility":
                pokemon.changeStatStage("spe", 2, messages); break;
            case "double-team":
                pokemon.changeStatStage("eva", 1, messages); break;
            case "bulk-up":
                pokemon.changeStatStage("atk", 1, messages);
                pokemon.changeStatStage("def", 1, messages);
                break;
            case "dragon-dance":
                pokemon.changeStatStage("atk", 1, messages);
                pokemon.changeStatStage("spe", 1, messages);
                break;
            case "cosmic-power":
            case "stockpile":
                pokemon.changeStatStage("def", 1, messages);
                pokemon.changeStatStage("spd", 1, messages);
                break;
            case "calm-mind":
                pokemon.changeStatStage("spa", 1, messages);
                pokemon.changeStatStage("spd", 1, messages);
                break;
            case "growth":
                if (weather == "sunny") {
                    pokemon.changeStatStage("atk", 2, messages);
                    pokemon.changeStatStage("spa", 2, messages);
                } else {
                    pokemon.changeStatStage("atk", 1, messages);
                    pokemon.changeStatStage("spa", 1, messages);
                }
                break;
            case "growl":
                opponent.changeStatStage("atk", -1, messages); break;
            case "charm":
            case "feather-dance":
                opponent.changeStatStage("atk", -2, messages); break;
            case "tail-whip":
            case "leer":
                opponent.changeStatStage("def", -1, messages); break;
            case "screech":
                opponent.changeStatStage("def", -2, messages); break;
            case "fake-tears":
            case "metal-sound":
                opponent.changeStatStage("spd", -2, messages); break;
            case "string-shot":
            case "cotton-spore":
            case "scary-face":
                opponent.changeStatStage("spe", -2, messages); break;
            case "sand-attack":
            case "smokescreen":
            case "kinesis":
            case "flash":
                opponent.changeStatStage("acc", -1, messages); break;
            case "sweet-scent":
                opponent.changeStatStage("eva", -1, messages); break;
            case "tickle":
                opponent.changeStatStage("atk", -1, messages);
                opponent.changeStatStage("def", -1, messages);
                break;
            case "memento":
                opponent.changeStatStage("atk", -2, messages);
                opponent.changeStatStage("spa", -2, messages);
                pokemon.die(messages);
                break;
            default:
                console.log("Error de movimiento de estado");
        }
    }

    /**
     * Movimientos de recuperación.
     * @param {Object} pokemon Pokémon que usa el movimiento. 
     * @param {String} weather Clima de la batalla.
     * @param {Array} messages Vector de mensajes.
     */
    recoveryMoves(pokemon, weather, messages) {
        switch(this.name) {
            case "recover":
            case "soft-boiled":
            case "milk-drink":
                pokemon.recoverHP(50, messages); break;
            case "moonlight":
            case "synthesis":
            case "morning-sun":
                if (weather == "sunny")
                    pokemon.recoverHP(67, messages);
                else if (weather == "hail" || weather == "rainy" || weather == "sandstorm")
                    pokemon.recoverHP(25, messages);
                else
                    pokemon.recoverHP(50, messages);
                break;
        }
    }
}

module.exports = { Move };
