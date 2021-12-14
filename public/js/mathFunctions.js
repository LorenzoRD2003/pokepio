const POKEMON_LEVEL = 100;
const calculateHP = (base_hp, ev_hp, iv_hp) => Math.floor(0.01 * (2 * base_hp + iv_hp + Math.floor(0.25 * ev_hp)) * POKEMON_LEVEL) + POKEMON_LEVEL + 10;
const calculateStat = (base_stat, ev, iv, natureMultiplier) => Math.floor((Math.floor(0.01 * (2 * base_stat + iv + Math.floor(0.25 * ev)) * POKEMON_LEVEL) + 5) * natureMultiplier);
