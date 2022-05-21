const { capitalize, probability } = require("../mathFunctions.js");
const { Move } = require("./move.js");

/**
 * Clase para un objeto Pokémon.
 */
class Pokemon {
    /**
     * Crea un objeto de la clase Pokémon.
     * @param {String} name Nombre del Pokémon.
     * @param {Array} types Tipos del Pokémon.
     * @param {Number} level Nivel del Pokémon.
     * @param {Number} happiness Felicidad del Pokémon.
     * @param {String} ability Habilidad del Pokémon.
     * @param {String} item Objeto equipado del Pokémon.
     * @param {Object} nature Naturaleza del Pokémon.
     * @param {Array} moves Movimientos del Pokémon.
     * @param {String} sprite Sprite del Pokémon (URL).
     * @param {Object} base_stats Stats base del Pokémon.
     * @param {Object} ev EV's del Pokémon.
     * @param {Object} iv IV's del Pokémon.
     */
    constructor(name, types, level, happiness, ability, item, nature, moves, sprite, base_stats, ev, iv) {
        this.name = name;
        this.types = types;
        this.level = level;
        this.happiness = happiness;
        this.ability = ability;
        this.item = item;
        this.nature = nature;
        this.moves = moves.map(move => new Move(move.name, move.power, move.type, move.pp, move.accuracy, move.priority, move.damage_class, move.effect_chance, move.meta.crit_rate));
        this.sprite = sprite;
        this.base_stats = base_stats;
        this.ev = ev;
        this.iv = iv;

        // Stats numéricos definitivos
        this.stats = {
            hp: {
                max_hp: this.calculateHP(),
                current_hp: this.calculateHP()
            },
            atk: {
                name: "Ataque",
                base_stat: this.calculateAttack(),
                stage: 0
            },
            def: {
                name: "Defensa",
                base_stat: this.calculateDefense(),
                stage: 0
            },
            spa: {
                name: "Ataque Especial",
                base_stat: this.calculateSpecialAttack(),
                stage: 0
            },
            spd: {
                name: "Defensa Especial",
                base_stat: this.calculateSpecialDefense(),
                stage: 0
            },
            spe: {
                name: "Velocidad",
                base_stat: this.calculateSpeed(),
                stage: 0
            },
            acc: {
                name: "Precisión",
                stage: 0
            },
            eva: {
                name: "Evasión",
                stage: 0
            }
        }

        this.crit_rate = 0; // Ratio de crítico
        this.is_alive = true; // Si está vivo
        this.status = "OK"; // Estado del Pokémon
        this.turns_poisoned = 0;
        this.turns_asleep = 0;
        this.other_status = {
            confused: false,
            flinched: false,
            has_to_rest: false,
            bounded: false,
            cursed: false,
            drowsy: false,
            encore: false,
            identified: false,
            infatuated: false,
            leech_seed: false,
            nightmare: false,
            perish_song: false,
            taunted: false,
            tormented: false,
            bracing: false,
            charging_turn: false,
            center_of_attention: false,
            defense_curl: false,
            rooting: false,
            magic_coat: false,
            minimized: false,
            protected: false,
            flying: false,
            digging: false,
            diving: false,
            substitute: false,
            aiming: false,
            thrashing: false,
            transformed: false,
            safeguard: false
        };
        this.can_change = true; // Si puede cambiar de Pokémon.
        this.can_attack = false;
    }

    getMoveByIndex(index) {
        return this.moves[index];
    }

    /**
         * Devuelve el multiplicador por naturaleza del Pokémon respecto al stat ingresado.
         * @param {String} stat Nombre del stat ("attack", "defense", "special-attack", "special-defense", "speed"). 
         * @returns Multiplicador por naturaleza del Pokémon respecto al stat ingresado.
         */
    getNatureMultiplier(stat) {
        if (this.nature.statUp == stat)
            return 1.1;
        else if (this.nature.statDown == stat)
            return 0.9;

        return 1;
    }

    /**
     * Calcula y devuelve el stat de vida de un Pokémon.
     * @returns El stat de vida.
     */
    calculateHP() {
        if (this.name == "shedinja")
            return 1;

        return Math.floor(0.01 * (2 * this.base_stats.hp + this.iv.hp + Math.floor(0.25 * this.ev.hp)) * this.level) + this.level + 10;
    }

    calculateAttack() {
        const natureMultiplier = this.getNatureMultiplier("attack");
        return Math.floor((Math.floor(0.01 * (2 * this.base_stats.atk + this.iv.atk + Math.floor(0.25 * this.ev.atk)) * this.level) + 5) * natureMultiplier);
    }

    calculateDefense() {
        const natureMultiplier = this.getNatureMultiplier("defense");
        return Math.floor((Math.floor(0.01 * (2 * this.base_stats.def + this.iv.def + Math.floor(0.25 * this.ev.def)) * this.level) + 5) * natureMultiplier);
    }

    calculateSpecialAttack() {
        const natureMultiplier = this.getNatureMultiplier("special-attack");
        return Math.floor((Math.floor(0.01 * (2 * this.base_stats.spa + this.iv.spa + Math.floor(0.25 * this.ev.spa)) * this.level) + 5) * natureMultiplier);
    }

    calculateSpecialDefense() {
        const natureMultiplier = this.getNatureMultiplier("special-defense");
        return Math.floor((Math.floor(0.01 * (2 * this.base_stats.spd + this.iv.spd + Math.floor(0.25 * this.ev.spd)) * this.level) + 5) * natureMultiplier);
    }

    calculateSpeed() {
        const natureMultiplier = this.getNatureMultiplier("speed");
        return Math.floor((Math.floor(0.01 * (2 * this.base_stats.spe + this.iv.spe + Math.floor(0.25 * this.ev.spe)) * this.level) + 5) * natureMultiplier);
    }

    getStat(stat_name) {
        switch (stat_name) {
            case "atk":
                return this.stats.atk;
            case "def":
                return this.stats.def;
            case "spa":
                return this.stats.spa;
            case "spd":
                return this.stats.spd;
            case "spe":
                return this.stats.spe;
            case "acc":
                return this.stats.acc;
            case "eva":
                return this.stats.eva;
        }
    }

    getStatMultiplier(stat_name) {
        const stat = this.getStat(stat_name);

        if (stat_name == "acc" || stat_name == "eva")
            return Math.max(3, 3 + stat.stage) / Math.max(3, 3 - stat.stage);
        else
            return Math.max(2, 2 + stat.stage) / Math.max(2, 2 - stat.stage);
    }

    /**
     * Devuelve el número que se usa en un stat.
     * @param {Object} stat_name Nombre del stat de un Pokémon.
     * @returns El número que se usa a la hora de calcular con el stat.
     */
    getBattleStat(stat_name) {
        const base_stat = this.getStat(stat_name).base_stat;
        const multiplier = this.getStatMultiplier(stat_name);
        return base_stat * multiplier;
    }

    /**
     * Reduce la vida del Pokémon.
     * @param {Number} damage Daño recibido.
     * @param {Array} messages Vector de mensajes.
     */
    reduceHP(damage, messages) {
        // Restamos vida del Pokémon
        this.stats.hp.current_hp -= damage;
        messages.push(`${capitalize(this.name)} recibió ${damage} puntos de daño.`);

        // Si no le queda vida
        if (this.stats.hp.current_hp <= 0)
            this.die(messages);
    }

    die(messages) {
        // Dejamos la vida en cero
        this.stats.hp.current_hp = 0;

        // Informamos que el Pokémon fue debilitado
        this.is_alive = false;
        messages.push(`¡${capitalize(this.name)} fue debilitado!`);
    }

    /**
     * Recupera la vida del Pokémon.
     * @param {Number} hp Vida a recuperar. 
     * @param {Array} messages Vector de mensajes.
     */
    restoreHP(hp, messages) {
        // Sumamos la vida al parámetro del Pokémon
        this.stats.hp.current_hp += hp;

        // Si tiene más vida que la máxima, entonces la dejamos en la máxima
        if (this.stats.hp.current_hp >= this.stats.hp.max_hp) {
            this.stats.hp.current_hp = this.stats.hp.max_hp;
            messages.push(`¡Ahora la vida de ${capitalize(this.name)} está al máximo!`);
        } else {
            messages.push(`${capitalize(this.name)} recuperó ${hp} puntos de vida.`);
        }
    }

    /**
     * Se autodestruye este Pokemon.
     * @param {Array} messages Vector de mensajes.
     */
    selfDestruct() {
        this.stats.hp.current_hp = 0;
        this.is_alive = false;
        messages.push(`¡${capitalize(this.name)} se auto-destruyó y fue debilitado!`);
    }

    /**
     * Trabaja con la modificación de los stats por niveles.
     * @param {String} stat_name Nombre del stat a modificar.
     * @param {Number} stages Cantidad de niveles a subir(+) o bajar (-).
     * @param {Array} messages Vector de mensajes.
     */
    changeStatStage(stat_name, stages, messages) {
        let stat = this.getStat(stat_name);

        // Si un stat está al máximo, no se puede incrementar.
        if (stat.stage == 6 && stages > 0) {
            messages.push(`¡${stat.name} de ${capitalize(this.name)} no puede subir más!`);
            return;
        }

        // Si un stat está al mínimo, no se puede bajar.
        if (stat.stage == -6 && stages < 0) {
            messages.push(`¡${stat.name} de ${capitalize(this.name)} no puede bajar más!`);
            return;
        }

        // Un mensaje distinto según la cantidad de niveles.
        switch (stages) {
            case 3:
                messages.push(`¡${stat.name} de ${capitalize(this.name)} subió muchísimo!`);
                break;
            case 2:
                messages.push(`¡${stat.name} de ${capitalize(this.name)} subió mucho!`);
                break;
            case 1:
                messages.push(`¡${stat.name} de ${capitalize(this.name)} subió!`);
                break;
            case -1:
                messages.push(`¡${stat.name} de ${capitalize(this.name)} bajó!`);
                break;
            case -2:
                messages.push(`¡${stat.name} de ${capitalize(this.name)} bajó mucho!`);
                break;
            case -3:
                messages.push(`¡${stat.name} de ${capitalize(this.name)} bajó muchísimo!`);
                break;
            default:
                console.log("error stat stage change");
                break;
        }

        // Aumentamos/Bajamos el stat, y si excede el máximo o el mínimo lo dejamos en los correspondientes.
        stat.stage += stages;

        if (stat.stage > 6)
            stat.stage = 6;

        if (stat.stage < -6)
            stat.stage = 6;
    }

    /**
     * Se le otorga el estado Burned de ser posible.
     * @param {Array} messages Vector de mensajes.
     */
    burn(messages) {
        // Si ya tiene un estado alterado
        if (this.status != "OK")
            return;

        // Si es de tipo fuego
        if (this.types.includes("fire"))
            return;

        // Si tiene velo sagrado
        if (this.other_status.safeguard)
            return;

        // Si está debilitado
        if (!this.is_alive)
            return;

        // Quemamos al Pokémon
        this.status = "burned";
        messages.push(`¡${capitalize(this.name)} fue quemado!`);
    }

    /**
     * Se le otorga el estado Frozen de ser posible.
     * @param {String} weather Clima de la batalla.
     * @param {Array} messages Vector de mensajes.
     */
    freeze(weather, messages) {
        // Si ya tiene un estado alterado
        if (this.status != "OK")
            return;

        // Si es de tipo hielo
        if (this.types.includes("ice"))
            return;

        // Si el clima es soleado
        if (weather == "sunny")
            return;

        // Si tiene velo sagrado
        if (this.other_status.safeguard)
            return;

        // Si está debilitado
        if (!this.is_alive)
            return;

        // Congelamos al Pokémon
        this.status = "frozen";
        messages.push(`¡${capitalize(this.name)} fue congelado!`);
    }

    /**
     * Se le otorga el estado Paralyzed de ser posible.
     * @param {Array} messages Vector de mensajes.
     */
    paralyze(messages) {
        // Si ya tiene un estado alterado
        if (this.status != "OK")
            return;

        // Si es de tipo electrico
        if (this.types.includes("electric"))
            return;

        // Si tiene velo sagrado
        if (this.other_status.safeguard)
            return;

        // Si está debilitado
        if (!this.is_alive)
            return;

        // Se paraliza al Pokémon
        this.status = "paralyzed";
        messages.push(`¡${capitalize(this.name)} fue paralizado!`);
    }

    /**
     * Le otorga el estado Poisoned de ser posible.
     * @param {Array} messages Vector de mensajes.
     * @param {Boolean} is_badly Booleano que hace referencia a si está gravemente envenenado o no
     */
    poison(messages, is_badly) {
        // Si ya tiene un estado alterado
        if (this.status != "OK")
            return;

        // Si es de tipo veneno
        if (this.types.includes("poison"))
            return;

        // Si es de tipo acero
        if (this.types.includes("steel"))
            return;

        // Si tiene velo sagrado
        if (this.other_status.safeguard)
            return;

        // Si está debilitado
        if (!this.is_alive)
            return;

        // Se envenena al Pokémon
        if (is_badly) {
            this.status = "badly-poisoned";
            messages.push(`¡${capitalize(this.name)} fue gravemente envenenado!`);
        } else {
            this.status = "poisoned";
            messages.push(`¡${capitalize(this.name)} fue envenenado!`);
        }
        this.turns_poisoned = 0;
    }

    sleep(messages) {
        // Si ya tiene un estado alterado
        if (this.status != "OK")
            return;

        // Si tiene velo sagrado
        if (this.other_status.safeguard)
            return;

        // Si está debilitado
        if (!this.is_alive)
            return;

        // Se duerme al Pokémon
        this.status = "asleep";
        messages.push(`¡${capitalize(this.name)} fue dormido!`);
    }

    /**
     * El Pokémon retrocede.
     * @param {Array} messages Vector de mensajes.
     */
    flinch(messages) {
        // Si está debilitado
        if (!this.is_alive)
            return;

        this.other_status.flinched = true;
        messages.push(`¡${capitalize(this.name)} retrocedió!`);
    }

    /**
     * El Pokémon se confunde.
     * @param {Array} messages Vector de mensajes.
     */
    confuse(messages) {
        // Si está debilitado
        if (!this.is_alive)
            return;

        // Si tiene velo sagrado
        if (this.other_status.safeguard)
            return;

        this.other_status.confused = true;
        messages.push(`¡${capitalize(this.name)} está confuso!`);
    }

    chargeTurn(messages) {
        // Ahora el movimiento está cargado
        this.other_status.charging_turn = true;
        messages.push(`${capitalize(this.name)} está cargando su movimiento.`);
    }

    liberateMovement(messages) {
        // Ya no está cargado
        this.charging_turn = false;
        messages.push(`${capitalize(this.name)} libera su movimiento.`);
    }

    getTrapped(messages) {
        // Si está debilitado
        if (!this.is_alive)
            return;

        // Elijo aleatoriamente la cantidad de turnos que va a estar atrapado
        const howManyTurns = mathFunctions.chooseRandom(2, 2, 2, 3, 3, 3, 4, 5);
        this.other_status.bounded = howManyTurns;

        messages.push(`¡${capitalize(this.name)} fue atrapado por el ataque de su oponente!`);
    }

    recoverHP(percentage, messages) {
        this.stats.hp.current_hp += Math.floor(this.stats.hp.max_hp * percentage / 100);
        if (this.stats.hp.current_hp > this.stats.hp.max_hp) {
            this.stats.hp.current_hp = this.stats.hp.max_hp
        }
        messages.push(`¡${capitalize(this.name)} recuperó salud!`);
    }

    endTurnStatus(messages) {
        // Veneno
        if (this.status == "poisoned" || this.status == "badly-poisoned") {
            this.turns_poisoned++;
            messages.push(`¡${capitalize(this.name)} pierde salud por el veneno!`);

            let damage;
            if (this.status == "badly-poisoned")
                damage = Math.floor(this.stats.hp.max_hp * (1 / 16) * this.turns_poisoned);
            else
                damage = Math.floor(this.stats.hp.max_hp * 1 / 8);

            this.reduceHP(damage, messages);
        }

        // Quemadura
        if (this.status == "burned") {
            messages.push(`¡${capitalize(this.name)} pierde salud por la quemadura!`);
            this.reduceHP(Math.floor(this.stats.hp.max_hp * 1 / 8), messages);
        }

        // Retroceso
        this.other_status.flinched = false;
    }

    isFlinched() {
        return this.other_status.flinched;
    }

    handleConfusion(messages) {
        if (!this.other_status.confused)
            return false;

        messages.push(`¡${capitalize(this.name)} está confuso!`);

        // 50% de probabilidades de atacarse a sí mismo
        if (!probability(50, 100))
            return false;

        // Daño de un punto de salud por cada punto de ataque fisico
        let damage = this.getBattleStat("atk");
        messages.push(`¡${capitalize(this.name)} se ha dañado a sí mismo!`);
        this.reduceHP(damage, messages);
        return true;
    }

    handleParalysis(messages) {
        // 25% de probabilidades de no actuar
        if (this.status == "paralyzed" && probability(25, 100)) {
            messages.push(`¡${capitalize(this.name)} está paralizado y no puede actuar!`);
            return true;
        }
        return false;
    }

    handleSleep(messages) {
        if (this.status != "asleep")
            return false;

        let wake_up = probability(100 / 3 * this.turns_asleep, 100);

        if (wake_up) {
            this.status == "OK";
            this.turns_asleep = 0;
            messages.push(`¡${capitalize(this.name)} se despertó!`);
            return false;
        }

        messages.push(`${capitalize(this.name)} está dormido...`);
        this.turns_asleep++;
        return true;
    }

    handleFreeze(messages) {
        if (this.status != "frozen")
            return false;
        
        // Probabilidad del 20% de descongelarse
        if (probability(20, 100)) {
            messages.push(`¡${capitalize(this.name)} se descongeló!`);
            this.status = "OK";
            return false;   
        }

        messages.push(`¡${capitalize(this.name)} está congelado y no puede actuar!`);
        return true;
    }
}


module.exports = { Pokemon };
