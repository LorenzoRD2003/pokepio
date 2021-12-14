const fs = require("fs");

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
    const pokemonList = (await funcionFetch("https://pokeapi.co/api/v2/pokemon?limit=386")).results;
    const namesList = pokemonList.map(pokemon => capitalizeFirstLetter(pokemon.name));
    const orderedNamesList = namesList.sort();
    return orderedNamesList;
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
            return {
                id: type.id,
                name: type.name,
                double_damage_to: type.damage_relations.double_damage_to,
                half_damage_to: type.damage_relations.half_damage_to,
                no_damage_to: type.damage_relations.no_damage_to,
            }
        })
    );
    return typesList;
}

exports.searchPokemonData = async (pokemon) => {
    const originalObject = await obtenerPokemon(pokemon);
    const name = pokemon;
    const allTypes = JSON.parse(fs.readFileSync("./files/allTypesList.json", "utf-8"));
    const types = allTypes.filter(type => originalObject.types.find(elem => type.name == elem.type.name));
    const abilities = await Promise.all(
        originalObject.abilities.map(async abilityID => {
            const ability = await funcionFetch(abilityID.ability.url);
            const description = ability.effect_entries.find(entry => entry.language.name == "en").effect;
            return {
                id: ability.id,
                name: ability.name,
                description: description,
                generation: ability.generation.name
            };
        })
    );
    const filteredAbilities = abilities.filter(untilThirdGen);
    const allMoves = JSON.parse(fs.readFileSync("./files/allMovesList.json", "utf-8"));
    const pokemonMoves = allMoves.filter(move => originalObject.moves.find(elem => move.name == elem.move.name));
    const filteredMoves = pokemonMoves.filter(untilThirdGen);
    const image = originalObject.sprites.front_default;
    const shinyImage = originalObject.sprites.front_shiny;
    const base_stats = {
        hp: originalObject.stats[0].base_stat,
        atk: originalObject.stats[1].base_stat,
        def: originalObject.stats[2].base_stat,
        spa: originalObject.stats[3].base_stat,
        spd: originalObject.stats[4].base_stat,
        spe: originalObject.stats[5].base_stat
    }
    return {
        name: name,
        types: types,
        abilities: filteredAbilities,
        moves: filteredMoves,
        image: image,
        shinyImage: shinyImage,
        base_stats: base_stats
    };
}

exports.getPokemonBaseStats = async (pokemon) => {
    const originalObject = await obtenerPokemon(pokemon);
    return {
        hp: originalObject.stats[0].base_stat,
        atk: originalObject.stats[1].base_stat,
        def: originalObject.stats[2].base_stat,
        spa: originalObject.stats[3].base_stat,
        spd: originalObject.stats[4].base_stat,
        spe: originalObject.stats[5].base_stat
    }
}
