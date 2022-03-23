/**
 * Clase para un jugador.
 */
class Player {
    /**
     * Crea un objeto Player.
     * @param {Number} id ID del usuario.
     * @param {String} username Nombre de usuario.
     * @param {String} profile_photo Foto de perfil del usuario.
     * @param {Array} battle_team Equipo de batalla del usuario.
     */
    constructor(id, username, profile_photo, battle_team) {
        this.id = id;
        this.username = username;
        this.profile_photo = profile_photo;
        this.battle_team = battle_team; // Pokemon array
        this.active_pokemon = null; // Pokemon
        this.has_played = false;
        this.chosen_action = null;
        this.time = {
            timer: null,
            time_left: 120000,
            start_time: null,
            end_time: null
        };
    }

    play(action) {
        this.has_played = true;
        this.chosen_action = action;
    }

    assignActivePokemon(index) {
        this.active_pokemon = this.battle_team[index];
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
}

module.exports = { Player }