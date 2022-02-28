/**
 * Función cuando creo un nuevo usuario
 */
const createAccount = () => {
    // Desactivo el botón, para asegurar no clickearlo varias veces
    const createAccountButton = document.getElementById("createAccountButton");
    createAccountButton.disabled = true;

    // Obtengo los datos
    const email = getValueByID("createAccountEmailID");
    const username = getValueByID("createAccountUsernameID");
    const password = getValueByID("createAccountPasswordID");

    // Si la validación no es exitosa, salgo de la función
    if (!fullUserValidation(email, username, password)) return;

    // Creo un nuevo objeto
    const newUser = {
        email: email,
        username: username,
        password: password
    };

    // Hago el pedido al servidor
    ajax("POST", "/createAccount/create", newUser, res => {
        switch (res.success) {
            case "successful":
                createModal("createAccountModal",
                    "¡Felicidades!",
                    "Su usuario fue creado satisfactoriamente.",
                    "Volver al Inicio",
                    () => document.getElementById("returnLoginLink").click());
                break;
            case "alreadyExistingEmail":
                createErrorModal("errorCreateAccountModal", "Ya existe una cuenta con este email. Por favor, intente crearla con otro email, o acceda a la cuenta ya creada.");
                break;
            case "alreadyExistingUsername":
                createErrorModal("errorCreateAccountModal", "Ya existe una cuenta con este nombre de usuario. Por favor, intente crearla con otro nombre de usuario, o acceda a la cuenta ya creada.");
                break;
            case "error":
                createErrorModal("errorCreateAccountModal", "Hubo un error en la creación de su usuario. Intentelo nuevamente más tarde.");
                break;
        }

        // Vuelvo a activar el botón
        createAccountButton.disabled = false;
    });
}

/**
 * Función para modificar datos secundarios de un usuario
*/
const modifyUserData = async () => {
    // Desactivo el botón, para asegurar no clickearlo varias veces
    const modifyUserButton = document.getElementById("modifyUserDataButton");
    modifyUserButton.disabled = true;

    // Pido los datos y creo un objeto con ellos
    const object = {
        real_name: getValueByID("modifyUserDataRealName"),
        age: getValueByID("modifyUserDataAge"),
        nationality: getValueByID("modifyUserDataNationality"),
        hobbies: getValueByID("modifyUserDataHobbies"),
        pokemon_favorito: getValueByID("modifyUserDataFavoritePokemon")
    }

    // Hago el pedido al servidor
    nodeReq.put('/home/modifyUserData/modify', object)
        .then(_ => {
            createModal(
                "modifyUserDataModal",
                "¡Felicidades!",
                "Sus datos fueron actualizados satisfactoriamente.",
                "Volver a Mi Usuario",
                () => document.getElementById("returnHomeLink").click()
            );
        })
        .catch(err => {
            console.error(err);
            createErrorModal(
                "errorModifyUserDataModal",
                "Hubo un error en la actualización de sus datos. Intentelo nuevamente más tarde."
            );
        })
        .finally(_ => modifyUserButton.disabled = true);
}

/**
 * Función para modificar contraseña de un usuario
 */
const modifyPassword = async () => {
    // Verificar que la nueva contraseña cumpla la verificación establecida
    const newPassword = getValueByID("newPassword");
    if (!validatePassword(newPassword)) return createErrorModal("errorModifyPasswordModal", "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.");

    // Verificar que la contraseña confirmada dos veces sea igual en ambas
    const newPasswordVerification = getValueByID("newPasswordVerification");
    if (newPassword != newPasswordVerification) return createErrorModal("errorModifyPasswordModal", "No se pudo verificar su contraseña pues las contraseñas nuevas ingresadas no son idénticas. Por favor, ingréselas nuevamente.");

    // Hago un pedido al servidor
    ajax("GET", "/home/modifyPassword/getOldPassword", null, res => {

        // Verificar si la contraseña ingresada primero es la correcta
        const oldPasswordInput = getValueByID("oldPassword");
        const oldPassword = res.oldPassword;
        if (oldPasswordInput != oldPassword) return createErrorModal("errorModifyPasswordModal", "La contraseña actual ingresada no es correcta. Por favor, ingrésela nuevamente.");

        // Actualizar la contraseña con otro pedido al servidor
        const object = { newPassword: newPassword };
        ajax("PUT", "/home/modifyPassword/update", object, res => {

            switch (res.success) {
                case "successful":
                    createModal("modifyPasswordModal",
                        "¡Felicidades!",
                        "Su contraseña fue actualizada satisfactoriamente.",
                        "Volver a Mi Usuario",
                        () => document.getElementById("returnHomeLink").click());
                    break;
                case "error":
                    createErrorModal("errorModifyPasswordModal", "Hubo un error en la actualización de su contraseña. Intentelo nuevamente más tarde.");
                    break;
            }
        });
    });
}

/**
 * Función para crear un nuevo equipo
*/
const addNewTeam = async () => {
    // Desactivo el botón, para asegurar no clickearlo varias veces
    const addNewTeamButton = document.getElementById("addNewTeamButton");
    addNewTeamButton.disabled = true;

    // Creo un objeto, con el nombre del equipo
    const object = { team_name: getValueByID("newTeamName") };

    // Hago el pedido de creación al servidor
    ajax("POST", "/teambuilder/create/newTeam", object, res => {
        switch (res.success) {
            case "successful":
                createSuccessModal("newTeamModal", `Su equipo, ${object.team_name}, fue creado satisfactoriamente.`);

                // Cambio el div que se muestra en pantalla por el de selección de Pokémon
                document.getElementById("newTeamNameDiv").hidden = true;
                document.getElementById("selectPokemonDiv").hidden = false;
                document.getElementById("teamNameID").textContent = `Nombre del Equipo: ${object.team_name}`;
                break;
            case "already-existing-name":
                createErrorModal("errorNewTeamModal", "Ya ha usado este nombre de equipo. Utilice otro nombre para su equipo.");
                break;
            case "error":
                createErrorModal("errorNewTeamModal", "Hubo un error al crear su equipo. Intentelo nuevamente más tarde.");
                break;
        }
        addNewTeamButton.disabled = false;
    });
}

/**
 * Función para activar el botón de buscar Pokémon en el teambuilder luego de seleccionarlo en el <select>
 */
const activateSearchPokemonDataButton = () => {
    // Quiero poder clickearlo cuando el indice es distinto de cero
    let index = document.getElementById("pokemon-selector").selectedIndex;
    document.getElementById("searchPokemonDataButton").disabled = (index == 0);
}

const MAX_EV_SUM = 510; // Cantidad Máxima de EV's para un Pokémon
/**
 * Función para pedir los datos de un Pokémon al servidor en el teambuilder
*/
const searchPokemonData = () => {
    // Desactivo el botón, para asegurar no clickearlo varias veces
    const searchPokemonDataButton = document.getElementById("searchPokemonDataButton");
    searchPokemonDataButton.disabled = true;

    // Escondo el <div> para mostrarlo cuando tenga los datos
    const addPokemonDiv = document.getElementById("addPokemonDiv");
    addPokemonDiv.hidden = true;

    // Clono el <div> para eliminar los addEventListener
    const cloneAddPokemonDiv = addPokemonDiv.cloneNode(true);
    addPokemonDiv.parentNode.replaceChild(cloneAddPokemonDiv, addPokemonDiv);

    // Hago un objeto con el nombre del Pokémon
    const pokemonName = getValueByID("pokemon-selector");
    const pokemon = { name: pokemonName.toLowerCase() };

    // Hago el pedido al servidor
    ajax("GET", "/teambuilder/create/searchPokemonData", pokemon, res => {
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
        pokemonAbilitiesList.innerHTML = "<option disabled selected>Seleccione una habilidad: </option>";
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

        // A cada movimiento, lo agrego a la lista
        res.moves.forEach(move => {
            const optionElem = document.createElement("option");
            optionElem.textContent = `${capitalizeFirstLetter(move.name)} - ${capitalizeFirstLetter(move.damage_class)}`;
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

            // Cuando selecciono un movimiento, quiero que me aparezca su descripción
            movesList.addEventListener("change", e => {
                // Obtengo el efecto del movimiento
                const selectedOption = e.target.selectedOptions[0];
                const moveEffect = selectedOption.dataset.effect;

                // Cambio la descripción
                const moveDescription = movesList.nextElementSibling;
                moveDescription.textContent = moveEffect.replace(/\$.*%/gm, `${selectedOption.dataset.effect_chance}%`);
            });
        }


        // IVs
        // Rangos de IV
        const rangeIVList = document.getElementsByClassName("iv-range");
        for (let range of rangeIVList) {
            range.value = 31; // Default: 31

            // Cuando cambio un rango, cambia su input correspondiente
            range.addEventListener("input", (event) => {
                const inputElem = range.parentElement.parentElement.childNodes[5].childNodes[1];
                inputElem.value = event.target.value;
            });
        }
        // Inputs de IV
        const inputIVList = document.getElementsByClassName("iv-control");
        for (let input of inputIVList) {
            input.value = 31; // Default: 31

            // Cuando cambio un input, cambia su rango correspondiente
            input.addEventListener("input", (event) => {
                enforceMinMax(input);
                const rangeElem = input.parentElement.parentElement.childNodes[3].childNodes[1];
                rangeElem.value = event.target.value;
            });
        }


        // EVs
        // Rangos de IV
        const rangeEVList = document.getElementsByClassName("ev-range");
        for (let range of rangeEVList) {
            range.value = 0; // Default: 0

            // Cuando cambio un rango, cambia su input correspondiente
            range.addEventListener("input", (event) => {
                const inputElem = range.parentElement.parentElement.childNodes[5].childNodes[1];
                inputElem.value = event.target.value;

                // Obtengo la suma total de EVs
                let sumOfEVs = 0;
                for (let rangeForSum of rangeEVList) {
                    sumOfEVs += parseInt(rangeForSum.value);
                }

                // Si me paso del máximo posible
                if (sumOfEVs > MAX_EV_SUM) {
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
        pokemonItemsList.addEventListener("change", e => {
            const selectedOption = e.target.selectedOptions[0];
            itemsDescription.textContent = selectedOption.dataset.description;
        });


        // Boton de agregar Pokémon
        const addPokemonToTeamButton = document.getElementById("addPokemonToTeamButton");
        addPokemonToTeamButton.onclick = () => addPokemonToTeamres;


        // Muestro el <div> con todo lo que acabamos de poner y activo el botón de búsqueda nuevamente
        cloneAddPokemonDiv.hidden = false;
        searchPokemonDataButton.disabled = false;
    });
}

/**
 * Función para agregar un Pokémon a un equipo
*/
const addPokemonToTeam = pokemon => {
    // Desactivo el botón, para asegurar no clickearlo varias veces
    let addPokemonToTeamButton = document.getElementById("addPokemonToTeamButton");
    addPokemonToTeamButton.disabled = true;

    // Creo un objeto con los datos seleccionados
    const object = {
        name: pokemon.name,
        types: pokemon.types,
        level: getValueByID("pokemonLevel"),
        happiness: getValueByID("happiness"),
        ability: getValueByID("pokemonAbilitiesList"),
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
    if (object.ability == "Seleccione una habilidad:") object.ability = pokemon.abilities[0].name; // La primera habilidad de la lista
    if (object.item == "seleccione un objeto") object.item = null; // Ningún objeto
    if (object.nature == "empty") object.nature = "Hardy"; // Naturaleza que no modifica stats

    // Si no seleccioné ningún movimiento para el Pokémon, no puedo continuar
    if (!object.moves[0] && !object.moves[1] && !object.moves[2] && !object.moves[3]) {
        createErrorModal("errorAddPokemonToTeamModal", "Debe seleccionar al menos un movimiento.");
        return addPokemonToTeamButton.disabled = false;
    }

    // Hago un pedido al servidor para añadir el Pokémon
    ajax("POST", "/teambuilder/create/addPokemonToTeam", object, res => {
        switch (res.success) {
            case "successful":
                // Si salió bien, vuelvo al div de selección de Pokémon
                createSuccessModal("addPokemonToTeamModal", "El Pokémon fue añadido a su equipo satisfactoriamente.");
                document.getElementById("addPokemonDiv").hidden = true;
                break;
            case "sixPokemon":
                // Si ya están los seis Pokémon, quiero salir de esta página y volver al teambuilder
                createModal(
                    "finishedTeamCreationModal",
                    "¡Felicidades!",
                    "El Pokémon fue añadido a su equipo satisfactoriamente. Ha terminado de crear su equipo. Pulse el botón para continuar.",
                    "Continuar",
                    () => document.getElementById("returnTeambuilderLink").click()
                );
                break;
            case "error":
                createErrorModal("errorAddPokemonToTeamModal", "Hubo un error al añadir el Pokémon a su equipo. Inténtelo nuevamente más tarde.");
                break;
        }

        // Vuelvo a activar el botón
        addPokemonToTeamButton.disabled = false;
    });
}

/**
 * Función para borrar un equipo de un usuario al clickear un botón.
 * @param {HTMLButtonElement} btn Botón clickeado.
 */
const deleteTeam = btn => {
    // Desactivo el botón, para asegurar no clickearlo varias veces
    btn.disabled = true;

    // Obtengo todo el <div>
    const divTeam = btn.parentElement.parentElement.parentElement;
    const teamName = divTeam.firstElementChild.firstElementChild.innerText;

    // Pido confirmación al usuario
    createModal(
        "deleteTeamModal",
        "Confirmación",
        `¿Está seguro de que quiere borrar el equipo ${teamName}?`,
        "Aceptar",
        () => {
            // Creo un objeto con el ID del equipo
            const ID_Team = parseInt(divTeam.dataset.id);
            const object = { ID_Team: ID_Team };

            // Hago el pedido de eliminación al servidor
            ajax("DELETE", "/teambuilder/deleteTeam", object, res => {
    
                switch (res.success) {
                    case "successful":
                        createSuccessModal("deleteTeamModal", "El equipo fue borrado satisfactoriamente.");
                        // Elimino de la pantalla lo correspondiente a este equipo. 
                        divTeam.previousSibling.previousSibling.remove();
                        divTeam.remove();
                        break;
                    case "error":
                        createErrorModal("errorDeleteTeamModal", "Hubo un error al intentar borrar el equipo. Inténtelo nuevamente más tarde.");
                        break;
                }
            });
        },
        "Cancelar",
        () => {
            $(`#deleteTeamModal`).modal("hide");
            btn.disabled = false; // Vuelvo a a activar el botón
        }
    );
}

/**
 * Cuando clickeo para modificar el nombre de un equipo, quiero activar un input.
 * @param {HTMLButtonElement} btn Botón clickeado.
 */
const activateInputOfModifyTeamName = btn => {
    // Reemplazo el título por un input
    const titleElem = btn.parentElement.parentElement.children[0];
    const oldName = titleElem.children[0].innerText;
    titleElem.innerHTML = `
        <input id="newTeamName" type="text" class="form-control" value="${oldName}">
        <button class="btn btn-success btn-sm" onclick="modifyTeamName(this)">   ✔   </button>
    `;

    // Desactivo el botón
    btn.disabled = true;
}

/**
 * Modifica el nombre de un equipo a partir de un botón clickeado.
 * @param {HTMLButtonElement} btn Botón clickeado. 
 */
const modifyTeamName = btn => {
    // Obtengo todo el <div> del equipo
    const divTeam = btn.parentElement.parentElement.parentElement;

    // Creo un objeto con los datos a enviar al servidor
    const object = {
        ID_Team: parseInt(divTeam.dataset.id),
        newName: btn.parentElement.children[0].value
    }

    // Envío un pedido para cambiar los datos
    ajax("PUT", "/teambuilder/modifyTeamName", object, res => {
        switch (res.success) {
            case "successful":
                createSuccessModal("modifyTeamNameModal", `El nombre del equipo fue cambiado satisfactoriamente a ${object.newName}.`);
                
                // Modifico el nombre que aparece en pantalla
                btn.parentElement.innerHTML = `<h4 class="text-start">${object.newName}</h4>`;
                divTeam.previousSibling.previousSibling.innerText = object.newName;

                // Activo el botón de modificación del equipo
                divTeam.children[0].children[2].children[0].disabled = false;
                break;
            case "already-existing-name":
                createErrorModal("errorNewTeamModal", "Ya ha usado este nombre de equipo. Utilice otro nombre para su equipo.");
                break;
            case "error":
                createErrorModal("errorModifyTeamNameModal", "Hubo un error al intentar modificar el nombre del equipo. Inténtelo nuevamente más tarde.");
                break;
        }
    });
}

/**
 * Borra un Pokémon de un equipo.
 * @param {HTMLButtonElement} btn Botón clickeado.
 */
const deletePokemon = btn => {
    // Desactivo el botón para asegurarme de tocarlo solamente una vez
    btn.disabled = true;

    // Pido el <div> del Pokémon y del equipo por DOM
    const pokemonDiv = btn.parentElement;
    const divTeam = pokemonDiv.parentElement.parentElement;

    // Si hay un solo Pokémon, salgo de la función y vuelvo a activar el botón
    if (divTeam.children.length == 2) {
        createErrorModal("errorDeletePokemonModal", "No puede borrar el último Pokémon del equipo. En su lugar, borre el equipo.");
        return btn.disabled = false;
    }

    // Creo un objeto con los datos
    const object = {
        ID_Team: parseInt(divTeam.dataset.id),
        pokemonNumber: parseInt(pokemonDiv.dataset.number)
    }

    // Hago el pedido para borrar el Pokémon al servidor
    ajax("DELETE", "/teambuilder/deletePokemon", object, res => {
        switch (res.success) {
            case "successful":
                createSuccessModal("deletePokemonModal", "El Pokémon fue borrado satisfactoriamente.");

                // Elimino el <div> del Pokémon
                pokemonDiv.parentElement.remove();
                break;
            case "error":
                createErrorModal("errorDeletePokemonModal", "Hubo un error al intentar borrar el Pokémon. Inténtelo nuevamente más tarde.");
                
                // Vuelvo a activar el botón
                btn.disabled = false;
                break;
        }
    })
}

/**
 * Muestra el creador de Pokémon al seleccionar "Añadir un Pokémon" en un equipo.
 * @param {HTMLButtonElement} btn Botón clickeado. 
 */
const showPokemonCreator = btn => {
    // Desactivo el botón
    btn.disabled = true;

    // Hago un objeto con el nombre del equipo
    const team_name = btn.parentElement.parentElement.children[0].children[0].innerText;
    const object = { team_name: team_name };

    // Hago un pedido al servidor para saber si ya tengo seis Pokémon
    ajax("GET", "/teambuilder/updateSelectedTeamToAddPokemon", object, res => {
        switch (res.success) {
            case "successful":
                // Muestro y escondo los div necesarios
                document.getElementById("teamsContainerDiv").hidden = true;
                document.getElementById("selectPokemonDiv").hidden = false;
                document.getElementById("teamNameID").textContent = `Nombre del Equipo: ${object.team_name}`;

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
                    itemsList.innerHTML += `<option data-id="${item.id}" data-description="${item.description}">${item.name}</option>`
                });
                break;
            case "sixPokemon":
                createErrorModal("errorUpdateSelectedTeamToAddPokemonModal", "Su equipo ya tiene seis Pokémon.");
                break;
            case "error":
                createErrorModal("errorUpdateSelectedTeamToAddPokemonModal", "Hubo un error. Inténtelo nuevamente más tarde.");
                break;
        }

        // Vuelvo a activar el botón
        btn.disabled = false;
    });
}

/**
 * Seleccionar el equipo de batalla en la lista, en el lobby.
 */
const selectBattleTeam = () => {
    // Si es la opción de "Seleccione un equipo...", sale de la función
    const index = document.getElementById("selectTeamID").selectedIndex;
    if (index == 0) return;

    // Desctivo el link de buscar batalla
    const searchCombatButton = document.getElementById("searchCombatButton");
    searchCombatButton.classList.add("disabled");

    // Hago un objeto con el ID del equipo
    const object = { ID_Team: parseInt(getValueByID("selectTeamID")) };

    // Hago un pedido al servidor para seleccionar el equipo
    ajax("PUT", "/lobby/selectTeam", object, res => {
        switch (res.success) {
            case "successful":
                // Activo el link de buscar batalla
                searchCombatButton.classList.remove("disabled");
                break;
            case "error":
                createErrorModal("errorUpdateSelectedTeamToAddPokemonModal", "Hubo un error. Inténtelo nuevamente más tarde.");
                break;
        }
    });
}

/**
 * Añade un mensaje a la lista de mensajes de una batalla.
 * @param {String} text Mensaje a añadir. 
 */
const addMessageToServerMessages = text => {
    document.getElementById("serverMessages").innerHTML += `<h6>${text}</h6>`;
}

// Canción para los combates
const pokemonBattleTheme = new Audio('audio/battleTheme.mp3');
