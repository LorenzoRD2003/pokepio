/**
 * Añade un mensaje a la lista de mensajes de una batalla.
 * @param {String} text Mensaje a añadir. 
 */
const addMessageToServerMessages = text => {
    document.getElementById("serverMessages").innerHTML += `<h6>${text}</h6>`;
}

// Canción para los combates
const pokemonBattleTheme = new Audio('audio/battleTheme.mp3');


// Batalla WebSocket
const socket = io();
socket.on('connect', () => {
    console.log("Conectado a la batalla");
});

let player, opponent;
socket.on('start-battle', battle => {
    socket.emit('opponent-confirm');
    const username = document.getElementById("username").innerText;
    const beforeBattleOpponentPokemon = document.getElementById("beforeBattleOpponentPokemon");
    if (username == battle.user1.username) {
        player = battle.user1;
        opponent = battle.user2;
    } else {
        player = battle.user2;
        opponent = battle.user1;
    }
    opponent.battleTeam.forEach(pokemon => {
        const li = document.createElement("li");
        li.innerHTML = `${capitalizeFirstLetter(pokemon.name)}<img class="beforeBattleSprite" src="${pokemon.sprite}">`;
        beforeBattleOpponentPokemon.append(li);
    });
    document.getElementById("user2Name").innerText = opponent.username;
    document.getElementById("user2Image").srcset = `/img/profile_photos/${opponent.profile_photo}`;
    document.getElementById("user2pokemonLeft").innerText = opponent.battleTeam.length;
    addMessageToServerMessages("Ambos usuarios se han conectado. Elija un Pokémon para comenzar.");

    document.getElementById("beforeOpponentHasConnected").hidden = true;
    document.getElementById("beforeBattleShowUser1").hidden = false;
    document.getElementById("beforeBattleShowUser2").hidden = false;

    document.getElementById("timeButton").disabled = false;
    document.getElementById("surrenderButton").disabled = false;
    pokemonBattleTheme.play();
    pokemonBattleTheme.loop = true;
});
socket.on('select-first-pokemon', battle => {
    const username = document.getElementById("username").innerText;
    if (username == battle.user1.username) {
        player = battle.user1;
        opponent = battle.user2;
    } else {
        player = battle.user2;
        opponent = battle.user1;
    }
    document.getElementById("pokemon1Name").innerText = capitalizeFirstLetter(player.activePokemon.name);
    document.getElementById("pokemon1Image").srcset = player.activePokemon.sprite;
    document.getElementById("pokemon1Level").innerText = player.activePokemon.level;
    document.getElementById("pokemon1HP").innerText = `PV: ${player.activePokemon.stats.hp.currentHP} / ${player.activePokemon.stats.hp.maxHP}`;
    document.getElementById("pokemon1Atk").innerText = `Ataque: ${player.activePokemon.stats.atk.baseStat}`;
    document.getElementById("pokemon1Def").innerText = `Defensa: ${player.activePokemon.stats.def.baseStat}`;
    document.getElementById("pokemon1Spa").innerText = `Ataque Especial: ${player.activePokemon.stats.spa.baseStat}`;
    document.getElementById("pokemon1Spd").innerText = `Defensa Especial: ${player.activePokemon.stats.spd.baseStat}`;
    document.getElementById("pokemon1Spe").innerText = `Velocidad: ${player.activePokemon.stats.spe.baseStat}`;
    document.getElementById("pokemon1Ability").innerText = `Habilidad: ${capitalizeFirstLetter(player.activePokemon.ability)}`;
    document.getElementById("pokemon1Item").innerText = (player.activePokemon.item) ? `Objeto: ${capitalizeFirstLetter(player.activePokemon.item)}` : "Objeto: (vacío)";
    document.getElementById("pokemon1Status").innerText = `Estado: ${player.activePokemon.status}`;
    player.activePokemon.types.forEach(type => document.getElementById("pokemon1Types").innerText += `${capitalizeFirstLetter(type.name)} `);
    const move1 = document.getElementById("move1");
    if (player.activePokemon.moves[0]) {
        move1.hidden = false;
        move1.innerText = `${capitalizeFirstLetter(player.activePokemon.moves[0].name)} PP: ${player.activePokemon.moves[0].pp}`;
    } else {
        move1.hidden = true;
    }
    const move2 = document.getElementById("move2");
    if (player.activePokemon.moves[1]) {
        move2.hidden = false;
        move2.innerText = `${capitalizeFirstLetter(player.activePokemon.moves[1].name)} PP: ${player.activePokemon.moves[1].pp}`;
    } else {
        move2.hidden = true;
    }
    const move3 = document.getElementById("move3");
    if (player.activePokemon.moves[2]) {
        move3.hidden = false;
        move3.innerText = `${capitalizeFirstLetter(player.activePokemon.moves[2].name)} PP: ${player.activePokemon.moves[2].pp}`;
    } else {
        move3.hidden = true;
    }
    const move4 = document.getElementById("move4");
    if (player.activePokemon.moves[3]) {
        move4.hidden = false;
        move4.innerText = `${capitalizeFirstLetter(player.activePokemon.moves[3].name)} PP: ${player.activePokemon.moves[3].pp}`;
    } else {
        move4.hidden = true;
    }

    const changeButtons = document.getElementsByClassName("btn-change");
    for (let button of changeButtons) {
        button.hidden = false;
        if (button.dataset.index != player.currentPokemonIndex) button.disabled = false;
    }

    document.getElementById("pokemon2Name").innerText = capitalizeFirstLetter(opponent.activePokemon.name);
    document.getElementById("pokemon2Image").srcset = opponent.activePokemon.sprite;
    document.getElementById("pokemon2Level").innerText = opponent.activePokemon.level;
    document.getElementById("pokemon2HP").innerText = `PV: ${opponent.activePokemon.stats.hp.currentHP}`;
    document.getElementById("pokemon2Status").innerText = `Estado: ${opponent.activePokemon.status}`;
    opponent.activePokemon.types.forEach(type => document.getElementById("pokemon2Types").innerText += `${capitalizeFirstLetter(type.name)} `);

    addMessageToServerMessages(`${player.username} elige a ${capitalizeFirstLetter(player.activePokemon.name)}.`);
    addMessageToServerMessages(`${opponent.username} elige a ${capitalizeFirstLetter(opponent.activePokemon.name)}.`);

    document.getElementById("beforeBattleShowUser1").hidden = true;
    document.getElementById("beforeBattleShowUser2").hidden = true;
    document.getElementById("inBattleShowUser1").hidden = false;
    document.getElementById("inBattleShowUser2").hidden = false;
});
socket.on('action-result', (battle, turnMessages) => {
    console.log(battle);
    turnMessages.forEach(addMessageToServerMessages);
});
socket.on('battle-end', battleResult => {
    disableButton("surrenderButton");
    createModal(
        "finishedBattleModal",
        "Final de la batalla",
        `La batalla ha concluido. El ganador es ${battleResult.winner}, y el resultado es de ${battleResult.result}`,
        "Aceptar",
        () => document.getElementById("returnToLobbyForm").submit()
    );
});
let isActiveTimeout = false;
socket.on('started-timeout', () => {
    disableButton("timeButton");
    isActiveTimeout = true;
    addMessageToServerMessages("Te quedan 120 segundos.");
});
socket.on('resumed-timeout', (user, time) => addMessageToServerMessages(`A ${user} le quedan ${Math.round(time)} segundos.`));
socket.on('finished-timeout', username => {
    addMessageToServerMessages(`Se acabó el tiempo de ${username}.`);
});


// Unirse a la batalla
window.addEventListener("load", async () => {
    try {
        const res = (await nodeReq({
            method: "get",
            url: "/battle/getBattleTeam"
        })).data;

        const userData = JSON.parse(res);
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
        socket.emit("select-first-pokemon", index);
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
        const selectedMove = player.activePokemon.moves[moveIndex];

        // Lo envío al servidor
        socket.emit("select-turn-action", selectedMove);
    });
})

const btnChange = document.getElementsByClassName("btn-change");
btnChange.forEach(btn => {
    btn.addEventListener("click", () => {
        // Tomo el indice del Pokémon (0, 1, 2, 3, 4, 5)
        const index = parseInt(btn.dataset.index);

        // Desactivo botones de movimientos y cambios de Pokémon
        btnMove.forEach(btnDisable => btnDisable = true);
        btnChange.forEach(btnDisable => btnDisable = true);

        // Envío la información al servidor
        // socket.emit("select-turn-action", index);
    });
})

// Botón de rendirse
const surrenderButton = document.getElementById("surrenderButton");
surrenderButton.addEventListener("click", () => {
    surrenderButton.disabled = true;
    createModal(
        "surrenderButtonModal",
        "¡Alerta!",
        "¿Está seguro de que quiere rendirse?",
        "Aceptar",
        () => socket.emit("surrender"),
        "Cancelar",
        () => $(`#surrenderButtonModal`).modal("hide")
    );
    surrenderButton.disabled = false;
});

// Botón para iniciar el contador de tiempo
const timeButton = document.getElementById("timeButton");
timeButton.addEventListener("click", () => socket.emit("start-counter"));

