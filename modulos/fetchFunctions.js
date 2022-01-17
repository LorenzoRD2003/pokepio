const dataArrays = require("./dataArrays");

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const funcionFetch = async (link) => {
    const response = await fetch(link);
    const object = await response.text();
    const parsedObject = JSON.parse(object);
    return parsedObject;
}
exports.funcionFetch = funcionFetch;
const obtenerPokemon = async (pokemon) => await funcionFetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
exports.obtenerPokemon = obtenerPokemon;

const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const untilThirdGen = (elem) => elem.generation == "generation-i" || elem.generation == "generation-ii" || elem.generation == "generation-iii";
exports.allPokemonList = async () => {
    const namesList = (await funcionFetch("https://pokeapi.co/api/v2/pokemon?limit=386")).results;
    const pokemonList = await Promise.all(
        namesList.map(async pokemonIndex => {
            const pokemon = await funcionFetch(pokemonIndex.url);
            console.log(pokemon.name);
            return {
                name: capitalizeFirstLetter(pokemon.name),
                types: pokemon.types.map(index => index.type.name),
                abilities: pokemon.abilities.map(index => index.ability.name),
                moves: pokemon.moves.map(index => index.move.name),
                image: pokemon.sprites.front_default,
                shinyImage: pokemon.sprites.front_shiny,
                base_stats: {
                    hp: pokemon.stats[0].base_stat,
                    atk: pokemon.stats[1].base_stat,
                    def: pokemon.stats[2].base_stat,
                    spa: pokemon.stats[3].base_stat,
                    spd: pokemon.stats[4].base_stat,
                    spe: pokemon.stats[5].base_stat
                }
            }
        })
    );
    return pokemonList;
};
exports.allNaturesList = async () => {
    const namesList = (await funcionFetch("https://pokeapi.co/api/v2/nature?limit=25")).results;
    const naturesList = await Promise.all(
        namesList.map(async natureIndex => {
            const nature = await funcionFetch(natureIndex.url);
            return {
                name: capitalizeFirstLetter(nature.name),
                stat_up: (nature.increased_stat) ? nature.increased_stat.name : null,
                stat_down: (nature.decreased_stat) ? nature.decreased_stat.name : null
            }
        }
    ));
    return naturesList.sort();
}
exports.allItemsList = async () => {
    const namesList = (await funcionFetch("https://pokeapi.co/api/v2/item?limit=2000")).results;
    const itemsList = await Promise.all(
        namesList.map(async itemIndex => {
            const item = await funcionFetch(itemIndex.url);
            return {
                id: item.id,
                name: capitalizeFirstLetter(item.name),
                description: item.effect_entries[0].effect,
                generation: item.game_indices[0].generation.name
            }
        })
    );
    return itemsList.filter(untilThirdGen);
}
exports.allMovesList = async () => {
    const namesList = (await funcionFetch("https://pokeapi.co/api/v2/move?limit=2000")).results;
    const movesList = await Promise.all(
        namesList.map(async moveIndex => {
            const move = await funcionFetch(moveIndex.url);
            const damage_class = move.damage_class;
            const effect_entry = move.effect_entries[0];
            return {
                id: move.id,
                name: move.name,
                power: move.power,
                type: move.type.name,
                pp: move.pp,
                accuracy: move.accuracy,
                priority: move.priority,
                damage_class: (damage_class) ? damage_class.name : null,
                effect: (effect_entry) ? effect_entry.effect : null,
                effect_chance: move.effect_chance,
                generation: move.generation.name,
                meta: move.meta
            };
        })
    );
    return movesList.filter(untilThirdGen);
}
exports.allTypesList = async () => {
    const namesList = (await funcionFetch("https://pokeapi.co/api/v2/type?limit=2000")).results;
    const typesList = await Promise.all(
        namesList.map(async typeIndex => {
            const type = await funcionFetch(typeIndex.url);

            const double_damage_from = type.damage_relations.double_damage_from.map(t => t.name);
            const half_damage_from = type.damage_relations.half_damage_from.map(t => t.name);
            const no_damage_from = type.damage_relations.no_damage_from.map(t => t.name);
            return {
                id: type.id,
                name: type.name,
                double_damage_from: double_damage_from,
                half_damage_from: half_damage_from,
                no_damage_from: no_damage_from
            }
        })
    );
    return typesList;
}
exports.allAbilitiesList = async () => {
    const namesList = (await funcionFetch("https://pokeapi.co/api/v2/ability?limit=2000")).results;
    const abilitiesList = await Promise.all(
        namesList.map(async abilityIndex => {
            const ability = await funcionFetch(abilityIndex.url);
            const effect_entry = ability.effect_entries[1];
            return {
                id: ability.id,
                name: ability.name,
                effect: (effect_entry) ? effect_entry.short_effect : null,
                generation: ability.generation.name
            }
        })
    );
    return abilitiesList.filter(untilThirdGen);
}

exports.searchPokemonData = async (pokemon) => {
    pokemon = capitalizeFirstLetter(pokemon);
    const pkmnFound = dataArrays.pokemonList.find(pkmn => pkmn.name == pokemon);
    const name = pkmnFound.name;
    const types = pkmnFound.types.map(pkmnType => dataArrays.allTypes.find(type => type.name == pkmnType));
    const abilities = pkmnFound.abilities.map(pkmnAbility => dataArrays.allAbilities.find(ability => ability.name == pkmnAbility)).filter(ability => ability);
    const moves = pkmnFound.moves.map(pkmnMove => dataArrays.allMoves.find(move => move.name == pkmnMove)).filter(move => move);
    const image = pkmnFound.image;
    const shinyImage = pkmnFound.shinyImage;
    const base_stats = pkmnFound.base_stats;
    return {
        name: name,
        types: types,
        abilities: abilities,
        moves: moves,
        image: image,
        shinyImage: shinyImage,
        base_stats: base_stats
    };
}

exports.getPokemonBaseStats = (pokemon) => {
    pokemon = capitalizeFirstLetter(pokemon);
    const pkmnFound = dataArrays.pokemonList.find(pkmn => pkmn.name == pokemon);
    return pkmnFound.base_stats;
}
