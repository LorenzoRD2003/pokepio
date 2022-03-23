/**
 * Devuelve la fecha del día de hoy en formato yyyy-mm-dd.
 * @returns Fecha en formato yyyy-mm-dd.
 */
exports.todayDate = () => (new Date).toLocaleDateString("FR-CA");

/**
 * Espera cierta cantidad de tiempo.
 * @param {Number} ms Tiempo en milisegundos.
 * @returns Promesa que se cumple luego de transcurrido el tiempo.
 */
exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Devuelve un valor aleatorio dentro de un intervalo.
 * @param {Number} max Valor máximo.
 * @param {Number} min Valor mínimo.
 * @returns Valor aleatorio.
 */
const randomNumberInInterval = (max, min) => Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Dado un valor de probabilidad sobre otro valor, devuelve si se cumplió la probabilidad.
 * Ejemplo: probability(90, 100) tiene un 90% de probabilidades de devolver true, y un 10% de devolver false.
 * @param {Number} prob Probabilidad.
 * @param {Number} of Sobre cuánto.
 * @returns true/false según se cumplió o no la probabilidad.
 */
exports.probability = (prob, of) => Math.random() * of > of - prob;

/**
 * Devuelve una opción aleatoria de un vector.
 * @param {Array} choices Vector de opciones.
 * @returns Opción elegida aleatoriamente.
 */
exports.chooseRandom = choices => {
    const index = Math.floor(Math.random() * choices.length);
    return choices[index];
}

/**
 * Devuelve una cadena de texto con la primera letra en mayúsculas.
 * @param {String} str Cadena original.
 * @returns Cadena modificada.
 */
exports.capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

