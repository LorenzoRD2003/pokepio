const createAccount = () => {
    const email = getValueByID("createAccountEmailID");
    const username = getValueByID("createAccountUsernameID");
    const password = getValueByID("createAccountPasswordID");
    if (fullUserValidation(email, username, password)) {
        const newUser = {
            email: email,
            username: username,
            password: password
        };
        ajax("POST", "/createAccount/create", newUser, (res) => {
            res = JSON.parse(res);
            switch (res.success) {
                case "successful":
                    createModal("createAccountModal",
                        "¡Felicidades!",
                        "Su usuario fue creado satisfactoriamente.",
                        "Volver al Inicio",
                        () => $("#returnLoginForm").submit());
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
        });
    }
}

const modifyUserData = () => {
    const object = {
        real_name: getValueByID("modifyUserDataRealName"),
        age: getValueByID("modifyUserDataAge"),
        nationality: getValueByID("modifyUserDataNationality"),
        hobbies: getValueByID("modifyUserDataHobbies"),
        pokemon_favorito: getValueByID("modifyUserDataFavoritePokemon")
    }
    ajax("PUT", "/home/modifyUserData/modify", object, (res) => {
        res = JSON.parse(res);
        switch (res.success) {
            case "successful":
                createModal("modifyUserDataModal",
                    "¡Felicidades!",
                    "Sus datos fueron actualizados satisfactoriamente.",
                    "Volver a Mi Usuario",
                    () => $("#returnHomeForm").submit());
                break;
            case "error":
                createErrorModal("errorModifyUserDataModal", "Hubo un error en la actualización de sus datos. Intentelo nuevamente más tarde.");
                break;
        }
    });
}

const modifyPassword = async () => {
    ajax("GET", "/home/modifyPassword/getOldPassword", null, (res) => {
        res = JSON.parse(res);

        // Verificar si la contraseña ingresada primero es la correcta
        const oldPasswordInput = getValueByID("oldPassword");
        const oldPassword = res.oldPassword;
        if (oldPasswordInput != oldPassword) return createErrorModal("errorModifyPasswordModal", "La contraseña actual ingresada no es correcta. Por favor, ingrésela nuevamente.");

        // Verificar que la nueva contraseña cumpla la verificación establecida
        const newPassword = getValueByID("newPassword");
        if (!validatePassword(newPassword)) return createErrorModal("errorModifyPasswordModal", "La nueva contraseña debe tener al menos 8 caracteres.");

        // Verificar que la contraseña confirmada dos veces sea igual en ambas
        const newPasswordVerification = getValueByID("newPasswordVerification");
        if (newPassword != newPasswordVerification) return createErrorModal("errorModifyPasswordModal", "No se pudo verificar su contraseña pues las contraseñas nuevas ingresadas no son idénticas. Por favor, ingréselas nuevamente.");

        // Actualizar la contraseña
        const object = {
            newPassword: newPassword
        }
        ajax("PUT", "/home/modifyPassword/update", object, (res) => {
            res = JSON.parse(res);
            switch (res.success) {
                case "successful":
                    createModal("modifyPasswordModal",
                        "¡Felicidades!",
                        "Su contraseña fue actualizada satisfactoriamente.",
                        "Volver a Mi Usuario",
                        () => $("#returnHomeForm").submit());
                    break;
                case "error":
                    createErrorModal("errorModifyPasswordModal", "Hubo un error en la actualización de su contraseña. Intentelo nuevamente más tarde.");
                    break;
            }
        });
    });
}

const addNewTeam = async () => {
    const object = {
        team_name: getValueByID("newTeamName")
    }
    ajax("POST", "/teambuilder/create/newTeam", object, (res) => {
        res = JSON.parse(res);
        switch (res.success) {
            case "successful":
                document.getElementById("newTeamNameDiv").hidden = true;
                document.getElementById("selectPokemonDiv").hidden = false;
                document.getElementById("teamNameID").textContent = `Nombre del Equipo: ${object.team_name}`;
                createSuccessModal("newTeamModal", `Su equipo, ${object.team_name}, fue creado satisfactoriamente.`)
                break;
            case "error":
                createErrorModal("errorNewTeamModal", "Hubo un error al crear su equipo. Intentelo nuevamente más tarde.");
                break;
        }
    });
}

const MAX_EV_SUM = 510;
const searchPokemonData = () => {
    const pokemonName = getValueByID("pokemon-selector");
    const pokemon = { name: pokemonName.toLowerCase() };
    document.getElementById("selectPokemonDiv").hidden = true;
    document.getElementById("addPokemonDiv").hidden = true;
    ajax("GET", "/teambuilder/create/searchPokemonData", pokemon, (res) => {
        res = JSON.parse(res);
        // Nombre
        const pokemonName = document.getElementById("pokemonName");
        pokemonName.textContent = `Nombre: ${capitalizeFirstLetter(res.name)}`;
        pokemonName.dataset.name = res.name;

        // Tipo
        const pokemonTypes = document.getElementById("pokemonTypes");
        pokemonTypes.textContent = "Tipos: ";
        res.types.forEach(type => pokemonTypes.textContent += `${capitalizeFirstLetter(type.name)} `);

        // Habilidades
        const pokemonAbilitiesList = document.getElementById("pokemonAbilitiesList");
        const abilityDescription = document.getElementById("abilityDescription");
        pokemonAbilitiesList.innerHTML = "<option disabled selected>Seleccione una habilidad: </option>";
        abilityDescription.textContent = "";
        res.abilities.forEach(ability => {
            const optionElem = document.createElement("option");
            optionElem.textContent = capitalizeFirstLetter(ability.name);
            optionElem.dataset.description = ability.effect;
            pokemonAbilitiesList.append(optionElem);
        });
        pokemonAbilitiesList.addEventListener("change", (event) => {
            const selectedOption = event.target.selectedOptions[0];
            abilityDescription.textContent = selectedOption.dataset.description;
        });

        // Sprite
        const pokemonImage = document.getElementById("pokemonImage");
        pokemonImage.srcset = res.image;
        const isShinyCheckbox = document.getElementById("isShinyCheckbox");
        isShinyCheckbox.checked = false;
        isShinyCheckbox.addEventListener("click", (event) => {
            pokemonImage.srcset = (event.target.checked) ? res.shinyImage : res.image;
        });

        // Movimientos
        const movesLists = document.getElementsByClassName("movesList");
        for (let movesList of movesLists) {
            movesList.innerHTML = "<option disabled selected>Seleccione un movimiento: </option>";
            res.moves.forEach(move => {
                const optionElem = document.createElement("option");
                optionElem.textContent = `${capitalizeFirstLetter(move.name)} - ${capitalizeFirstLetter(move.damage_class)}`;
                if (move.power) {
                    optionElem.textContent += ` - Poder: ${move.power}`;
                }
                optionElem.textContent += ` - PP: ${move.pp} - Precisión: ${move.accuracy}%`;
                optionElem.dataset.id = move.id;
                optionElem.dataset.effect = move.effect;
                optionElem.dataset.effect_chance = move.effect_chance;
                movesList.append(optionElem);
            });
        }

        const movesList1 = document.getElementById("movesList1");
        const moveDescription1 = document.getElementById("moveDescription1");
        moveDescription1.textContent = "";
        movesList1.addEventListener("change", (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const moveEffect = selectedOption.dataset.effect;
            moveDescription1.textContent = moveEffect.replace(/\$.*%/gm, `${selectedOption.dataset.effect_chance}%`);
        });

        const movesList2 = document.getElementById("movesList2");
        const moveDescription2 = document.getElementById("moveDescription2");
        moveDescription2.textContent = "";
        movesList2.addEventListener("change", (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const moveEffect = selectedOption.dataset.effect;
            moveDescription2.textContent = moveEffect.replace(/\$.*%/gm, `${selectedOption.dataset.effect_chance}%`);
        });

        const movesList3 = document.getElementById("movesList3");
        const moveDescription3 = document.getElementById("moveDescription3");
        moveDescription3.textContent = "";
        movesList3.addEventListener("change", (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const moveEffect = selectedOption.dataset.effect;
            moveDescription3.textContent = moveEffect.replace(/\$.*%/gm, `${selectedOption.dataset.effect_chance}%`);
        });

        const movesList4 = document.getElementById("movesList4");
        const moveDescription4 = document.getElementById("moveDescription4");
        moveDescription4.textContent = "";
        movesList4.addEventListener("change", (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const moveEffect = selectedOption.dataset.effect;
            moveDescription4.textContent = moveEffect.replace(/\$.*%/gm, `${selectedOption.dataset.effect_chance}%`);
        });

        // IVs
        const rangeIVList = document.getElementsByClassName("iv-range");
        for (let range of rangeIVList) {
            range.addEventListener("input", (event) => {
                const inputElem = range.parentElement.parentElement.childNodes[5].childNodes[1];
                inputElem.value = event.target.value;
            });
        }
        const inputIVList = document.getElementsByClassName("iv-control");
        for (let input of inputIVList) {
            input.addEventListener("input", (event) => {
                enforceMinMax(input);
                const rangeElem = input.parentElement.parentElement.childNodes[3].childNodes[1];
                rangeElem.value = event.target.value;
            });
        }

        // EVs
        const rangeEVList = document.getElementsByClassName("ev-range");
        for (let range of rangeEVList) {
            range.addEventListener("input", (event) => {
                const inputElem = range.parentElement.parentElement.childNodes[5].childNodes[1];
                inputElem.value = event.target.value;

                let sumOfEVs = 0;
                for (let rangeForSum of rangeEVList) {
                    sumOfEVs += parseInt(rangeForSum.value);
                }
                if (sumOfEVs > MAX_EV_SUM) {
                    range.value = "0";
                    inputElem.value = "0";
                    createErrorModal("maxEvSumModal", "No se puede tener más de 510 EVs en total.");
                }
            });
        }
        const inputEVList = document.getElementsByClassName("ev-control");
        for (let input of inputEVList) {
            input.addEventListener("input", (event) => {
                enforceMinMax(input);
                const rangeElem = input.parentElement.parentElement.childNodes[3].childNodes[1];
                rangeElem.value = event.target.value;

                let sumOfEVs = 0;
                for (let inputForSum of inputEVList) {
                    sumOfEVs += parseInt(inputForSum.value);
                }
                if (sumOfEVs > MAX_EV_SUM) {
                    input.value = "0";
                    rangeElem.value = "0";
                    createErrorModal("maxEvSumModal", "No se puede tener más de 510 EVs en total.");
                }
            });
        }

        // Naturaleza
        const natureSelector = document.getElementById("nature-selector");

        // Estadisticas
        const setZeroClass = document.getElementsByClassName('set-zero');
        for (let elem of setZeroClass) elem.value = 0;


        const hpStat = document.getElementById("hpStat");
        const hpEV = parseInt(getValueByID("inputEVhp"));
        const hpIV = parseInt(getValueByID("inputIVhp"));
        hpStat.textContent = (res.name != "shedinja") ? `PV: ${calculateHP(res.base_stats.hp, hpEV, hpIV)}` : `PV: 1`;
        const hpElemUpdaters = document.getElementsByClassName("hp-updater");
        for (let elem of hpElemUpdaters) {
            elem.addEventListener("input", () => {
                const hpEV = parseInt(getValueByID("inputEVhp"));
                const hpIV = parseInt(getValueByID("inputIVhp"));
                if (res.name != "shedinja") hpStat.textContent = `PV: ${calculateHP(res.base_stats.hp, hpEV, hpIV)}`;
            });
        }

        const atkStat = document.getElementById("atkStat");
        const atkEV = parseInt(getValueByID("inputEVatk"));
        const atkIV = parseInt(getValueByID("inputIVatk"));
        atkStat.textContent = `Ataque: ${calculateStat(res.base_stats.atk, atkEV, atkIV, 1)}`;
        const atkElemUpdaters = document.getElementsByClassName("atk-updater");
        for (let elem of atkElemUpdaters) {
            elem.addEventListener("input", () => {
                const atkEV = parseInt(getValueByID("inputEVatk"));
                const atkIV = parseInt(getValueByID("inputIVatk"));
                const nature = natureSelector.selectedOptions[0].dataset;
                let natureMultiplier = 1;
                if (nature.statUp == "attack") { natureMultiplier = 1.1 };
                if (nature.statDown == "attack") { natureMultiplier = 0.9 };
                atkStat.textContent = `Ataque: ${calculateStat(res.base_stats.atk, atkEV, atkIV, natureMultiplier)}`;
            })
        }

        const defStat = document.getElementById("defStat");
        const defEV = parseInt(getValueByID("inputEVdef"));
        const defIV = parseInt(getValueByID("inputIVdef"));
        defStat.textContent = `Defensa: ${calculateStat(res.base_stats.def, defEV, defIV, 1)}`;
        const defElemUpdaters = document.getElementsByClassName("def-updater");
        for (let elem of defElemUpdaters) {
            elem.addEventListener("input", () => {
                const defEV = parseInt(getValueByID("inputEVdef"));
                const defIV = parseInt(getValueByID("inputIVdef"));
                const nature = natureSelector.selectedOptions[0].dataset;
                let natureMultiplier = 1;
                if (nature.statUp == "defense") { natureMultiplier = 1.1 };
                if (nature.statDown == "defense") { natureMultiplier = 0.9 };
                defStat.textContent = `Defensa: ${calculateStat(res.base_stats.def, defEV, defIV, natureMultiplier)}`;
            })
        }

        const spaStat = document.getElementById("spaStat");
        const spaEV = parseInt(getValueByID("inputEVspa"));
        const spaIV = parseInt(getValueByID("inputIVspa"));
        spaStat.textContent = `Ataque Especial: ${calculateStat(res.base_stats.spa, spaEV, spaIV, 1)}`;
        const spaElemUpdaters = document.getElementsByClassName("spa-updater");
        for (let elem of spaElemUpdaters) {
            elem.addEventListener("input", () => {
                const spaEV = parseInt(getValueByID("inputEVspa"));
                const spaIV = parseInt(getValueByID("inputIVspa"));
                const nature = natureSelector.selectedOptions[0].dataset;
                let natureMultiplier = 1;
                if (nature.statUp == "special-attack") { natureMultiplier = 1.1 };
                if (nature.statDown == "special-attack") { natureMultiplier = 0.9 };
                spaStat.textContent = `Ataque Especial: ${calculateStat(res.base_stats.spa, spaEV, spaIV, natureMultiplier)}`;
            })
        }

        const spdStat = document.getElementById("spdStat");
        const spdEV = parseInt(getValueByID("inputEVspd"));
        const spdIV = parseInt(getValueByID("inputIVspd"));
        spdStat.textContent = `Defensa Especial: ${calculateStat(res.base_stats.spd, spdEV, spdIV, 1)}`;
        const spdElemUpdaters = document.getElementsByClassName("spd-updater");
        for (let elem of spdElemUpdaters) {
            elem.addEventListener("input", () => {
                const spdEV = parseInt(getValueByID("inputEVspd"));
                const spdIV = parseInt(getValueByID("inputIVspd"));
                const nature = natureSelector.selectedOptions[0].dataset;
                let natureMultiplier = 1;
                if (nature.statUp == "special-defense") { natureMultiplier = 1.1 };
                if (nature.statDown == "special-defense") { natureMultiplier = 0.9 };
                spdStat.textContent = `Defensa Especial: ${calculateStat(res.base_stats.spd, spdEV, spdIV, natureMultiplier)}`;
            })
        }

        const speStat = document.getElementById("speStat");
        const speEV = parseInt(getValueByID("inputEVspe"));
        const speIV = parseInt(getValueByID("inputIVspe"));
        speStat.textContent = `Velocidad: ${calculateStat(res.base_stats.spe, speEV, speIV, 1)}`;
        const speElemUpdaters = document.getElementsByClassName("spe-updater");
        for (let elem of speElemUpdaters) {
            elem.addEventListener("input", () => {
                const speEV = parseInt(getValueByID("inputEVspe"));
                const speIV = parseInt(getValueByID("inputIVspe"));
                const nature = natureSelector.selectedOptions[0].dataset;
                let natureMultiplier = 1;
                if (nature.statUp == "speed") { natureMultiplier = 1.1 };
                if (nature.statDown == "speed") { natureMultiplier = 0.9 };
                speStat.textContent = `Velocidad: ${calculateStat(res.base_stats.spe, speEV, speIV, natureMultiplier)}`;
            })
        }

        // Objeto
        const pokemonItemsList = document.getElementById("item-selector");
        const itemsDescription = document.getElementById("itemDescription");
        pokemonItemsList.addEventListener("change", (event) => {
            const selectedOption = event.target.selectedOptions[0];
            itemsDescription.textContent = selectedOption.dataset.description;
        });

        // Boton de agregar
        const addPokemonToTeamButton = document.getElementById("addPokemonToTeamButton");
        addPokemonToTeamButton.onclick = () => addPokemonToTeam(res);

        document.getElementById("selectPokemonDiv").hidden = false;
        document.getElementById("addPokemonDiv").hidden = false;
    });
}

const addPokemonToTeam = (pokemon) => {
    const object = {
        name: pokemon.name,
        types: pokemon.types,
        ability: getValueByID("pokemonAbilitiesList"),
        moves: [
            parseInt(getDatasetOfOption("movesList1").id),
            parseInt(getDatasetOfOption("movesList2").id),
            parseInt(getDatasetOfOption("movesList3").id),
            parseInt(getDatasetOfOption("movesList4").id),
        ],
        sprite: document.getElementById("pokemonImage").srcset,
        nature: getDatasetOfOption("nature-selector").name,
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

    if (object.ability == "Seleccione una habilidad:") object.ability = pokemon.abilities[0].name;
    if (object.item == "seleccione un objeto") object.item = null;
    if (object.nature == "empty") object.nature = "Hardy";
    if (!object.moves[0] && !object.moves[1] && !object.moves[2] && !object.moves[3]) {
        createErrorModal("errorAddPokemonToTeamModal", "Debe seleccionar al menos un movimiento.");
    } else {
        ajax("POST", "/teambuilder/create/addPokemonToTeam", object, (res) => {
            res = JSON.parse(res);
            switch (res.success) {
                case "successful":
                    createSuccessModal("addPokemonToTeamModal", "El Pokémon fue añadido a su equipo satifactoriamente.");
                    document.getElementById("addPokemonDiv").hidden = true;
                    break;
                case "sixPokemon":
                    createModal(
                        "finishedTeamCreationModal",
                        "¡Felicidades!",
                        "El Pokémon fue añadido a su equipo satisfactoriamente. Ha terminado de crear su equipo. Pulse el botón para continuar.",
                        "Continuar",
                        () => document.getElementById("returnToTeambuilderForm").submit()
                    );
                    break;
                case "error":
                    createErrorModal("errorAddPokemonToTeamModal", "Hubo un error al añadir el Pokémon a su equipo. Inténtelo nuevamente más tarde.");
                    break;
            }
        });
    }
}

const deleteTeam = (elem) => {
    const divTeam = elem.parentElement.parentElement.parentElement;
    createModal(
        "deleteTeamModal",
        "Confirmación",
        `¿Está seguro de que quiere borrar el equipo ${divTeam.firstElementChild.firstElementChild.innerText}?`,
        "Aceptar",
        () => ajaxDeleteTeamFunction(),
        "Cancelar",
        $(`#deleteTeamModal`).modal("hide")
    );
    const ajaxDeleteTeamFunction = () => {
        const object = {
            ID_Team: parseInt(divTeam.dataset.id)
        };
        ajax("DELETE", "/teambuilder/deleteTeam", object, (res) => {
            res = JSON.parse(res);
            switch (res.success) {
                case "successful":
                    createSuccessModal("deleteTeamModal", "El equipo fue borrado satisfactoriamente.");
                    divTeam.previousSibling.previousSibling.remove();
                    divTeam.remove();
                    break;
                case "error":
                    createErrorModal("errorDeleteTeamModal", "Hubo un error al intentar borrar el equipo. Inténtelo nuevamente más tarde.");
                    break;
            }
        });
    }
}

const activateInputOfModifyTeamName = (elem) => {
    const titleElem = elem.parentElement.parentElement.children[0];
    const oldName = titleElem.children[0].innerText;
    titleElem.innerHTML = `
        <input id="newTeamName" type="text" class="form-control" value="${oldName}">
        <button class="btn btn-success btn-sm" onclick="modifyTeamName(this)">   ✔   </button>
    `;
    elem.disabled = true;
}

const modifyTeamName = (elem) => {
    const divTeam = elem.parentElement.parentElement.parentElement;
    const object = {
        ID_Team: parseInt(divTeam.dataset.id),
        newName: elem.parentElement.children[0].value
    }
    ajax("PUT", "/teambuilder/modifyTeamName", object, (res) => {
        res = JSON.parse(res);
        switch (res.success) {
            case "successful":
                createSuccessModal("modifyTeamNameModal", `El nombre del equipo fue cambiado satisfactoriamente a ${object.newName}.`);
                elem.parentElement.innerHTML = `<h4 class="text-start">${object.newName}</h4>`;
                divTeam.previousSibling.previousSibling.innerText = object.newName;
                divTeam.children[0].children[2].children[0].disabled = false;
                break;
            case "error":
                createErrorModal("errorModifyTeamNameModal", "Hubo un error al intentar modificar el nombre del equipo. Inténtelo nuevamente más tarde.");
                break;
        }
    });
}

const deletePokemon = (elem) => {
    const pokemonDiv = elem.parentElement;
    const divTeam = pokemonDiv.parentElement.parentElement;
    if (divTeam.children.length == 2) {
        return createErrorModal("errorDeletePokemonModal", "No puede borrar el último Pokémon del equipo. En su lugar, borre el equipo.");
    }
    const object = {
        ID_Team: parseInt(divTeam.dataset.id),
        pokemonNumber: parseInt(pokemonDiv.dataset.number)
    }
    ajax("DELETE", "/teambuilder/deletePokemon", object, (res) => {
        res = JSON.parse(res);
        switch (res.success) {
            case "successful":
                createSuccessModal("deletePokemonModal", "El Pokémon fue borrado satisfactoriamente.");
                pokemonDiv.parentElement.remove();
                break;
            case "error":
                createErrorModal("errorDeletePokemonModal", "Hubo un error al intentar borrar el Pokémon. Inténtelo nuevamente más tarde.");
                break;
        }
    })
}

const showPokemonCreator = (elem) => {
    const object = {
        team_name: elem.parentElement.parentElement.children[0].children[0].innerText
    }
    ajax("GET", "/teambuilder/updateSelectedTeamToAddPokemon", object, (res) => {
        res = JSON.parse(res);
        switch (res.success) {
            case "successful":
                document.getElementById("teamsContainerDiv").hidden = true;
                document.getElementById("selectPokemonDiv").hidden = false;
                document.getElementById("teamNameID").textContent = `Nombre del Equipo: ${object.team_name}`;
                const pokemonList = document.getElementById("pokemon-selector");
                res.pokemonNamesList.forEach(pokemon => pokemonList.innerHTML += `<option>${pokemon}</option>`);
                const naturesList = document.getElementById("nature-selector");
                res.naturesList.forEach(nature => {
                    if (nature.stat_up) {
                        naturesList.innerHTML += `
                            <option class="pokemon-nature" data-name="${nature.name}" data-stat-up="${nature.stat_up}" data-stat-down=${nature.stat_down}>
                                ${nature.name}, more ${nature.stat_up}, less ${nature.stat_down}
                            </option>
                        `;
                    } else {
                        naturesList.innerHTML += `
                            <option class="pokemon-nature" data-name="${nature.name}">
                                ${nature.name}
                            </option>
                        `;
                    }
                });
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
    });
}

const selectBattleTeam = () => {
    const searchCombatButton = document.getElementById("searchCombatButton");
    searchCombatButton.hidden = true;
    const object = {
        ID_Team: parseInt(getDatasetOfOption("selectTeamID").id)
    }
    ajax("PUT", "/lobby/selectTeam", object, res => {
        searchCombatButton.hidden = false;
    });
}

const addMessageToServerMessages = (text) => {
    document.getElementById("serverMessages").innerHTML += `<h6>${text}</h6>`;
}

const pokemonBattleTheme = new Audio('audio/battleTheme.mp3');


