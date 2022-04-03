const MAX_EV_SUM = 510; // Cantidad Máxima de EV's para un Pokémon

// Calcular vida de un Pokémon
const calculateHP = (base_hp, level, ev_hp, iv_hp) => {
    base_hp = parseInt(base_hp);
    level = parseInt(level);
    ev_hp = parseInt(ev_hp);
    iv_hp = parseInt(iv_hp);

    return Math.floor(0.01 * (2 * base_hp + iv_hp + Math.floor(0.25 * ev_hp)) * level) + level + 10;

}

// Calcular stats (excepto vida) de un Pokémon
const calculateStat = (base_stat, level, ev, iv, natureMultiplier) => {
    base_stat = parseInt(base_stat);
    level = parseInt(level);
    ev = parseInt(ev);
    iv = parseInt(iv);
    natureMultiplier = parseFloat(natureMultiplier);

    return Math.floor((Math.floor(0.01 * (2 * base_stat + iv + Math.floor(0.25 * ev)) * level) + 5) * natureMultiplier);
}

/**
 * Devuelve el multiplicador de un stat respecto a la naturaleza de un Pokémon.
 * @param {Object} nature Naturaleza del Pokémon.
 * @param {String} stat Nombre del stat.
 * @returns 
 */
 const getNatureMultiplier = (nature, stat) => {
    if (nature.statUp == stat) {
        return 1.1;
    } else if (nature.statDown == stat) {
        return 0.9;
    } else {
        return 1;
    }
}

const addNewTeamButton = document.getElementById("addNewTeamButton");
const pokemonSelector = document.getElementById("pokemon-selector");
const searchPokemonDataButton = document.getElementById("searchPokemonDataButton");

if (addNewTeamButton) {
    addNewTeamButton.addEventListener("click", async () => {
        addNewTeamButton.disabled = true;

        // Creo un objeto, con el nombre del equipo
        const object = { team_name: getValueByID("newTeamName") };

        // Hago el pedido de creación al servidor
        try {
            await nodeReq.post('/teambuilder/team', object);
            createSuccessModal("newTeamModal", `Su equipo, ${object.team_name}, fue creado satisfactoriamente.`);

            // Cambio el div que se muestra en pantalla por el de selección de Pokémon
            document.getElementById("newTeamNameDiv").hidden = true;
            document.getElementById("selectPokemonDiv").hidden = false;
            document.getElementById("teamNameID").textContent = `Nombre del Equipo: ${object.team_name}`;
        } catch (err) {
            handleAxiosError(err);
        } finally {
            addNewTeamButton.disabled = false;
        }
    });
}

// Sección de Pokémon
pokemonSelector.addEventListener("change", () => {
    // Quiero poder clickear el botón cuando el indice del selector es distinto de cero
    let index = pokemonSelector.selectedIndex;
    searchPokemonDataButton.disabled = (index == 0);
});

searchPokemonDataButton.addEventListener("click", async () => {
    searchPokemonDataButton.disabled = true;

    // Escondo el <div> para mostrarlo cuando tenga los datos
    const addPokemonDiv = document.getElementById("addPokemonDiv");
    addPokemonDiv.hidden = true;

    // Clono el <div> para eliminar los addEventListener
    const cloneAddPokemonDiv = addPokemonDiv.cloneNode(true);
    addPokemonDiv.parentNode.replaceChild(cloneAddPokemonDiv, addPokemonDiv);

    try {
        // Hago el pedido al servidor
        const res = (await nodeReq({
            method: 'get',
            url: '/teambuilder/pokemon',
            params: {
                name: getValueByID("pokemon-selector")
            }
        })).data;

        // Nombre
        const pokemonName = document.getElementById("pokemonName");
        pokemonName.textContent = `Nombre: ${capitalizeFirstLetter(res.name)}`;


        // Sprite
        const pokemonImage = document.getElementById("pokemonImage");
        const isShinyCheckbox = document.getElementById("isShinyCheckbox");

        // Al principio, está seleccionado por defecto que NO es shiny.
        pokemonImage.srcset = res.image;
        isShinyCheckbox.checked = false;

        // Según si la checkbox está seleccionada, cambio la imagen del Pokémon por la shiny
        isShinyCheckbox.addEventListener("click", e => pokemonImage.srcset = (e.target.checked) ? res.shinyImage : res.image);


        // Tipos
        const pokemonTypes = document.getElementById("pokemonTypes");
        pokemonTypes.textContent = "Tipos: ";
        // Agrego todos los tipos del Pokémon con un forEach
        res.types.forEach(type => pokemonTypes.textContent += `${capitalizeFirstLetter(type.name)} `);


        // Nivel
        const pokemonLevel = document.getElementById("pokemonLevel");
        pokemonLevel.value = 100; // Nivel por defecto: 100
        pokemonLevel.addEventListener("input", () => enforceMinMax(pokemonLevel));


        // Felicidad
        const happiness = document.getElementById("happiness");
        happiness.value = 255; // Felicidad por defecto: 255
        happiness.addEventListener("input", () => enforceMinMax(happiness));


        // Habilidades
        const pokemonAbilitiesList = document.getElementById("pokemonAbilitiesList");
        const abilityDescription = document.getElementById("abilityDescription");
        pokemonAbilitiesList.innerHTML = '<option disabled selected value="">Seleccione una habilidad: </option>';
        abilityDescription.textContent = "";

        // Para cada habilidad, creo una <option> y la agrego a la lista
        res.abilities.forEach(ability => {
            const optionElem = document.createElement("option");
            optionElem.textContent = capitalizeFirstLetter(ability.name);
            optionElem.dataset.description = ability.effect;
            pokemonAbilitiesList.append(optionElem);
        });

        // Cuando selecciono una habilidad en la lista, muestro su descripción
        pokemonAbilitiesList.addEventListener("change", e => {
            const selectedOption = e.target.selectedOptions[0];
            abilityDescription.textContent = selectedOption.dataset.description;
        });


        // Movimientos
        // Creo una lista de movimientos
        const selectElem = document.createElement("select");
        selectElem.innerHTML = "<option disabled selected>Seleccione un movimiento: </option>";

        // Ordeno la lista segun el nombre de movimiento
        const sortedMoves = res.moves.sort((move1, move2) => {
            if (move1.name > move2.name)
                return 1;
            
            if (move1.name < move2.name)
                return -1;
            
            return 0;
        })

        // A cada movimiento, lo agrego a la lista
        sortedMoves.forEach(move => {
            const optionElem = document.createElement("option");
            optionElem.textContent = `${capitalizeFirstLetter(move.name)} - ${capitalizeFirstLetter(move.damage_class)} - ${capitalizeFirstLetter(move.type)}`;
            if (move.power) {
                optionElem.textContent += ` - Poder: ${move.power}`;
            }
            optionElem.textContent += ` - PP: ${move.pp}`;
            if (move.accuracy) {
                optionElem.textContent += ` - Precisión: ${move.accuracy}%`;
            }
            optionElem.value = move.id;
            optionElem.dataset.effect = move.effect;
            optionElem.dataset.effect_chance = move.effect_chance;
            selectElem.append(optionElem);
        });

        // Lleno todas las listas de movimientos con un for
        const movesLists = document.getElementsByClassName("movesList");
        for (let movesList of movesLists) {
            movesList.innerHTML = selectElem.innerHTML;
            const moveDescription = movesList.nextElementSibling;
            moveDescription.textContent = "";

            // Cuando selecciono un movimiento, quiero que me aparezca su descripción
            movesList.addEventListener("change", e => {
                // Obtengo el efecto del movimiento
                const selectedOption = e.target.selectedOptions[0];
                const moveEffect = selectedOption.dataset.effect;

                // Cambio la descripción
                moveDescription.textContent = moveEffect.replace(/\$.*%/gm, `${selectedOption.dataset.effect_chance}%`);
            });
        }


        // IVs
        // Rangos de IV
        const rangeIVList = document.getElementsByClassName("iv-range");
        for (let range of rangeIVList) {
            range.value = 31; // Default: 31

            // Cuando cambio un rango, cambia su input correspondiente
            range.addEventListener("input", e => {
                const inputElem = range.parentElement.parentElement.childNodes[5].childNodes[1];
                inputElem.value = e.target.value;
            });
        }
        // Inputs de IV
        const inputIVList = document.getElementsByClassName("iv-control");
        for (let input of inputIVList) {
            input.value = 31; // Default: 31

            // Cuando cambio un input, cambia su rango correspondiente
            input.addEventListener("input", e => {
                enforceMinMax(input);
                const rangeElem = input.parentElement.parentElement.childNodes[3].childNodes[1];
                rangeElem.value = e.target.value;
            });
        }


        // EVs
        // Rangos de IV
        const rangeEVList = document.getElementsByClassName("ev-range");
        for (let range of rangeEVList) {
            range.value = 0; // Default: 0

            // Cuando cambio un rango, cambia su input correspondiente
            range.addEventListener("input", e => {
                const inputElem = range.parentElement.parentElement.childNodes[5].childNodes[1];
                inputElem.value = e.target.value;

                // Obtengo la suma total de EVs
                let sumOfEVs = 0;
                for (let rangeForSum of rangeEVList) {
                    sumOfEVs += parseInt(rangeForSum.value);
                }

                // Si me paso del máximo posible
                if (sumOfEVs > MAX_EV_SUM) {
                    range.value = 0;
                    // Obtengo el máximo valor al que puedo llegar y lo pongo
                    sumOfEVs = 0;
                    for (let rangeForSum of rangeEVList) {
                        sumOfEVs += parseInt(rangeForSum.value);
                    }

                    const maxPossibleValue = MAX_EV_SUM - sumOfEVs;
                    range.value = maxPossibleValue;
                    inputElem.value = maxPossibleValue;
                }
            });
        }
        // Inputs de EV
        const inputEVList = document.getElementsByClassName("ev-control");
        for (let input of inputEVList) {
            input.value = 0; // Default: 0

            // Cuando cambio un input, cambia su rango correspondiente
            input.addEventListener("input", (event) => {
                enforceMinMax(input);
                const rangeElem = input.parentElement.parentElement.childNodes[3].childNodes[1];
                rangeElem.value = event.target.value;

                // Obtengo la suma total de EVs
                let sumOfEVs = 0;
                for (let inputForSum of inputEVList) {
                    sumOfEVs += parseInt(inputForSum.value);
                }

                if (sumOfEVs > MAX_EV_SUM) {
                    input.value = 0;

                    // Obtengo el máximo valor al que puedo llegar y lo pongo
                    sumOfEVs = 0;
                    for (let inputForSum of inputEVList) {
                        sumOfEVs += parseInt(inputForSum.value);
                    }

                    const maxPossibleValue = MAX_EV_SUM - sumOfEVs;
                    input.value = maxPossibleValue;
                    rangeElem.value = maxPossibleValue;
                }
            });
        }


        // Estadisticas
        // Para todas las estadísticas es similar
        const hpStat = document.getElementById("hpStat");
        const hpEV = document.getElementById("inputEVhp");
        const hpIV = document.getElementById("inputIVhp");

        // Muestro la estadística que se obtendría con el Pokémon, nivel, EV, IV
        // Uso una funciones matemáticas en mathFunctions.js para los cálculos.
        hpStat.textContent = (res.name != "shedinja") ? `PV: ${calculateHP(res.base_stats.hp, pokemonLevel.value, hpEV.value, hpIV.value)}` : `PV: 1`;

        // Además, cada vez que cambio alguna de las variables, quiero cambiar el valor que me aparece
        const hpElemUpdaters = document.getElementsByClassName("hp-updater");
        for (let elem of hpElemUpdaters) {
            elem.addEventListener("input", () => {
                if (res.name != "shedinja") hpStat.textContent = `PV: ${calculateHP(res.base_stats.hp, pokemonLevel.value, hpEV.value, hpIV.value)}`;
            });
        }

        const atkStat = document.getElementById("atkStat");
        const atkEV = document.getElementById("inputEVatk");
        const atkIV = document.getElementById("inputIVatk");
        atkStat.textContent = `Ataque: ${calculateStat(res.base_stats.atk, pokemonLevel.value, atkEV.value, atkIV.value, 1)}`;
        const atkElemUpdaters = document.getElementsByClassName("atk-updater");
        for (let elem of atkElemUpdaters) {
            elem.addEventListener("input", () => {
                const nature = natureSelector.selectedOptions[0].dataset;
                const natureMultiplier = getNatureMultiplier(nature, "attack");
                atkStat.textContent = `Ataque: ${calculateStat(res.base_stats.atk, pokemonLevel.value, atkEV.value, atkIV.value, natureMultiplier)}`;
            })
        }

        const defStat = document.getElementById("defStat");
        const defEV = document.getElementById("inputEVdef");
        const defIV = document.getElementById("inputIVdef");
        defStat.textContent = `Defensa: ${calculateStat(res.base_stats.def, pokemonLevel.value, defEV.value, defIV.value, 1)}`;
        const defElemUpdaters = document.getElementsByClassName("def-updater");
        for (let elem of defElemUpdaters) {
            elem.addEventListener("input", () => {
                const nature = natureSelector.selectedOptions[0].dataset;
                const natureMultiplier = getNatureMultiplier(nature, "defense");
                defStat.textContent = `Defensa: ${calculateStat(res.base_stats.def, pokemonLevel.value, defEV.value, defIV.value, natureMultiplier)}`;
            })
        }

        const spaStat = document.getElementById("spaStat");
        const spaEV = document.getElementById("inputEVspa");
        const spaIV = document.getElementById("inputIVspa");
        spaStat.textContent = `Ataque Especial: ${calculateStat(res.base_stats.spa, pokemonLevel.value, spaEV.value, spaIV.value, 1)}`;
        const spaElemUpdaters = document.getElementsByClassName("spa-updater");
        for (let elem of spaElemUpdaters) {
            elem.addEventListener("input", () => {
                const nature = natureSelector.selectedOptions[0].dataset;
                const natureMultiplier = getNatureMultiplier(nature, "special-attack");
                spaStat.textContent = `Ataque Especial: ${calculateStat(res.base_stats.spa, pokemonLevel.value, spaEV.value, spaIV.value, natureMultiplier)}`;
            })
        }

        const spdStat = document.getElementById("spdStat");
        const spdEV = document.getElementById("inputEVspd");
        const spdIV = document.getElementById("inputIVspd");
        spdStat.textContent = `Defensa Especial: ${calculateStat(res.base_stats.spd, pokemonLevel.value, spdEV.value, spdIV.value, 1)}`;
        const spdElemUpdaters = document.getElementsByClassName("spd-updater");
        for (let elem of spdElemUpdaters) {
            elem.addEventListener("input", () => {
                const nature = natureSelector.selectedOptions[0].dataset;
                const natureMultiplier = getNatureMultiplier(nature, "special-defense");
                spdStat.textContent = `Defensa Especial: ${calculateStat(res.base_stats.spd, pokemonLevel.value, spdEV.value, spdIV.value, natureMultiplier)}`;
            })
        }

        const speStat = document.getElementById("speStat");
        const speEV = document.getElementById("inputEVspe");
        const speIV = document.getElementById("inputIVspe");
        speStat.textContent = `Velocidad: ${calculateStat(res.base_stats.spe, pokemonLevel.value, speEV.value, speIV.value, 1)}`;
        const speElemUpdaters = document.getElementsByClassName("spe-updater");
        for (let elem of speElemUpdaters) {
            elem.addEventListener("input", () => {
                const nature = natureSelector.selectedOptions[0].dataset;
                const natureMultiplier = getNatureMultiplier(nature, "speed");
                speStat.textContent = `Velocidad: ${calculateStat(res.base_stats.spe, pokemonLevel.value, speEV.value, speIV.value, natureMultiplier)}`;
            })
        }


        // Naturaleza
        // Como son siempre las mismas, están puestas por un #each de Handlebars
        const natureSelector = document.getElementById("nature-selector");


        // Objeto
        // Como son siempre los mismos, están puestos por un #each de Handlebars
        const pokemonItemsList = document.getElementById("item-selector");

        // Cuando elijo un objeto de la lista, aparece su descripción
        const itemsDescription = document.getElementById("itemDescription");
        itemsDescription.textContent = "";
        pokemonItemsList.addEventListener("change", e => {
            const selectedOption = e.target.selectedOptions[0];
            itemsDescription.textContent = selectedOption.dataset.description;
        });

        const addPokemonToTeamButton = document.getElementById("addPokemonToTeamButton");
        addPokemonToTeamButton.addEventListener("click", () => addPokemonToTeam(addPokemonToTeamButton, res));

        cloneAddPokemonDiv.hidden = false;
    } catch (err) {
        handleAxiosError(err)
    } finally {
        searchPokemonDataButton.disabled = false;
    }
});

const addPokemonToTeam = async (addPokemonToTeamButton, pokemon) => {
    addPokemonToTeamButton.disabled = true;

    // Creo un objeto con los datos seleccionados
    const object = {
        name: pokemon.name,
        types: pokemon.types.map(type => type.name),
        level: parseInt(getValueByID("pokemonLevel")),
        happiness: parseInt(getValueByID("happiness")),
        ability: getValueByID("pokemonAbilitiesList").toLowerCase(),
        moves: [
            parseInt(getValueByID("movesList1")),
            parseInt(getValueByID("movesList2")),
            parseInt(getValueByID("movesList3")),
            parseInt(getValueByID("movesList4")),
        ],
        sprite: document.getElementById("pokemonImage").srcset,
        nature: getValueByID("nature-selector"),
        item: getValueByID("item-selector").toLowerCase(),
        ev: {
            hp: parseInt(getValueByID("inputEVhp")),
            atk: parseInt(getValueByID("inputEVatk")),
            def: parseInt(getValueByID("inputEVdef")),
            spa: parseInt(getValueByID("inputEVspa")),
            spd: parseInt(getValueByID("inputEVspd")),
            spe: parseInt(getValueByID("inputEVspe"))
        },
        iv: {
            hp: parseInt(getValueByID("inputIVhp")),
            atk: parseInt(getValueByID("inputIVatk")),
            def: parseInt(getValueByID("inputIVdef")),
            spa: parseInt(getValueByID("inputIVspa")),
            spd: parseInt(getValueByID("inputIVspd")),
            spe: parseInt(getValueByID("inputIVspe"))
        }
    }

    // Por defecto si no seleccioné habilidad, objeto o naturaleza
    if (object.ability == "")
        object.ability = pokemon.abilities[0].name; // La primera habilidad de su lista

    if (object.item == "")
        object.item = null; // Ningún objeto

    if (object.nature == "")
        object.nature = "Hardy"; // Naturaleza que no modifica stats

    // Si no seleccioné ningún movimiento para el Pokémon, no puedo continuar
    if (!object.moves[0] && !object.moves[1] && !object.moves[2] && !object.moves[3]) {
        createErrorModal("errorAddPokemonToTeamModal", "Debe seleccionar al menos un movimiento.");
        return addPokemonToTeamButton.disabled = false;
    }

    // Hago un pedido al servidor para añadir el Pokémon
    try {
        const res = (await nodeReq.post('/teambuilder/pokemon', object)).data;
        if (res.message == "ok") {
            // Si salió bien, vuelvo al div de selección de Pokémon
            createSuccessModal("addPokemonToTeamModal", "El Pokémon fue añadido a su equipo satisfactoriamente.");
            document.getElementById("addPokemonDiv").hidden = true;
        } else if (res.message == "sixPokemon") {
            // Si ya están los seis Pokémon, quiero salir de esta página y volver al teambuilder
            createModal(
                "finishedTeamCreationModal",
                "¡Felicidades!",
                "El Pokémon fue añadido a su equipo satisfactoriamente. Ha terminado de crear su equipo. Pulse el botón para continuar.",
                "Continuar",
                () => document.getElementById("returnTeambuilderLink").click()
            );
        }
    } catch (err) {
        handleAxiosError(err);
    } finally {
        addPokemonToTeamButton.disabled = false;
    }
}


// Sección de equipos
const teamsContainer = document.getElementById("teamsContainer");
const teams = document.querySelectorAll(".team");

const showTeamsInRow = () => {
    teamsContainer.classList.replace("flex-column", "flex-row");
    teams.forEach(team => team.classList.replace("my-2", "mx-2"));
}
const showTeamsInColumn = () => {
    teamsContainer.classList.replace("flex-row", "flex-column");
    teams.forEach(team => team.classList.replace("mx-2", "my-2"));
}
const hideAllTeams = () => $(".collapse").collapse("hide")

teams.forEach(team => {
    const ID_Team = parseInt(team.dataset.id);
    const team_name = team.dataset.name;
    const showTeamButton = team.querySelector(".btnShowTeam");
    const addPokemonButton = team.querySelector(".btnAddPokemon");
    const modifyTeamButton = team.querySelector(".btnModifyTeam");
    const deleteTeamButton = team.querySelector(".btnDeleteTeam");
    const pokemonList = team.querySelector(".pokemonList");
    const deletePokemonButtons = team.querySelectorAll(".btnDeletePokemon");

    showTeamButton.addEventListener("click", () => {
        if (showTeamButton.classList.contains("collapsed")) {
            showTeamsInRow();
        } else {
            hideAllTeams();
            showTeamsInColumn();
            team.classList.remove("collapsed");
        }
    });

    // Quiero que el botón de Añadir Pokémon esté desactivado si ya tengo seis Pokémon en el equipo
    addPokemonButton.disabled = (pokemonList.children.length == 6);

    addPokemonButton.addEventListener("click", async () => {
        addPokemonButton.disabled = true;

        // Hago un pedido al servidor para saber si ya tengo seis Pokémon
        try {
            const res = (await nodeReq({
                method: "get",
                url: "/teambuilder/team",
                params: {
                    team_name: team_name
                }
            })).data;

            // Muestro y escondo los div necesarios
            document.getElementById("teamsContainerDiv").hidden = true;
            document.getElementById("selectPokemonDiv").hidden = false;
            document.getElementById("teamNameID").textContent = `Nombre del Equipo: ${team_name}`;

            // Lleno la lista de Pokémon
            const pokemonList = document.getElementById("pokemon-selector");
            res.pokemonNamesList.forEach(pokemon => pokemonList.innerHTML += `<option>${pokemon}</option>`);

            // Lleno la lista de naturalezas
            const naturesList = document.getElementById("nature-selector");
            res.naturesList.forEach(nature => {
                if (nature.stat_up) {
                    naturesList.innerHTML += `
                    <option value="${nature.name}" class="pokemon-nature" data-stat-up="${nature.stat_up}" data-stat-down=${nature.stat_down}>
                        ${nature.name}, more ${nature.stat_up}, less ${nature.stat_down}
                    </option>
                `;
                } else {
                    naturesList.innerHTML += `
                    <option value="${nature.name}" class="pokemon-nature">
                        ${nature.name}
                    </option>
                `;
                }
            });

            // Lleno la lista de objetos
            const itemsList = document.getElementById("item-selector");
            res.itemsList.forEach(item => {
                itemsList.innerHTML += `
                <option data-id="${item.id}" data-description="${item.description}">
                    ${item.name}
                </option>
            `;
            });
        } catch (err) {
            handleAxiosError(err);
        } finally {
            addPokemonButton.disabled = false;
        }
    });

    modifyTeamButton.addEventListener("click", () => {
        modifyTeamButton.disabled = true;

        const titleElem = team.querySelector(".titleElem");
        titleElem.innerHTML = `
            <input type="text" class="form-control newTeamName" value="${team_name}">
            <button class="btn btn-success btn-sm btnConfirmNameChange">   ✔   </button>
        `;

        const newTeamName = team.querySelector(".newTeamName");
        const confirmNameChangeButton = team.querySelector('.btnConfirmNameChange');
        confirmNameChangeButton.addEventListener("click", async () => {
            confirmNameChangeButton.disabled = true;

            // Creo un objeto con los datos a enviar al servidor
            const object = {
                ID_Team: ID_Team,
                newName: newTeamName.value
            }

            // Hago el pedido de modificación de nombre
            try {
                await nodeReq.put('/teambuilder/team', object);
                createSuccessModal("modifyTeamNameModal", `El nombre del equipo fue cambiado satisfactoriamente a ${object.newName}.`);

                // Modifico el nombre que aparece en el titulo y el botón 
                titleElem.innerHTML = `<h4 class="text-start">${object.newName}</h4>`;
                showTeamButton.innerText = object.newName;

                // Activo el botón de modificación del equipo
                modifyTeamButton.disabled = false;
            } catch (err) {
                handleAxiosError(err);
            } finally {
                confirmNameChangeButton.disabled = false;
            }
        });
    });

    deleteTeamButton.addEventListener("click", () => {
        deleteTeamButton.disabled = true;

        // Pido confirmación al usuario
        createModal(
            "deleteTeamModal",
            "Confirmación",
            `¿Está seguro de que quiere borrar el equipo ${team_name}?`,
            "Aceptar", async () => {
                // Hago el pedido de eliminación al servidor
                try {
                    await nodeReq({
                        method: "delete",
                        url: '/teambuilder/team',
                        params: {
                            ID_Team: ID_Team
                        }
                    });

                    createSuccessModal("deleteTeamModal", "El equipo fue borrado satisfactoriamente.");
                    team.remove();
                } catch (err) {
                    handleAxiosError(err);
                } finally {
                    deleteTeamButton.disabled = false
                }
            },
            "Cancelar", () => deleteTeamButton.disabled = false
        );

        addPokemonButton.disabled = (pokemonList.children.length == 6);
    })

    deletePokemonButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            btn.disabled = true;

            // Pido el <div> del Pokémon y del equipo por DOM
            const pokemonDiv = btn.parentElement;

            // Si hay un solo Pokémon, salgo de la función y vuelvo a activar el botón
            if (pokemonList.children.length == 1) {
                createErrorModal("errorDeletePokemonModal", "No puede borrar el último Pokémon del equipo. En su lugar, borre el equipo.");
                return btn.disabled = false;
            }

            // Hago el pedido para borrar el Pokémon al servidor
            try {
                await nodeReq({
                    method: "delete",
                    url: "/teambuilder/pokemon",
                    params: {
                        ID_Team: ID_Team,
                        pokemonNumber: parseInt(pokemonDiv.dataset.number)
                    }
                });

                // Elimino el <div> del Pokémon
                pokemonDiv.remove();
            } catch (err) {
                handleAxiosError(err);
            } finally {
                btn.disabled = false;
            }
        });
    });
});
