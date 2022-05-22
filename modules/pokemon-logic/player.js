
const { Pokemon } = require("./pokemon.js");
const { allMoves, allTypes, naturesList } = require("../dataArrays");
const fetchFunctions = require('../fetchFunctions');
const { capitalize } = require("../mathFunctions");

/**
 * Clase para un jugador.
 */
class Player {
    /**
     * Crea un objeto Player.
     * @param {Battle} battle Referencia a la batalla
     * @param {Number} id ID del usuario.
     * @param {String} username Nombre de usuario.
     * @param {String} profile_photo Foto de perfil del usuario.
     * @param {Array} battle_team Equipo de batalla del usuario.
     */
    constructor(id, username, profile_photo, battle_team) {
        this.id = id;
        this.username = username;
        this.profile_photo = profile_photo;
        this.battle_team = battle_team.map(pokemon => {
            const pokemon_types = pokemon.types.map(poketype => allTypes.find(type => poketype == type.name));

            const pokemon_nature = naturesList.find(nature => nature.name == pokemon.nature);
            const base_stats = fetchFunctions.getPokemonBaseStats(pokemon.name);

            const move1 = allMoves.find(move => move.id == pokemon.moves[0]);
            const move2 = allMoves.find(move => move.id == pokemon.moves[1]);
            const move3 = allMoves.find(move => move.id == pokemon.moves[2]);
            const move4 = allMoves.find(move => move.id == pokemon.moves[3]);

            return new Pokemon(
                pokemon.name,
                pokemon_types,
                pokemon.level,
                pokemon.happiness,
                pokemon.ability,
                pokemon.item,
                pokemon_nature,
                [move1, move2, move3, move4],
                pokemon.sprite,
                base_stats,
                pokemon.ev,
                pokemon.iv
            );
        });
        this.pokemon_left = this.battle_team.length;
        this.active_pokemon = null; // Pokemon
        this.active_pokemon_index = null;
        this.has_played = false;
        this.chosen_action = null;
        this.time = {
            timer: null,
            time_left: 120000,
            start_time: null,
            end_time: null
        };
    }

    /**
     * Devuelve el Player como un objeto con los datos suficientes para el cliente.
     */
    data() {
        return {
            username: this.username,
            profile_photo: this.profile_photo,
            battle_team: this.battle_team,
            active_pokemon: this.active_pokemon,
            active_pokemon_index: this.active_pokemon_index,
        }
    }

    play(action) {
        this.has_played = true;
        this.chosen_action = action;
    }

    /**
     * Asigna el Pokémon activo.
     * @param {Number} index Índice del Pokémon 
     * @param {Array} messages Vector de mensajes.
     */
    assignActivePokemon(index, messages) {
        this.active_pokemon = this.battle_team[index];
        this.active_pokemon_index = index;
        this.active_pokemon.enterBattle();
        messages.push(`${this.username} elige a ${capitalize(this.active_pokemon.name)}.`);
    }
    
    pauseCounter() {
        // Si en algún momento se inició su contador
        if (this.time.start_time) {
            // Tomo el tiempo en el que se pausa el contador
            this.time.end_time = new Date();

            // El tiempo restante del jugador es la diferencia entre el tiempo inicial y el tiempo final
            this.time.time_left -= this.time.end_time - this.time.start_time;

            // Limpio el contador
            clearTimeout(this.time.timer);
        }
    }

    loseOnePokemon() {
        if (this.pokemon_left)
            this.pokemon_left--;
    }
}

module.exports = { Player }