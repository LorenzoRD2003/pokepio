const funcionFetch = async (link) => {
    const response = await fetch(link);
    const object = await response.text();
    const parsedObject = JSON.parse(object);
    return parsedObject;
}

const obtenerPokemon = async (pokemonNumber) => await funcionFetch(`https://pokeapi.co/api/v2/pokemon/${pokemonNumber}`);
const nombreEspañol = (object) => {
    const nombreEncontrado = object.names.find(nameIndex => nameIndex.language.name == 'es');
    return (nombreEncontrado) ? nombreEncontrado.name : object.name;
}
const descripcionEspañol = (object) => {
    const descripcionEncontrada = object.flavor_text_entries.find(descriptionIndex => descriptionIndex.language.name == "es");
    return (descripcionEncontrada) ? descripcionEncontrada.flavor_text : object.flavor_text_entries[0].flavor_text;
}

const listarTipo = async (url, parentElem) => {
    const tipo = await funcionFetch(url);
    const nombreTipo = nombreEspañol(tipo);
    const liElem = document.createElement("li");
    liElem.textContent = nombreTipo;
    liElem.addEventListener("click", () => mostrarEfectividades(tipo));
    parentElem.append(liElem);
};

const listarHabilidad = async (url, selectElem) => {
    const habilidad = await funcionFetch(url);
    const nombreHabilidad = nombreEspañol(habilidad);
    const optionElem = document.createElement("option");
    optionElem.textContent = nombreHabilidad;
    selectElem.append(optionElem);
}

const listarMovimiento = async (url, parentElem) => {
    const movimiento = await funcionFetch(url);
    if (movimiento.generation.name == "generation-i" || movimiento.generation.name == "generation-i" || movimiento.generation.name == "generation-iii") {
        const nombreMovimiento = nombreEspañol(movimiento);
        const liElem = document.createElement("li");
        liElem.textContent = nombreMovimiento;
        liElem.addEventListener("click", () => descripcionMovimiento(movimiento));
        parentElem.append(liElem);
    }
}

const mostrarDatosPokemon = async () => {
    const pokemonNumber = parseInt(document.getElementById("ingresarNumeroPokemon").value);
    const pokemon = await obtenerPokemon(pokemonNumber);
    console.log(pokemon);

    const divPokemonEncontrado = document.getElementById("pokemonEncontrado");
    divPokemonEncontrado.textContent = "";

    // Mostrar nombre
    const nombrePokemon = document.createElement("h3");
    nombrePokemon.textContent = `Nombre: ${pokemon.species.name}`;

    // Mostrar tipos
    const tiposPokemon = document.createElement("h4");
    tiposPokemon.textContent = "Tipos: ";
    pokemon.types.forEach(async typeID => listarTipo(typeID.type.url, tiposPokemon));

    // Mostrar habilidades
    const habilidadesPokemon = document.createElement("h4");
    habilidadesPokemon.textContent = "Habilidades: ";
    pokemon.abilities.forEach(async abilityID => listarHabilidad(abilityID.ability.url, habilidadesPokemon));

    // Mostrar imagen
    const imagenPokemon = document.createElement("img");
    imagenPokemon.srcset = pokemon.sprites.front_default;

    // Mostrar shiny
    const imagenPokemonShiny = document.createElement("img");
    imagenPokemonShiny.srcset = pokemon.sprites.front_shiny;

    // Mostrar lista de ataques
    const movimientosPokemon = document.createElement("h4");
    movimientosPokemon.textContent = "Movimientos: ";
    pokemon.moves.forEach(async moveID => listarMovimiento(moveID.move.url, movimientosPokemon));

    divPokemonEncontrado.append(nombrePokemon, tiposPokemon, habilidadesPokemon, imagenPokemon, imagenPokemonShiny, movimientosPokemon);
}

const mostrarEfectividades = (tipo) => {
    const divTipoEncontrado = document.getElementById("tipoEncontrado");
    divTipoEncontrado.textContent = "";

    // Mostrar tipo
    const nombreTipo = document.createElement("h3");
    nombreTipo.textContent = nombreEspañol(tipo);
    divTipoEncontrado.append(nombreTipo);

    // Recibe doble daño de
    const doubleDamageFrom = document.createElement("p");
    doubleDamageFrom.textContent = "Recibe doble daño de: ";
    tipo.damage_relations.double_damage_from.forEach(async typeID => await listarTipo(typeID.url, doubleDamageFrom));

    // Recibe mitad de daño de
    const halfDamageFrom = document.createElement("p");
    halfDamageFrom.textContent = "Recibe mitad de daño de: ";
    tipo.damage_relations.half_damage_from.forEach(async typeID => await listarTipo(typeID.url, halfDamageFrom));

    // No recibe daño de
    const noDamageFrom = document.createElement("p");
    noDamageFrom.textContent = "No recibe daño de: ";
    tipo.damage_relations.no_damage_from.forEach(async typeID => await listarTipo(typeID.url, noDamageFrom));

    // Hace doble daño a
    const doubleDamageTo = document.createElement("p");
    doubleDamageTo.textContent = "Hace doble daño a: ";
    tipo.damage_relations.double_damage_to.forEach(async typeID => await (typeID.url, doubleDamageTo));

    // Hace mitad de daño a
    const halfDamageTo = document.createElement("p");
    halfDamageTo.textContent = "Hace mitad de daño a: ";
    tipo.damage_relations.half_damage_to.forEach(async typeID => await listarTipo(typeID.url, halfDamageTo));

    // No hace daño a
    const noDamageTo = document.createElement("p");
    noDamageTo.textContent = "No hace daño a: ";
    tipo.damage_relations.no_damage_to.forEach(async typeID => await listarTipo(typeID.url, noDamageTo));

    divTipoEncontrado.append(doubleDamageFrom, halfDamageFrom, noDamageFrom, doubleDamageTo, halfDamageTo, noDamageTo);
}

const descripcionMovimiento = (movimiento) => {
    const divDescripcionMovimiento = document.getElementById("descripcionMovimiento");
    divDescripcionMovimiento.textContent = "";
    console.log(movimiento);

    // Mostrar movimiento
    const nombreMovimiento = document.createElement("h3");
    nombreMovimiento.textContent = nombreEspañol(movimiento);
    divDescripcionMovimiento.append(nombreMovimiento);

    // Mostrar descripcion
    const descripcionMovimiento = document.createElement("p");
    descripcionMovimiento.textContent = movimiento.effect_entries[0].effect;
    divDescripcionMovimiento.append(descripcionMovimiento);

    // Mostrar poder
    if (movimiento.power) {
        const poderMovimiento = document.createElement("p");
        poderMovimiento.textContent = `Poder: ${movimiento.power}`;
        divDescripcionMovimiento.append(poderMovimiento);
    }

    // Mostrar precision 
    if (movimiento.accuracy) {
        const precisionMovimiento = document.createElement("p");
        precisionMovimiento.textContent = `Precisión: ${movimiento.accuracy}`;
        divDescripcionMovimiento.append(precisionMovimiento);
    }

    // Mostrar categoria
    const categoriaMovimiento = document.createElement("p");
    categoriaMovimiento.textContent = "Categoria: ";
    switch(movimiento.damage_class.name) {
        case "status":
            categoriaMovimiento.textContent += "Estado";
            break;
        case "physical":
            categoriaMovimiento.textContent += "Físico";
            break;
        case "special":
            categoriaMovimiento.textContent += "Especial";
            break;
    }
    divDescripcionMovimiento.append(categoriaMovimiento);
}
