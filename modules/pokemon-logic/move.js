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

    reducePP() {
        if (this.pp > 0)
            this.pp--;
    }
}

module.exports = { Move };
