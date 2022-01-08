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

socket.on('start-battle', battle => {
    const username = document.getElementById("username").innerText;
    const beforeBattleOpponentPokemon = document.getElementById("beforeBattleOpponentPokemon");
    let opponent = (username == battle.user1.username) ? battle.user2 : battle.user1;
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
    let player, opponent;
    if (username == battle.user1.username) {
        player = battle.user1;
        opponent = battle.user2;
    } else {
        player = battle.user2;
        opponent = battle.user1;
    }
    const playerPokemon = player.battleTeam[player.currentPokemonIndex];
    document.getElementById("pokemon1Name").innerText = capitalizeFirstLetter(playerPokemon.name);
    document.getElementById("pokemon1Image").srcset = playerPokemon.sprite;
    document.getElementById("pokemon1HP").innerText = `PV: ${playerPokemon.stats.hp.currentHP}`;
    document.getElementById("pokemon1Atk").innerText = `Ataque: ${playerPokemon.stats.atk.baseStat}`;
    document.getElementById("pokemon1Def").innerText = `Defensa: ${playerPokemon.stats.def.baseStat}`;
    document.getElementById("pokemon1Spa").innerText = `Ataque Especial: ${playerPokemon.stats.spa.baseStat}`;
    document.getElementById("pokemon1Spd").innerText = `Defensa Especial: ${playerPokemon.stats.spe.baseStat}`;
    document.getElementById("pokemon1Spe").innerText = `Velocidad: ${playerPokemon.stats.spd.baseStat}`;
    const move1 = document.getElementById("move1");
    if (playerPokemon.moves[0]) {
        move1.hidden = false;
        move1.innerText = capitalizeFirstLetter(playerPokemon.moves[0].name);
    } else {
        move1.hidden = true;
    }
    const move2 = document.getElementById("move2");
    if (playerPokemon.moves[1]) {
        move2.hidden = false;
        move2.innerText = capitalizeFirstLetter(playerPokemon.moves[1].name);
    } else {
        move2.hidden = true;
    }
    const move3 = document.getElementById("move3");
    if (playerPokemon.moves[2]) {
        move3.hidden = false;
        move3.innerText = capitalizeFirstLetter(playerPokemon.moves[2].name);
    } else {
        move3.hidden = true;
    }
    const move4 = document.getElementById("move4");
    if (playerPokemon.moves[3]) {
        move4.hidden = false;
        move4.innerText = capitalizeFirstLetter(playerPokemon.moves[3].name);
    } else {
        move4.hidden = true;
    }
    
    const opponentPokemon = opponent.battleTeam[opponent.currentPokemonIndex];
    document.getElementById("pokemon2Name").innerText = capitalizeFirstLetter(opponentPokemon.name);
    document.getElementById("pokemon2Image").srcset = opponentPokemon.sprite;
    document.getElementById("pokemon2HP").innerText = `PV: ${opponentPokemon.stats.hp.currentHP}`;

    addMessageToServerMessages(`${player.username} elige a ${capitalizeFirstLetter(playerPokemon.name)}.`);
    addMessageToServerMessages(`${opponent.username} elige a ${capitalizeFirstLetter(opponentPokemon.name)}.`);

    document.getElementById("beforeBattleShowUser1").hidden = true;
    document.getElementById("beforeBattleShowUser2").hidden = true;
    document.getElementById("inBattleShowUser1").hidden = false;
    document.getElementById("inBattleShowUser2").hidden = false;
});

socket.on('surrender', battleResult => {
    console.log(1);
    createModal(
        "finishedBattleModal",
        "Final de la batalla",
        `La batalla ha concluido. El ganador es ${battleResult.winner}, y el resultado es de ${battleResult.result}`,
        "Aceptar",
        () => document.getElementById("returnToLobbyForm").submit()
    );
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

const selectFirstPokemon = index => {
    const selectPokemonButtons = document.getElementsByClassName("btn-selectPokemonAtStart");
    for(let button of selectPokemonButtons) {
        button.disabled = true;
    }
    socket.emit("select-first-pokemon", { index: index });
}

const surrenderButton = (button) => {
    createModal(
        "surrenderButtonModal",
        "¡Alerta!",
        "¿Está seguro de que quiere rendirse?",
        "Aceptar",
        () => {
            button.disabled = true;
            socket.emit("surrender");
        },
        "Cancelar",
        $(`#surrenderButtonModal`).modal("hide")
    );
}

