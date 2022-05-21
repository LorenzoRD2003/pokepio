/**
 * Añade un mensaje a la lista de mensajes de una batalla.
 * @param {String} text Mensaje a añadir. 
 */
const addMessageToServerMessages = text => {
    const serverMessages = document.getElementById("serverMessages");
    serverMessages.innerHTML += `<h6>${text}</h6>`;
}

const setPlayerOpponent = battle => {
    // Reemplazo player y opponent segun esto para que el usuario de este cliente sea player
    // Es por esto que esta funcion la ejecuto a cada evento recibido
    const username = document.getElementById("username").innerText;

    if (username == battle.user1.username)
        return {
            player: battle.user1,
            opponent: battle.user2
        }
    else
        return {
            player: battle.user2,
            opponent: battle.user1
        }
}

const updateBattleDOM = (player, opponent) => {
    // Obtengo en variables los datos de los Pokémon
    const { name, sprite, level, stats, ability, item, status, types, moves } = player.active_pokemon;

    // Nombre del Pokémon
    document.getElementById("pokemon1Name").innerText = capitalizeFirstLetter(name);

    // Sprite del Pokémon
    document.getElementById("pokemon1Image").srcset = sprite;

    // Nivel del Pokémon
    document.getElementById("pokemon1Level").innerText = `Nivel: ${level}`;

    // Stats del Pokémon
    document.getElementById("pokemon1HP").innerText = `PV: ${stats.hp.current_hp} / ${stats.hp.max_hp}`;
    document.getElementById("pokemon1Atk").innerText = `Ataque: ${stats.atk.base_stat}`;
    document.getElementById("pokemon1Def").innerText = `Defensa: ${stats.def.base_stat}`;
    document.getElementById("pokemon1Spa").innerText = `Ataque Especial: ${stats.spa.base_stat}`;
    document.getElementById("pokemon1Spd").innerText = `Defensa Especial: ${stats.spd.base_stat}`;
    document.getElementById("pokemon1Spe").innerText = `Velocidad: ${stats.spe.base_stat}`;

    // Habilidad del Pokémon
    document.getElementById("pokemon1Ability").innerText = `Habilidad: ${ability}`;

    // Objeto del Pokémon
    document.getElementById("pokemon1Item").innerText = `Objeto: ${capitalizeFirstLetter(item)}`;

    // Estado del Pokémon
    document.getElementById("pokemon1Status").innerText = `Estado: ${status}`;

    // Tipos del pokemon
    document.getElementById("pokemon1Types").innerText = "Tipos: ";
    types.forEach(type => document.getElementById("pokemon1Types").innerText += `${capitalizeFirstLetter(type.name)} `);

    // Movimientos del Pokémon
    const move1 = document.getElementById("move1");
    if (moves[0]) {
        move1.hidden = false;
        move1.innerText = `${capitalizeFirstLetter(moves[0].name)} PP: ${moves[0].pp}`;
    } else
        move1.hidden = true;

    const move2 = document.getElementById("move2");
    if (moves[1]) {
        move2.hidden = false;
        move2.innerText = `${capitalizeFirstLetter(moves[1].name)} PP: ${moves[1].pp}`;
    } else
        move2.hidden = true;

    const move3 = document.getElementById("move3");
    if (moves[2]) {
        move3.hidden = false;
        move3.innerText = `${capitalizeFirstLetter(moves[2].name)} PP: ${moves[2].pp}`;
    } else
        move3.hidden = true;

    const move4 = document.getElementById("move4");
    if (moves[3]) {
        move4.hidden = false;
        move4.innerText = `${capitalizeFirstLetter(moves[3].name)} PP: ${moves[3].pp}`;
    } else
        move4.hidden = true;

    // Guardo los datos del oponente
    document.getElementById("pokemon2Name").innerText = capitalizeFirstLetter(opponent.active_pokemon.name);
    document.getElementById("pokemon2Image").srcset = opponent.active_pokemon.sprite;
    document.getElementById("pokemon2Level").innerText = `Nivel: ${opponent.active_pokemon.level}`;
    document.getElementById("pokemon2HP").innerText = `PV: ${opponent.active_pokemon.stats.hp.current_hp}`;
    document.getElementById("pokemon2Status").innerText = `Estado: ${opponent.active_pokemon.status}`;
    document.getElementById("pokemon2Types").innerText = "Tipos: ";
    opponent.active_pokemon.types.forEach(type => document.getElementById("pokemon2Types").innerText += `${capitalizeFirstLetter(type.name)} `);
}

// Canción para los combates
const pokemonBattleTheme = new Audio('audio/battleTheme.mp3');


// Batalla WebSocket
const socket = io();
socket.on('connect', () => {
    console.log("Conectado a la batalla");
});

socket.on('start-battle', battle => {
    // Hago el evento para setear opponent en caso de que no esté seteado 
    socket.emit('opponent-confirm');

    // Obtengo el nombre de usuario que está guardado en la página
    const username = document.getElementById("username").innerText;
    const beforeBattleOpponentPokemon = document.getElementById("beforeBattleOpponentPokemon");

    // Reemplazo player y opponent segun esto para que el usuario de este cliente sea player
    if (username == battle.user1.username) {
        player = battle.user1;
        opponent = battle.user2;
    } else {
        player = battle.user2;
        opponent = battle.user1;
    }

    // Listo los Pokémon del oponente
    opponent.battle_team.forEach(pokemon => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${capitalizeFirstLetter(pokemon.name)}</b><img class="beforeBattleSprite" src="${pokemon.sprite}">`;
        beforeBattleOpponentPokemon.append(li);
    });

    // Muestro los datos del oponente
    document.getElementById("user2Name").innerText = opponent.username;
    document.getElementById("user2Image").srcset = `/img/profile_photos/${opponent.profile_photo}`;
    document.getElementById("user2pokemonLeft").innerText = opponent.battle_team.length;

    // Mensaje de inicio a la batalla
    addMessageToServerMessages("Ambos usuarios se han conectado. Elija un Pokémon para comenzar.");

    // Muestro los divs que quiero
    document.getElementById("beforeOpponentHasConnected").hidden = true;
    document.getElementById("beforeBattleShowUser1").hidden = false;
    document.getElementById("beforeBattleShowUser2").hidden = false;

    // Activo botones de tiempo y rendición
    document.getElementById("timeButton").disabled = false;
    document.getElementById("surrenderButton").disabled = false;

    // Se empieza a tocar la canción de Pokémon
    pokemonBattleTheme.play();
    pokemonBattleTheme.loop = true;
});

socket.on('select-pokemon', battle => {
    const { player, opponent } = setPlayerOpponent(battle);

    // Actualizo el DOM
    updateBattleDOM(player, opponent);

    // Muestro mensajes del servidor
    battle.messages.forEach(addMessageToServerMessages);

    // Muestro los divs de la batalla y escondo los previos
    document.getElementById("beforeBattleShowUser1").hidden = true;
    document.getElementById("beforeBattleShowUser2").hidden = true;
    document.getElementById("inBattleShowUser1").hidden = false;
    document.getElementById("inBattleShowUser2").hidden = false;
});

socket.on('action-result', battle => {
    // Actualizo el DOM
    const { player, opponent } = setPlayerOpponent(battle);
    updateBattleDOM(player, opponent);

    // Muestro la lista de mensajes
    battle.messages.forEach(addMessageToServerMessages);
});

socket.on('start-new-turn', battle => {
    const { player, opponent } = setPlayerOpponent(battle);

    // Escribo el número de turno
    document.getElementById("turnNumber").innerHTML = `Turno ${battle.turn}`;

    // Activo los botones de movimientos
    btnMove.forEach(btn => btn.disabled = false);

    // Activo los botones de cambios de Pokémon
    btnChange.forEach(btn => {
        btn.hidden = false;

        // Solo activo los que estan vivos, y tampoco activo el que estoy usando
        pokemon = player.battle_team[btn.dataset.index];

        if (player.active_pokemon_index != btn.dataset.index && pokemon.is_alive)
            btn.disabled = false;
    });
});

socket.on("finished-turn", battle => {
    // Actualizo el DOM
    const { player, opponent } = setPlayerOpponent(battle);
    updateBattleDOM(player, opponent);

    // Muestro la lista de mensajes
    battle.messages.forEach(addMessageToServerMessages);
    addMessageToServerMessages("");
});

socket.on("pokemon-ko", player => {
    const username = document.getElementById("username").innerText;
    
    if (username != player.username)
        return addMessageToServerMessages("Esperando al oponente...");
    
    // Si este cliente es el que tiene un Pokémon debilitado, entonces lo marcamos
    addMessageToServerMessages("Elija un nuevo Pokémon.");

    // Muestro el div de elegir Pokémon
    document.getElementById("beforeBattleShowUser1").hidden = false;
    document.getElementById("inBattleShowUser1").hidden = true;

    // Activo los botones de cambios de Pokémon
    btnSelectPokemonAtStart.forEach(btn => {
        pokemon = player.battle_team[btn.dataset.index];

        // Solo activo los que estan vivos, y tampoco activo el que estoy usando
        if (player.active_pokemon_index != btn.dataset.index && pokemon.is_alive)
            btn.disabled = false;
    });
});

socket.on('battle-end', battleResult => {
    // Desactivo el botón de rendirse
    document.getElementById("surrenderButton").disabled = true;

    // Modal para volver al lobby
    createModal(
        "finishedBattleModal",
        "Final de la batalla",
        `La batalla ha concluido. El ganador es ${battleResult.winner}, y el resultado es de ${battleResult.result}`,
        "Aceptar",
        () => document.getElementById("returnToLobbyForm").submit()
    );
});

socket.on('error', () => {
    // Desactivo el botón de rendirse
    document.getElementById("surrenderButton").disabled = true;

    // Modal para volver al lobby
    createModal(
        "finishedBattleModal",
        "Final de la batalla",
        `Ocurrió un error inesperado. Haga click en el botón para volver al lobby.`,
        "Aceptar",
        () => document.getElementById("returnToLobbyForm").submit()
    );
});

// Iniciar el contador
socket.on('started-timeout', () => {
    document.getElementById("timeButton").disabled = true;
    addMessageToServerMessages("Te quedan 120 segundos.");
});

// Resumir contador
socket.on('resumed-timeout', (user, time) => addMessageToServerMessages(`A ${user} le quedan ${Math.round(time / 1000)} segundos.`));

// Cuando se le acaba el tiempo a un usuario (poco después, llega el evento de fin de la batalla)
socket.on('finished-timeout', username => addMessageToServerMessages(`Se acabó el tiempo de ${username}.`));


// Unirse a la batalla
window.addEventListener("load", async () => {
    try {
        const userData = (await nodeReq({
            method: "get",
            url: "/battle/team"
        })).data;
        socket.emit("join-battle", userData);
    } catch (err) {
        handleAxiosError(err);
    }
});

// Botones para elegir el primer Pokémon
const btnSelectPokemonAtStart = document.querySelectorAll(".btnSelectPokemonAtStart");
btnSelectPokemonAtStart.forEach(btn => {
    btn.addEventListener("click", () => {
        // Tomo el indice del Pokémon (0, 1, 2, 3, 4, 5)
        const index = parseInt(btn.dataset.index);

        // Desactivo todos estos botones
        btnSelectPokemonAtStart.forEach(btnDisable => btnDisable.disabled = true);

        // Envío mi elección al servidor
        socket.emit("select-pokemon", index);
    });
});

// Botones de movimientos
const btnMove = document.querySelectorAll(".btn-move");
btnMove.forEach(btn => {
    btn.addEventListener("click", () => {
        // Desactivo botones de movimientos y cambios de Pokémon
        btnMove.forEach(btnDisable => btnDisable.disabled = true);
        btnChange.forEach(btnDisable => btnDisable.disabled = true);

        // Obtengo el movimiento seleccionado
        const moveIndex = parseInt(btn.dataset.index);

        // Lo envío al servidor
        socket.emit("select-turn-action", {
            type: "move",
            index: moveIndex
        });

        // Borro la lista de mensajes del servidor
        document.getElementById("serverMessages").innerHTML = "";
        addMessageToServerMessages("Esperando al oponente...");
    });
});

const btnChange = document.querySelectorAll(".btn-change");
btnChange.forEach(btn => {
    btn.addEventListener("click", () => {
        // Tomo el indice del Pokémon (0, 1, 2, 3, 4, 5)
        const index = parseInt(btn.dataset.index);

        // Desactivo botones de movimientos y cambios de Pokémon
        btnMove.forEach(btnDisable => btnDisable.disabled = true);
        btnChange.forEach(btnDisable => btnDisable.disabled = true);

        // Envío la información al servidor
        socket.emit("select-turn-action", {
            type: "change",
            index: index
        });

        // Borro la lista de mensajes del servidor
        document.getElementById("serverMessages").innerHTML = "";
        addMessageToServerMessages("Esperando al oponente...");
    });
});

// Botón de rendirse
const surrenderButton = document.getElementById("surrenderButton");
surrenderButton.addEventListener("click", () => {
    // Desactivo el botón de rendirse (para que no se creen muchos modals si el usuario apreta mucho)
    surrenderButton.disabled = true;

    // Modal para rendirse
    createModal(
        "surrenderButtonModal",
        "¡Alerta!",
        "¿Está seguro de que quiere rendirse?",
        "Aceptar",
        () => socket.emit("surrender"),
        "Cancelar",
        () => $(`#surrenderButtonModal`).modal("hide")
    );

    // Vuelvo a activarlo
    surrenderButton.disabled = false;
});

// Botón para iniciar el contador de tiempo
const timeButton = document.getElementById("timeButton");
timeButton.addEventListener("click", () => {
    // Desactivo el boton de tiempo
    document.getElementById("timeButton").disabled = true;

    // Envio el evento al servidor
    socket.emit("start-counter");
});

