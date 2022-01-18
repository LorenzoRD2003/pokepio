const socket = io();

socket.on('connect', () => {
    //console.log("Hola");
});

socket.on('chat-message', message => {
    const messagesDiv = document.getElementById("messagesDiv");
    const option = document.createElement("li");
    option.innerHTML = `<b>${message.userSender}:</b> ${message.messageContent}`;
    messagesDiv.append(option);
    if (chatDiv.dataset.userSender == message.userSender) document.getElementById("messageToSend").value = "";
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
    pokemonBattleTheme.loop=true;
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
    document.getElementById("pokemon1HP").innerText = `PV: ${player.activePokemon.stats.hp.currentHP}`;
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
socket.on('resumed-timeout', (username1, username2, time1, time2) => {
    addMessageToServerMessages(`A ${username1} le quedan ${Math.round(time1 / 1000)} segundos.`);
    addMessageToServerMessages(`A ${username2} le quedan ${Math.round(time2 / 1000)} segundos.`);
});
socket.on('finished-timeout', username => {
    addMessageToServerMessages(`Se acabó el tiempo de ${username}.`);
});

const createChatWithUser = () => {
    document.getElementById("chatDiv").hidden = true;
    const object = {
        other_user: getValueByID("other-user")
    }
    ajax("GET", "/lobby/getChat", object, res => {
        res = JSON.parse(res);
        switch (res.success) {
            case "successful":
                const chatDiv = document.getElementById("chatDiv");
                const messagesDiv = document.getElementById("messagesDiv");
                messagesDiv.innerHTML = "";
                chatDiv.hidden = false;
                chatDiv.dataset.chatID = res.ID_Chat;
                chatDiv.dataset.userSender = res.userSender.name;
                document.getElementById("chatName").innerText = `Chat entre ${res.userSender.name} y ${res.userReceiver.name}`;
                if (res.messages) {
                    res.messages.forEach(message => {
                        const option = document.createElement("li");
                        option.innerHTML = `<b>${message.userSender}:</b> ${message.messageContent}`;
                        messagesDiv.append(option);
                    });
                }
                socket.emit('join-chat', { ID_Chat: res.ID_Chat });
                break;
            case "non-existing-users":
                createErrorModal("errorGetChatModal", "Ingrese nombres de usuario válidos.");
                break;
            case "error":
                createErrorModal("errorGetChatModal", "Ha ocurrido un error al intentar crear el chat. Inténtelo de nuevo más tarde.");
                break;
        }
    });
}
const sendChatMessage = () => {
    const chatDiv = document.getElementById("chatDiv");
    const message = JSON.stringify({
        messageContent: getValueByID("messageToSend"),
        ID_Chat: chatDiv.dataset.chatID,
        userSender: chatDiv.dataset.userSender
    });
    socket.emit("chat-message", message);
}

const joinBattle = () => {
    ajax("GET", "/battle/getBattleTeam", null, res => {
        const userData = JSON.parse(res);
        socket.emit("join-battle", userData);
    });
}
const selectFirstPokemon = pkmnIndex => {
    const selectPokemonButtons = document.getElementsByClassName("btn-selectPokemonAtStart");
    for (let button of selectPokemonButtons) button.disabled = true;
    pauseTimeout();
    socket.emit("select-first-pokemon", pkmnIndex);
}
const selectTurnAction = moveIndex => {
    const moveButtons = document.getElementsByClassName("btn-move");
    for (let button of moveButtons) button.disabled = true;
    const changeButtons = document.getElementsByClassName("btn-change");
    for (let button of changeButtons) button.disabled = true;
    pauseTimeout();
    socket.emit("select-turn-action", player.activePokemon.moves[moveIndex]);
}

const changePokemon = pkmnIndex => {

}
const surrenderFromBattle = () => {
    createModal(
        "surrenderButtonModal",
        "¡Alerta!",
        "¿Está seguro de que quiere rendirse?",
        "Aceptar",
        () => socket.emit("surrender"),
        "Cancelar",
        $(`#surrenderButtonModal`).modal("hide")
    );
}

const beginTimeout = () => socket.emit("start-counter");
const pauseTimeout = () => {
    if (isActiveTimeout) socket.emit("pause-timeout");
}
