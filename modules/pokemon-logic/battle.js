const { capitalize, randomNumberInInterval, sleep, probability } = require("../mathFunctions.js");
const { Player } = require("./player.js");
const { Pokemon } = require("./pokemon.js");
const { Move } = require("./move");
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
        this.messages = [];
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

        this.players++;
        const new_player = new Player(player.id, player.username, player.profile_photo, player.battle_team);

        // Si no se unió ningún usuario aún
        if (!this.user1) {
            // Creo el id de la batalla (para base de datos)
            this.id = await databaseFunctions.createBattle(player.id);

            // Creo la sala de la batalla
            this.room = `Battle-${this.id}`;

            // Asigno el primer usuario
            this.user1 = new_player;

            // Devuelvo que es el primer usuario
            return 1;
        } else if (!this.user2) {
            // Asigno el segundo usuario
            this.user2 = new_player;

            // Añado el segundo usuario a la batalla en la base de datos
            await databaseFunctions.addSecondUserToBattle(this.id, player.id);

            // Devuelvo que es el segundo usuario
            return 2;
        }
    }

    /**
     * Envía a los clientes el mensaje de inicio de la batalla.
     */
    startBattle() {
        this.io.to(this.room).emit('start-battle', {
            user1: this.user1.data(),
            user2: this.user2.data(),
            weather: this.weather
        });
    }

    async startCounter(player, opponent) {
        // El booleano del contador queda en true
        this.active_timer = true;

        // Tomo un momento para iniciar el contador
        const start_time = new Date();

        // Si el jugador aún no jugó
        if (!player.has_played) {
            // Le asigno al jugador este tiempo
            player.time.start_time = start_time;

            // Hago un setTimeout, para que, si se termina el tiempo, el jugador pierda la batalla
            player.time.timer = setTimeout(async () => {
                this.io.to(this.room).emit('finished-timeout', player.username);

                // Gana opponent, pierde player
                await this.finishBattle(opponent, player);
            }, player.time.time_left); // Tiempo restante player
        }

        // Si el oponente aún no jugó
        if (!opponent.has_played) {
            // Le asigno al oponente este tiempo
            opponent.time.start_time = start_time;

            // Hago un setTimeout, para que, si se termina el tiempo, el oponente pierda la batalla
            opponent.time.timer = setTimeout(async () => {
                this.io.to(this.room).emit('finished-timeout', opponent.username);

                // Gana player, pierde opponent
                await this.finishBattle(player, opponent);
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
        if (!winner)
            winner = (loser.id == this.user1.id) ? this.user2 : this.user1;

        // El resultado es la cantidad de Pokémon que les quedan a c/u
        this.result = `${winner.pokemon_left} - ${loser.pokemon_left}`;

        // Pongo los resultados en la base de datos
        await databaseFunctions.setBattleResults(this.id, winner.username, loser.username, this.result);

        // Envio el fin de la batalla al servidor
        this.io.to(this.room).emit('battle-end', {
            winner: winner.username,
            result: this.result
        });

        // Reinicio la batalla
        this.resetBattle();
    }

    selectFirstPokemon(index, player, opponent) {
        player.play(null);
        player.pauseCounter();

        // Asigno el Pokémon activo del jugador
        player.assignActivePokemon(index);

        // Si ya jugaron ambos
        if (player.has_played && opponent.has_played) {
            // Ahora deben jugar nuevamente
            player.has_played = false;
            opponent.has_played = false;

            // Envío el estado de la batalla necesaria a los clientes
            this.io.to(this.room).emit('select-first-pokemon', {
                user1: this.user1.data(),
                user2: this.user2.data(),
                weather: this.weather
            });

            // Resumo los contadores de tiempo de ambos clientes
            this.resumeCounter(player, opponent);
            this.resumeCounter(opponent, player);
        }
    }

    whoActsFirst(player, opponent) {
        const player_priority = player.active_pokemon.moves[player.chosen_action.index].priority;
        const opponent_priority = opponent.active_pokemon.moves[opponent.chosen_action.index].priority;

        if (player_priority > opponent_priority)
            return true;
        else if (player_priority < opponent_priority)
            return false;

        // Si las prioridades son igualdes, entonces actúa primero el Pokémon más veloz
        const speed_stat1 = player.active_pokemon.getBattleStat("spe");
        const speed_stat2 = opponent.active_pokemon.getBattleStat("spe");
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

            // Si la acción del jugador se ejecuta antes que la del oponente
            if (this.whoActsFirst(player, opponent)) {
                // Uso la acción del jugador
                this.useAction(player, opponent, this.messages);

                // Si el Pokémon del oponente está vivo
                if (opponent.active_pokemon.is_alive) {
                    // Espero unos segundos
                    await sleep(2500);

                    // Uso la acción del oponente
                    this.useAction(opponent, player, this.messages);
                } else {
                    console.log("El Pokémon fue debilitado.");
                }
            } else {
                // Uso la acción del jugador
                this.useAction(opponent, player, this.messages);

                // Si el Pokémon del oponente está vivo
                if (player.active_pokemon.is_alive) {
                    // Espero unos segundos
                    await sleep(2500);

                    // Uso la acción del oponente
                    this.useAction(player, opponent, this.messages);
                } else {
                    console.log("El Pokémon fue debilitado.");
                }
            }

            this.finishTurn(player, opponent);
        }
    }

    /**
     * Trabaja con las acciones utilizadas.
     * @param {Player} player Jugador que realiza la accion.
     * @param {Player} opponent Oponente del jugador.
     * @returns 
     */
    useAction(player, opponent) {
        // Primero quiero desarrollar la situación si action es un movimiento
        if (player.chosen_action.type == "move") {
            const move = player.active_pokemon.moves[player.chosen_action.index];

            // Reduzco un PP del movimiento
            move.reducePP();

            // Añado un mensaje al vector de mensajes
            this.messages.push(`¡${capitalize(player.active_pokemon.name)} usó ${capitalize(move.name)}!`);

            // Movimientos que necesitan cargar
            const boolHasFinishedCharging = move.chargingMoves(player.active_pokemon, this.weather, this.messages);
            if (!boolHasFinishedCharging)
                return;

            // Movimientos One Hit K.O. - Ignoran precisión y evasión
            const boolOneHitKO = move.oneHitKO(opponent.active_pokemon, this.messages);
            if (boolOneHitKO)
                return;

            // Si acierta el movimiento, se ejecuta lo demás
            const boolHasHit = move.hasHit(player.active_pokemon, opponent.active_pokemon, this.messages);
            if (!boolHasHit)
                return;

            // Cuántas veces golpea el movimiento
            const hits = move.howManyHits(player.active_pokemon, this.messages);

            let damage;
            // Segun el tipo de movimiento
            if (move.damage_class == "physical" || move.damage_class == "special") {
                // Lo hacemos una vez por cada golpe
                for (let i = 1; i <= hits; i++) {
                    // Calculo el daño
                    damage = this.damageCalculator(
                        move,
                        player.active_pokemon, // Ataque (fisico o especial)
                        opponent.active_pokemon, // Defensa (fisica o especial)
                        1, // Clima
                        move.criticalHit(player.active_pokemon, this.messages), // Golpe crítico
                        move.stab(player.active_pokemon), // STAB
                        move.effectiveness(opponent.active_pokemon, this.messages), // Efectividad
                        move.isBurnedMultiplier(player.active_pokemon) // Multiplicador por estar quemado
                    )

                    // Reduzco vida al Pokémon oponente
                    opponent.active_pokemon.reduceHP(damage, this.messages);

                    // Si el oponente se debilitó, salimos del bucle for
                    if (!opponent.active_pokemon.is_alive)
                        break;
                }
            } else if (move.damage_class == "status") {

            } else {
                console.log("error movimiento");
            }

            // CASOS ESPECIALES DE MOVIMIENTOS

            // Movimientos de autodestrucción
            move.selfDestruct(player.active_pokemon, this.messages);

            // Daño de retroceso
            move.recoilDamage(player.active_pokemon, damage, this.messages);

            // Absorber daño
            move.absorbDamage(player.active_pokemon, damage, this.messages);

            // Efectos secundarios
            move.moveSecondaryEffects(player.active_pokemon, opponent.active_pokemon, this.weather, this.messages);

            // Debe descansar luego de usar el movimiento (ejemplo hiperrayo)
            move.hasToRest(player.active_pokemon);

            // Movimientos que atrapan al oponente
            move.trappingMoves(opponent.active_pokemon, this.messages);
        }

        // Verificamos si los Pokémon siguen vivos
        if (!player.active_pokemon.is_alive)
            player.loseOnePokemon();
        
        if (!opponent.active_pokemon.is_alive)
            opponent.loseOnePokemon();

        // Envio a los clientes los resultados
        this.io.to(this.room).emit('action-result', {
            user1: this.user1.data(),
            user2: this.user2.data(),
            weather: this.weather
        }, this.messages);

        // Reinicio el vector de mensajes
        this.messages = [];
    }

    async finishTurn(player, opponent) {
        this.messages.push("Final del turno.");

        // Envío el estado al final del turno al servidor
        this.io.to(this.room).emit('finished-turn', {
            user1: this.user1,
            user2: this.user2,
            weather: this.weather
        }, this.messages);

        // Terminar el combate si a alguno no le quedan Pokémon
        if (player.pokemon_left == 0)
            return await this.finishBattle(opponent, player);
        else if (opponent.pokemon_left == 0)
            return await this.finishBattle(player, opponent);
        
        // Reinicio el contador para ambos usuarios
        this.resumeCounter(player, opponent);
        this.resumeCounter(opponent, player);

        this.messages = [];
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
     * @returns Daño realizado.
     */
    damageCalculator(move, player_pokemon, opponent_pokemon, weather_multiplier, is_critical, stab, effectiveness, is_burned) {
        let attack_stat, defense_stat, attack_string, defense_string;

        // Primero, reviso si es fisico o especial
        if (move.damage_class == "physical") {
            attack_stat = player_pokemon.stats.atk;
            attack_string = "atk";
            defense_stat = opponent_pokemon.stats.def;
            defense_string = "def";
        } else if (move.damage_class == "special") {
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
        const base_damage = ((0.4 * player_pokemon.level + 2) * move.power * final_attack / final_defense) / 50 + 2;

        // Daño luego de los multiplicadores
        const damage_with_multipliers = base_damage * weather_multiplier * stab * effectiveness * is_burned;

        // Si es un golpe crítico, multiplico el daño por 2;
        const damage_after_crit_hit = (is_critical) ? damage_with_multipliers * 2 : damage_with_multipliers;

        // Multiplico por un valor aleatorio entre 0.85 y 1
        const damage_after_random_multiplier = Math.floor(damage_after_crit_hit * randomNumberInInterval(85, 100) * 0.01);
        return damage_after_random_multiplier;
    }
}

module.exports = { Battle };
