/************************************************
                    Módulos
************************************************/
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const databaseFunctions = require('./modules/databaseFunctions');
const mathFunctions = require('./modules/mathFunctions');
const credentials = require("./modules/credentials");
const { ApiError, api404Handler, apiErrorHandler } = require('./modules/error-handler.js');
const session = require('express-session');
const { Battle } = require("./modules/pokemon-logic/battle.js");

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(session({
    secret: credentials.sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: {
        expires: 5 * 60000 // La sesión expira luego de 5 minutos
    }
}));

const LISTEN_PORT = 3000;
const server = app.listen(process.env.PORT || LISTEN_PORT, () => console.log('Servidor NodeJS corriendo.'));

// Al abrir el servidor, pongo todos los usuarios en offline
(async () => await databaseFunctions.setAllUsersOffline())();

/************************************************
                    WebSockets
************************************************/
const io = require('socket.io')(server);

// Inicio los objetos de todas las batallas
const allBattles = new Array(100);
for (let i = 0; i < allBattles.length; i++)
    allBattles[i] = new Battle(io);

io.on('connection', client => {
    let chat = null;
    let battle = null;

    let player, opponent;

    // Unirse a un chat
    client.on('join-chat', data => {
        // Si ya estoy en un chat, salgo de ese chat
        if (chat) client.leave(chat);

        // Me uno al chat
        chat = `Chat-${data.ID_Chat}`;
        client.join(chat);
    });

    // Cuando se envia un mensaje de chat
    client.on('chat-message', async msg => {
        // Envio el mensaje al chat (para que les salga a ambos)
        io.to(chat).emit('chat-message', msg);

        // Guardo el mensaje en la base de datos
        await databaseFunctions.addMessageToChat(msg.ID_Chat, msg);
    });

    // Unirse a una batalla
    client.on('join-battle', async user => {
        battle = allBattles.find(battle => battle.isAvailable(user.username));

        const number = await battle.addUser(user);

        // El cliente se une a la sala de la batalla
        client.join(battle.room);

        // player es el cliente que esta enviando datos, opponent es el otro cliente de la sala
        if (number == 1)
            player = battle.user1;
        else if (number == 2) {
            player = battle.user2;
            opponent = battle.user1;

            // Envío a los clientes el inicio de la batalla
            battle.startBattle();
        }
    });

    // El primer cliente necesita que asigne como oponente al segundo cliente
    client.on('opponent-confirm', () => {
        if (!opponent)
            opponent = battle.user2;
    });

    // player es el que clickea el botón, opponent es el otro
    client.on('start-counter', () => battle.startCounter(player, opponent));

    // Cuando un jugador selecciona el primer Pokemon, pasa un indice
    client.on('select-pokemon', index => battle.selectPokemon(index, player, opponent));

    // Cuando un jugador realiza una acción en un turno
    client.on('select-turn-action', async action => await battle.turnAction(action, player, opponent));

    // Para el botón de rendirse, simplemente termino la batalla
    client.on('surrender', async () => await battle.finishBattle(opponent, player));

    // Para las desconexiones
    client.on('disconnect', async () => {
        // Si estoy en una batalla (porque puedo estar en un chat y no en una batalla)
        if (battle) {
            // Si se unió un segundo usuario, termino la batalla como siempre, de otro modo la borro de la base de datos
            (battle.user2) ? await battle.finishBattle(opponent, player) : await databaseFunctions.deleteBattle(battle.id);

            // Reinicio el objeto de la batalla para liberarlo para futuros combates
            battle.resetBattle();
        }
    });
});


// Middleware para verificar que hice login
app.use((req, res, next) => {
    // Lista de URL que no hace falta iniciar sesión
    const urlList = ["/", "/account/login", "/account/create", "/home/logout"];

    // Verifico que el usuario esté online y que no esté en la lista
    if (req.session.user && !urlList.includes(req.url))
        next(ApiError.unauthorizedError("Debe iniciar sesión para poder entrar a esta página."));
    else
        next();
});

// Redirecciona segun si inicié sesión o no
app.get("/", async (req, res, next) => {
    try {
        // Si la sesión está iniciada, ir a /home
        if (req.session.user)
            return res.redirect('/home');

        // De otro modo, ir a /account/login
        res.redirect('/account/login');
    } catch (err) {
        next(ApiError.badRequestError(err.message));
    }
});

/************************************************
                Routers Express
************************************************/
const accountRouter = require("./routes/account.js");
app.use("/account", accountRouter);

const battleRouter = require("./routes/battle.js");
app.use("/battle", battleRouter);

const homeRouter = require("./routes/home.js");
app.use("/home", homeRouter);

const lobbyRouter = require("./routes/lobby.js");
app.use("/lobby", lobbyRouter);

const teambuilderRouter = require("./routes/teambuilder.js");
app.use("/teambuilder", teambuilderRouter);


// Al final de todo, usamos el errorHandler
app.use(apiErrorHandler);

// Si no fue con ninguna de las URL, es error 404
app.use(api404Handler);
