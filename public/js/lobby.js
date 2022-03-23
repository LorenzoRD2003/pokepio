const selectTeam = document.getElementById("selectTeamID");
selectTeam.addEventListener("change", async () => {
    // Si es la primera opción, salgo de la función
    if (selectTeam.selectedIndex == 0) return;

    // Desctivo el link de buscar batalla
    const searchCombatButton = document.getElementById("searchCombatButton");
    searchCombatButton.classList.add("disabled");

    // Hago un pedido al servidor para seleccionar el equipo
    try {
        await nodeReq({
            method: "get",
            url: "/lobby/team",
            params: {
                ID_Team: selectTeam.value
            }
        });

        // Activo el link de buscar batalla
        searchCombatButton.classList.remove("disabled");
    } catch (err) {
        handleAxiosError(err);
    }
});


// Chat WebSocket
const socket = io();
socket.on('connect', () => {
    console.log("Conectado al sistema de chat");
});

// Recibir un mensaje
socket.on('chat-message', message => {
    const messagesDiv = document.getElementById("messagesDiv");
    const option = document.createElement("li");

    // Agrego un nuevo mensaje al chat
    option.innerHTML = `<b>${message.sender}:</b> ${message.content}`;
    messagesDiv.append(option);

    // Si fue este cliente el que envió, entonces se le vacía el cuadro de texto para escribir mensajes
    if (chatDiv.dataset.userSender == message.sender)
        document.getElementById("messageToSend").value = "";
});

const other_user = document.getElementById("other-user");
const connectedUsers = document.querySelectorAll(".connected-user");
connectedUsers.forEach(connectedUser => {
    connectedUser.addEventListener("click", () => {
        connectedUsers.forEach(connectedUser => connectedUser.classList.remove("active"));
        connectedUser.classList.add("active");
        other_user.value = connectedUser.textContent;
    });
});

const createChatButton = document.getElementById("createChatButton");
createChatButton.addEventListener("click", async () => {
    createChatButton.disabled = true;

    // Escondo el <div> del chat
    const chatDiv = document.getElementById("chatDiv");
    chatDiv.hidden = true;

    // Hago el pedido al servidor
    try {
        const res = (await nodeReq({
            method: "get",
            url: "/lobby/chat",
            params: {
                other_user: other_user.value
            }
        })).data;

        console.log(res);

        // Vacío la lista de mensajes
        const messagesDiv = document.getElementById("messagesDiv");
        messagesDiv.innerHTML = "";

        // Guardo los parámetros como atributos de datos
        const chatDiv = document.getElementById("chatDiv");
        chatDiv.dataset.chatID = res.ID_Chat;
        chatDiv.dataset.userSender = res.userSender.name;

        // Cambio el título del chat
        const chatName = document.getElementById("chatName");
        chatName.innerText = `Chat entre ${res.userSender.name} y ${res.userReceiver.name}`;

        // Añado los mensajes a la lista de mensajes
        if (res.messages) {
            res.messages.forEach(message => {
                const option = document.createElement("li");
                option.innerHTML = `<b>${message.sender}:</b> ${message.content}`;
                messagesDiv.append(option);
            });
        }

        // Envío una señal al servidor de que me conecté al chat
        socket.emit('join-chat', { ID_Chat: res.ID_Chat });

        // Muestro el <div> del chat
        chatDiv.hidden = false;
    } catch(err) {
        handleAxiosError(err);
    } finally {
        createChatButton.disabled = false;
    }
});

const sendMessageButton = document.getElementById("sendMessageButton");
sendMessageButton.addEventListener("click", () => {
    const chatDiv = document.getElementById("chatDiv");
    const message = {
        content: getValueByID("messageToSend"),
        ID_Chat: chatDiv.dataset.chatID,
        sender: chatDiv.dataset.userSender
    }

    if (message.content == "")
        return createErrorModal("errorModal", "No puede enviar un mensaje vacío.");

    socket.emit("chat-message", message);
});
