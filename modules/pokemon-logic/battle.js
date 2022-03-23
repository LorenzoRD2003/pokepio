const { capitalize, chooseRandom, sleep, probability } = require("../mathFunctions.js");
const { Pokemon } = require("./pokemon.js");
const { Player } = require("./player.js");
const { Move } = require("./move.js");
const databaseFunctions = require("../databaseFunctions.js");

/**
 * Clase para una batalla.
 */
class Battle {
    constructor(io) {
        // Inicio los parametros de la batalla como al reiniciarla
        this.io = io;
        this.resetBattle();
    }

    /**
     * Reinicia una batalla a sus parámetros base.
     */
    resetBattle() {
        this.players = 0;
        this.id = null;
        this.room = null;
        this.user1 = null; // Player
        this.user2 = null; // Player
        this.result = "";
        this.weather = null;
        this.active_timer = false;
    }

    /**
     * Verifica que una batalla esté disponible para poder ingresarse a ella.
     * @param {String} username Nombre del Player que está ingresando a la batalla.
     */
    isAvailable(username) {
        // Busco una batalla, con menos de dos usuarios, y que el primer usuario no sea el segundo
        if (this.user1)
            return this.players < 2 && this.user1.username != username;
        else
            return this.players < 2;
    }

    /**
     * Añade un Player a la batalla.
     * @param {Player} player Player que está ingresando a la batalla. 
     * @returns 
     */
    async addUser(player) {
        if (this.players >= 2)
            return 0;

        // Si no se unió ningún usuario aún
        if (!this.user1) {
            // Creo el id de la batalla (para base de datos)
            this.id = await databaseFunctions.createBattle(player.id);

            // Creo la sala de la batalla
            this.room = `Battle-${this.id}`;

            // Asigno el primer usuario
            this.user1 = player;

            // Devuelvo que es el primer usuario
            return 1;
        } else if (!this.user2) {
            // Asigno el segundo usuario
            this.user2 = player;

            // Añado el segundo usuario a la batalla en la base de datos
            await databaseFunctions.addSecondUserToBattle(this.id, player.id);

            // Devuelvo que es el segundo usuario
            return 2;
        }
    }

    startBattle() {
        this.io.to(this.room).emit('start-battle', {
            user1: this.user1,
            user2: this.user2,
            weather: this.weather
        });
    }

    async startCounter(player, opponent) {
        // El booleano del contador queda en true
        this.activeTimer = true;

        // Tomo un momento para iniciar el contador
        const start_time = new Date();

        // Si el jugador aún no jugó
        if (!player.has_played) {
            // Le asigno al jugador este tiempo
            player.time.start_time = start_time;

            // Hago un setTimeout, para que, si se termina el tiempo, el jugador pierda la batalla
            player.time.timer = setTimeout(async () => {
                io.to(this.room).emit('finished-timeout', player.username);

                // Gana opponent, pierde player
                await this.finishBattle(opponent, player);

                this.io.to(this.room).emit('battle-end', {
                    winner: opponent.username,
                    result: this.result
                });
            }, player.time.time_left); // Tiempo restante player
        }

        // Si el oponente aún no jugó
        if (!opponent.has_played) {
            // Le asigno al oponente este tiempo
            opponent.time.start_time = start_time;

            // Hago un setTimeout, para que, si se termina el tiempo, el oponente pierda la batalla
            opponent.time.timer = setTimeout(async () => {
                io.to(this.room).emit('finished-timeout', opponent.username);

                // Gana player, pierde opponent
                await this.finishBattle(player, opponent);

                this.io.to(this.room).emit('battle-end', {
                    winner: player.username,
                    result: this.result
                });
            }, opponent.time.time_left); // Tiempo restante opponent
        }

        // Envío el mensaje de que se inició el contador
        this.io.to(this.room).emit('started-timeout');
    }

    resumeCounter(player, opponent) {
        // Si el contador está activo
        if (this.active_timer) {
            // Asigno un tiempo inicial para resumir
            player.time.startTime = new Date();

            // Hago un setTimeout, para que, si se termina el tiempo, el jugador pierda la batalla
            player.time.timer = setTimeout(async () => {
                this.io.to(this.room).emit('finished-timeout', player.username);
                await this.finishBattle(opponent, player); // Gana opponent
            }, player.time.time_left); // Tiempo restante player

            // Envio a los clientes el tiempo restante del jugador
            this.io.to(this.room).emit('resumed-timeout', player.username, player.time.time_left);
        }
    }

    /**
     * Finaliza una batalla con ganador y perdedor.
     * @param {Player} winner Player ganador. 
     * @param {Player} loser Player perdedor.
     */
    async finishBattle(winner, loser) {
        // El resultado es la cantidad de Pokémon que les quedan a c/u
        this.result = `${winner.battle_team.length} - ${loser.battle_team.length}`;

        // Pongo los resultados en la base de datos
        await databaseFunctions.setBattleResults(this.id, winner.username, loser.username, this.result);

        // Reinicio la batalla
        this.resetBattle();
    }

    selectFirstPokemon(index, player, opponent) {
        player.play(null);
        player.pauseCounter();

        // Asigno el Pokémon activo del jugador
        player.assignactive_pokemon(index);

        // Si ya jugaron ambos
        if (player.has_played && opponent.has_played) {
            // Ahora deben jugar nuevamente
            player.has_played = false;
            opponent.has_played = false;

            // Envío el estado de la batalla necesaria a los clientes
            this.io.to(this.room).emit('select-first-pokemon', {
                user1: this.user1,
                user2: this.user2,
                weather: this.weather
            });

            // Resumo los contadores de tiempo de ambos clientes
            this.resumeCounter(player, opponent);
            this.resumeCounter(opponent, player);
        }
    }

    whoActsFirst(player, opponent) {
        if (player.chosen_action.priority > opponent.chosen_action.priority)
            return true;
        else if (player.chosen_action.priority < opponent.chosen_action.priority)
            return false;

        // Si las prioridades son igualdes, entonces actúa primero el Pokémon más veloz
        const pokemon1 = player.active_pokemon;
        const speed_stat1 = pokemon1.getBattleStat("spe");

        const pokemon2 = opponent.active_pokemon;
        const speed_stat2 = pokemon2.getBattleStat("spe");

        if (speed_stat1 > speed_stat2)
            return true;
        else if (speed_stat1 < speed_stat2)
            return false;

        // Si tienen la misma velocidad, entonces se decide al azar.
        return (probability(50, 100));
    }

    async turnAction(action, player, opponent) {
        player.play(action);
        player.pauseCounter();

        // Si jugaron ambos
        if (player.has_played && opponent.has_played) {
            // Ahora deben jugar nuevamente
            player.has_played = false;
            opponent.has_played = false;

            // Inicio el vector de mensajes de chat del servidor
            let turn_messages = [];

            // Si la acción del jugador se ejecuta antes que la del oponente
            if (this.whoActsFirst(player, opponent)) {
                // Uso la acción del jugador
                this.useAction(player, opponent, turn_messages);

                // Envío el resultado de la acción al servidor
                this.io.to(this.room).emit('action-result', {
                    user1: this.user1,
                    user2: this.user2,
                    weather: this.weather
                }, turn_messages);

                turn_messages = [];
                // Si el Pokémon del oponente está vivo
                if (opponent.active_pokemon.is_alive) {
                    // Espero unos segundos
                    await sleep(2500);

                    // Uso la acción del oponente
                    this.useAction(opponent, player, turn_messages);

                    // Envío el resultado de la acción al servidor
                    this.io.to(this.room).emit('action-result', {
                        user1: this.user1,
                        user2: this.user2,
                        weather: this.weather
                    }, turn_messages);
                }
            } else {
                // Uso la acción del oponente

            }

            // Envío el estado al final del turno al servidor
            this.io.to(this.room).emit('finished-turn', {
                user1: this.user1,
                user2: this.user2,
                weather: this.weather
            });

            // Reinicio el contador para ambos usuarios
            this.resumeCounter(player, opponent);
            this.resumeCounter(opponent, player);
        }
    }

    useAction(player, opponent, turn_messages) {
        let action = player.chosen_action;

        // Primero quiero desarrollar la situación si action es un movimiento
        if (action instanceof Move) {
            console.log(action);

            // Reduzco un PP del movimiento
            action.reducePP();

            // Añado un mensaje al vector de mensajes
            turn_messages.push(`¡${capitalize(player.active_pokemon.name)} usó ${capitalize(action.name)}!`);

            // Movimientos que necesitan cargar
            const boolHasFinishedCharging = this.chargingMoves(player.active_pokemon, action, turn_messages);
            if (!boolHasFinishedCharging)
                return;

            // Movimientos One Hit K.O. - Ignoran precisión y evasión
            const boolOneHitKO = this.oneHitKO(player.active_pokemon, action, turn_messages);
            if (boolOneHitKO)
                return;

            // Si acierta el movimiento, se ejecuta lo demás
            const boolHasHit = this.hasHit(player.active_pokemon, opponent.active_pokemon, action, turn_messages);
            if (!boolHasHit)
                return;

            // Cuántas veces golpea el movimiento
            const hits = this.howManyHits(player.active_pokemon, action, turn_messages);

            let damage;
            // Segun el tipo de movimiento
            if (action.damage_class == "physical" || action.damage_class == "special") {
                // Lo hacemos una vez por cada golpe
                for (let i = 1; i <= hits; i++) {
                    // Calculo el daño
                    damage = this.damageCalculator(
                        action,
                        player.active_pokemon, // Ataque (fisico o especial)
                        opponent.active_pokemon, // Defensa (fisica o especial)
                        1, // Clima
                        this.criticalHit(player.active_pokemon, action), // Golpe crítico
                        this.stab(player.active_pokemon, action), // STAB
                        this.effectiveness(opponent.active_pokemon, action, turn_messages), // Efectividad
                        player.active_pokemon.isBurnedMultiplier(action) // Multiplicador por estar quemado
                    )

                    // Reduzco vida al Pokémon oponente
                    opponent.active_pokemon.reduceHP(damage, turn_messages);

                    // Si el oponente se debilitó, salimos del bucle for
                    if (!opponent.active_pokemon.is_alive)
                        break;
                }
            } else if (action.damage_class == "status") {

            } else {
                console.log("error movimiento");
            }

            // CASOS ESPECIALES DE MOVIMIENTOS

            // Movimientos de autodestrucción
            this.selfDestruct(player.active_pokemon, action, turn_messages);

            // Daño de retroceso
            this.recoilDamage(player.active_pokemon, action, damage, turn_messages);

            // Absorber daño
            this.absorbDamage(player.active_pokemon, action, damage, turn_messages);

            // Efectos secundarios
            this.moveSecondaryEffects(player.active_pokemon, opponent.active_pokemon, action, turn_messages);

            // Debe descansar luego de usar el movimiento (ejemplo hiperrayo)
            this.hasToRest(player.active_pokemon, action);

            // Movimientos que atrapan al oponente
            this.trappingMoves(opponent.active_pokemon, action, turn_messages);
        }
    }

    /**
     * Devuelve el multiplicador de daño si es crítico o no.
     * @param {Pokemon} pokemon Pokémon que usa el movimiento.
     * @param {Move} move Movimiento.
     * @param {Array} turn_messages Vector de mensajes.
     * @returns {Boolean} true o false.
     */
    criticalHit(pokemon, move, turn_messages) {
        let criticalRate = 0;
        criticalRate += pokemon.crit_rate + move.crit_rate;
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
            turn_messages.push("¡Un golpe crítico!");

        return isCrit;
    }

    /**
     * Devuelve el multiplicador por STAB de un movimiento respecto a un Pokémon.
     * @param {Pokemon} pokemon Pokémon que usa el movimiento.
     * @param {Move} move Movimiento.
     * @returns {Number} 1.5 si es verdadero, 1 si es falso.
     */
    stab(pokemon, move) {
        // Necesito saber si el tipo del Pokémon es el mismo que el tipo del movimiento.
        const found = pokemon.types.find(pokemonType => pokemonType.name == move.type);
        return (found) ? 1.5 : 1;
    }

    /**
     * Devuelve el multiplicador por efectividad.
     * @param {Pokemon} pokemon Pokémon que recibe el ataque.
     * @param {Move} move El movimiento.
     * @param {Array} turn_messages Vector de mensajes
     * @return Multiplicador de daño por efectividad
     */
    effectiveness(pokemon, move, turn_messages) {
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

        // Agrego el mensaje correspondiente.
        if (multiplier >= 2) {
            turn_messages.push(`¡Es súper efectivo contra ${capitalize(pokemon.name)}!`);
        } else if (multiplier == 0) {
            turn_messages.push(`${capitalize(pokemon.name)} es inmune al ataque.`);
        } else if (multiplier < 1) {
            turn_messages.push(`Es poco efectivo contra ${capitalize(pokemon.name)}...`);
        }
        return multiplier;
    }

    /**
     * Calcula el daño de un golpe realizado por un Pokémon a otro.
     * @param {Move} action Movimiento.
     * @param {Pokemon} player_pokemon Pokémon atacante.
     * @param {Pokemon} opponent_pokemon Pokémon receptor.
     * @param {Number} weather_multiplier Multiplicador de daño por el clima. 
     * @param {Boolean} is_critical Booleano que indica si el movimiento fue un golpe crítico. 
     * @param {Number} stab Multiplicador de daño por STAB.
     * @param {Number} effectiveness Multiplicador de daño por efectividad.
     * @param {Number} is_burned Multiplicador de daño por quemadura.
     * @returns 
     */
    damageCalculator(action, player_pokemon, opponent_pokemon, weather_multiplier, is_critical, stab, effectiveness, is_burned) {
        let attack_stat, defense_stat, attack_string, defense_string;

        // Primero, reviso si es fisico o especial
        if (action.damage_class == "physical") {
            attack_stat = player_pokemon.stats.atk;
            attack_string = "atk";
            defense_stat = opponent_pokemon.stats.def;
            defense_string = "def";
        } else if (action.damage_class == "special") {
            attack_stat = player_pokemon.stats.spa;
            attack_string = "spa";
            defense_stat = opponent_pokemon.stats.spd;
            defense_string = "spd";
        }

        // Calculo los números a usar como ofensivo y defensivo.
        // Depende de los golpes críticos, ya que estos siempre toman la postura más favorable para el atacante.
        // Entonces, si es crítico se ignora baja del ataque del atacante y/o subida de la defensa del receptor.
        const final_attack = (is_critical && player_pokemon.getStatMultiplier(attack_string) < 1) ? attack_stat.base_stat : player_pokemon.getBattleStat(attack_string);
        const final_defense = (is_critical && opponent_pokemon.getStatMultiplier(defense_string) > 1) ? defense_stat.base_stat : opponent_pokemon.getBattleStat(defense_string);

        // Calculo el daño base
        const base_damage = ((0.4 * player_pokemon.level + 2) * action.power * final_attack / final_defense) / 50 + 2;

        // Daño luego de los multiplicadores
        const damage_with_multipliers = base_damage * weather_multiplier * stab * effectiveness * is_burned;

        // Si es un golpe crítico, multiplico el daño por 2;
        const damage_after_crit_hit = (is_critical) ? damage_with_multipliers * 2 : damage_with_multipliers;

        // Multiplico por un valor aleatorio entre 0.85 y 1
        const damage_after_random_multiplier = Math.floor(damage_after_crit_hit * randomNumberInInterval(85, 100) * 0.01);
        return damage_after_random_multiplier;
    }

    /**
     * Daño por retroceso al Pokémon según el movimiento y el daño hecho.
     * @param {Pokemon} pokemon Pokémon.
     * @param {Move} move Movimiento.
     * @param {Number} damage Daño realizado al enemigo.
     * @param {Array} turn_messages Vector de mensajes.
     */
    recoilDamage(pokemon, move, damage, turn_messages) {
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
            turn_messages.push(`${capitalize(pokemon.name)} pierde ${lostHP} puntos de vida por daño de retroceso.`);
            pokemon.reduceHP(damage, turn_messages);
        }
    }

    /**
     * Devuelve si el movimiento acertó o falló.
     * @param {Pokemon} player_pokemon Pokémon usuario.
     * @param {Pokemon} opponent_pokemon Pokémon oponente.
     * @param {Object} move Movimiento
     * @param {Array} turn_messages Vector de mensajes.
     * @returns true si acertó, false si falló.
     */
    hasHit(player_pokemon, opponent_pokemon, move, turn_messages) {
        // Movimientos que no fallan
        const movesThatNeverFail = ["swift", "feint-attack", "vital-throw", "shadow-punch", "aerial-ace", "magical-leaf", "shock-wave"];
        if (movesThatNeverFail.includes(move.name))
            return true;

        let accuracy = move.accuracy; // Precisión base del movimiento
        accuracy *= player_pokemon.getStatMultiplier("acc"); // Multiplicador de la precisión
        accuracy *= 1 / opponent_pokemon.getStatMultiplier("eva"); // Multiplicador de la evasión
        let result = probability(accuracy, 100);

        if (!result)
            turn_messages.push(`¡${capitalize(opponent.active_pokemon.name)} esquivó el ataque!`);
        
        return result;
    }

    /**
     * Recuperar vida por absorción de daño hecho al enemigo según el movimiento.
     * @param {Pokemon} pokemon Pokémon.
     * @param {Move} move Movimiento.
     * @param {Number} damage Daño realizado al enemigo.
     * @param {Array} turn_messages Vector de mensajes.
     */
    absorbDamage(pokemon, move, damage, turn_messages) {
        let absorbMultiplier;
        // Según el movimiento, hay distinto multiplicador de absorción.
        switch (move.name) {
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
            const absorbedHP = damage * absorbMultiplier;

            // Mostramos el mensaje y recuperamos vida del Pokémon
            turn_messages.push(`${capitalize(pokemon.name)} recupera ${absorbedHP} puntos de vida por absorción de daño.`);
            pokemon.restoreHP(absorbedHP, turn_messages);
        }
    };

    /**
     * Autodestruir a un Pokémon según el movimiento.
     * @param {Pokemon} pokemon Pokémon que usa el movimiento.
     * @param {Move} move Movimiento.
     * @param {Array} turn_messages Vector de mensajes
     */
    selfDestruct(pokemon, move, turn_messages) {
        // Si es un ataque que implica autodestruirse
        if (move.name == "self-destruct" || move.name == "explosion")
            pokemon.selfDestruct(turn_messages);
    }

    /**
     * Realiza los efectos secundarios de cada movimiento.
     * @param {Pokemon} player_pokemon Pokémon que usa el movimiento.
     * @param {Pokemon} opponent_pokemon Pokémon que recibe el movimiento.
     * @param {Move} move Movimiento.
     * @param {Array} turn_messages Vector de mensajes.
     */
    moveSecondaryEffects(player_pokemon, opponent_pokemon, move, turn_messages) {
        // Los efectos secundarios tienen un porcentaje de éxito
        // Si no ocurre el efecto, entonces salimos de la función
        if (!probability(move.effect_chance, 100))
            return;

        // Actuamos segun el nombre del movimiento
        switch (move.name) {
            case "fire-punch":
            case "ember":
            case "flamethrower":
            case "fire-blast":
            case "flame-wheel":
            case "sacred-fire":
            case "heat-wave":
            case "blaze-kick":
                opponent_pokemon.burn(turn_messages); break;
            case "ice-punch":
            case "ice-beam":
            case "blizzard":
            case "powder-snow":
                opponent_pokemon.freeze(this.weather, turn_messages); break;
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
                opponent_pokemon.paralyze(turn_messages); break;
            case "tri-attack":
                let statusChoice = chooseRandom(["burn", "freeze", "paralysis"]);
                switch (statusChoice) {
                    case "burn":
                        opponent_pokemon.burn(turn_messages); break;
                    case "freeze":
                        opponent_pokemon.freeze(this.weather, turn_messages); break;
                    case "paralysis":
                        opponent_pokemon.paralyze(turn_messages); break;
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
                opponent_pokemon.poison(turn_messages); break;
            case "poison-fang":
                opponent_pokemon.badlyPoison(turn_messages); break;
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
                opponent_pokemon.flinch(turn_messages); break;
            case "psybeam":
            case "confusion":
            case "dizzy-punch":
            case "dynamic-punch":
            case "signal-beam":
            case "water-pulse":
                opponent_pokemon.confuse(turn_messages); break;
            case "aurora-beam":
                opponent_pokemon.changeStatStage("atk", -1, turn_messages); break;
            case "iron-tail":
            case "crunch":
            case "rock-smash":
            case "crush-claw":
                opponent_pokemon.changeStatStage("def", -1, turn_messages); break;
            case "mist-ball":
                opponent_pokemon.changeStatStage("spa", -1, turn_messages); break;
            case "psychic":
            case "shadow-ball":
            case "luster-purge":
                opponent_pokemon.changeStatStage("spd", -1, turn_messages); break;
            case "bubble-beam":
            case "constrict":
            case "bubble":
            case "icy-wind":
            case "rock-tomb":
            case "mud-shot":
                opponent_pokemon.changeStatStage("spe", -1, turn_messages); break;
            case "mud-slap":
            case "octazooka":
            case "muddy-water":
                opponent_pokemon.changeStatStage("acc", -1, turn_messages); break;
            case "metal-claw":
            case "meteor-mash":
                player_pokemon.changeStatStage("atk", 1, turn_messages); break;
            case "steel-wing":
                player_pokemon.changeStatStage("def", 1, turn_messages); break;
            case "ancient-power":
            case "silver-wind":
                player_pokemon.changeStatStage("atk", 1, turn_messages);
                player_pokemon.changeStatStage("def", 1, turn_messages);
                player_pokemon.changeStatStage("spa", 1, turn_messages);
                player_pokemon.changeStatStage("spd", 1, turn_messages);
                player_pokemon.changeStatStage("spe", 1, turn_messages);
                break;
            case "superpower":
                player_pokemon.changeStatStage("atk", -1, turn_messages);
                player_pokemon.changeStatStage("def", -1, turn_messages);
                break;
            case "overheat":
            case "psycho-boost":
                player_pokemon.changeStatStage("spa", -2, turn_messages); break;
            default:
                break;
        }
    }

    /**
     * Hace que el Pokémon deba descansar si usó ciertos movimientos.
     * @param {Pokemon} pokemon Pokémon que usó el movimiento.
     * @param {Move} move Movimiento.
     */
    hasToRest(pokemon, move) {
        switch (move.name) {
            case "hyper-beam":
            case "blast-burn":
            case "hydro-cannon":
            case "frenzy-plant":
                pokemon.activateHasToRest();
        }
    }

    /**
     * Trabaja con los movimientos que deben cargarse para poderse ejecutar.
     * @param {Pokemon} pokemon Pokémon que usa el movimiento.
     * @param {Move} move Movimiento.
     * @param {Object} turn_messages Vector de mensajes.
     * @returns true si se libera en este turno, false si debe ser en el turno siguiente
     */
    chargingMoves(pokemon, move, turn_messages) {
        switch (move.name) {
            case "skull-bash":
            case "razor-wind":
            case "sky-attack":
            case "solar-beam":
                // En el caso de solar-beam, si el clima es soleado se ejecuta automáticamente
                if (move.name == "solar-beam" && this.weather == "sunny")
                    return true;

                // Si está cargado, entonces devolvemos true porque se libera en este turno
                if (pokemon.other_status.charging_turn) {
                    pokemon.liberateMovement(turn_messages);
                    return true;
                } else {
                    pokemon.chargeTurn(turn_messages);

                    // En el caso de skull-bash, se aumenta la defensa en el turno de carga
                    if (move.name == "skull-bash")
                        pokemon.changeStatStage("def", 1, turn_messages);

                    return false;
                }
            default:
                return true;
        }
    }

    /**
     * Trabaja con los movimientos que atrapan al Pokémon enemigo.
     * @param {Pokemon} pokemon Pokémon que recibe el movimiento.
     * @param {Move} move Movimiento.
     * @param {Array} turn_messages Vector de mensajes. 
     */
    trappingMoves(pokemon, move, turn_messages) {
        const array = ["bind", "wrap", "fire-spin", "clamp", "whirlpool", "sand-tomb"];
        if (array.includes(move.name))
            pokemon.getTrapped(turn_messages);
    }

    /**
     * Trabaja con los movimientos de one-hit-ko. Devuelve booleano porque se ignora todo el resto de la función si se
     * usa uno de estos movimientos.
     * @param {Pokemon} pokemon Pokémon que usa el movimiento.
     * @param {Move} move Movimiento.
     * @param {Array} turn_messages Vector de mensajes.
     * @returns Devuelve true si acierta, devuelve false si falla.
     */
    oneHitKO(pokemon, move, turn_messages) {
        const array = ["guillotine", "horn-drill", "fissure", "sheer-cold"];
        if (array.includes(move.name)) {
            // La probabilidad siempre es 30%
            if (probability(30, 100)) {
                turn_messages.push(`¡Es un movimiento de daño masivo!`);
                pokemon.die(turn_messages);
                return true;
            } else
                turn_messages.push(`¡${capitalize(pokemon.name)} esquivó el ataque!`);
        }
        return false;
    }

    /**
     * Trabaja con los movimientos que golpean varias veces.
     * @param {Pokemon} pokemon Pokémon que usa el movimiento.
     * @param {Move} move Movimiento.
     * @param {Array} turn_messages Vector de mensajes.
     * @returns El número de golpes que se dan. 
     */
    howManyHits(pokemon, move, turn_messages) {
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
                const hits = chooseRandom(2, 2, 2, 3, 3, 3, 4, 5);
                turn_messages.push(`¡${capitalize(pokemon.name)} ataca ${hits} veces!`);
                return hits;
            case "double-kick":
                turn_messages.push(`¡${capitalize(pokemon.name)} ataca 2 veces!`);
                return 2;
            case "triple-kick":
                turn_messages.push(`¡${capitalize(pokemon.name)} ataca 3 veces!`);
                return 3;
            default:
                return 1;
        }
    }
}

module.exports = { Battle };
