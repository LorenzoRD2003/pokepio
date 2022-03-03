/************************************************
                    Módulos
************************************************/
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const fetchFunctions = require('./modules/fetchFunctions');
const databaseFunctions = require('./modules/databaseFunctions');
const mathFunctions = require('./modules/mathFunctions');
const dataArrays = require("./modules/dataArrays");
const battleFunctions = require("./modules/battleFunctions");
const credentials = require("./modules/credentials");
const { ApiError, api404Handler, apiErrorHandler } = require('./modules/error-handler.js');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(session({
    secret: credentials.sessionSecret,
    resave: true,
    saveUninitialized: true
}));

const LISTEN_PORT = 3000;
const server = app.listen(process.env.PORT || LISTEN_PORT, () => console.log('Servidor NodeJS corriendo.'));

/************************************************
                    WebSockets
************************************************/
const io = require('socket.io')(server);

// Inicio todas las batallas
const allBattles = new Array(100);
for (let i = 0; i < allBattles.length; i++) {
    allBattles[i] = {
        players: 0,
        id: null,
        room: null,
        user1: null,
        user2: null,
        result: "",
        activeTimer: false,
        weather: null
    };
}
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
        // Busco una batalla, con menos de dos usuarios, y que el primer usuario no sea el segundo
        battle = allBattles.find(battle => {
            if (battle.user1) {
                return battle.players < 2 && battle.user1.username != user.username
            } else {
                return battle.players < 2;
            }
        });

        // Sumo un jugador al numero de jugadores de la batalla
        battle.players++;

        // Si no se unió ningún usuario aún
        if (!battle.user1) {
            // Creo el id de la batalla (para base de datos)
            battle.id = await databaseFunctions.createBattle(user.id);

            // Creo la sala de la batalla
            battle.room = `Battle-${battle.id}`;

            // El cliente se une a la sala
            client.join(battle.room);

            // Asigno el primer usuario
            battle.user1 = user;

            // player siempre hace referencia al cliente que está enviando datos
            player = battle.user1;
        } else if (!battle.user2) {
            // El cliente se une a la sala
            client.join(battle.room);

            // Asigno el segundo usuario
            battle.user2 = user;
            player = battle.user2;

            // opponent siempre hace referencia al cliente que no está enviando datos
            opponent = battle.user1;

            // Envío a los clientes el inicio de la batalla
            io.to(battle.room).emit('start-battle', battle);

            // Añado el segundo usuario a la batalla en la base de datos
            await databaseFunctions.addSecondUserToBattle(battle.id, user.id);
        }
    });

    // El primer cliente necesita que asigne como oponente al segundo cliente
    client.on('opponent-confirm', () => {
        if (!opponent) opponent = battle.user2;
    });

    // player es el que clickea el botón, opponent es el otro
    client.on('start-counter', () => {
        // El booleano del contador queda en true
        battle.activeTimer = true;

        // Tomo un momento para iniciar el contador
        const startTime = new Date();

        // Si el jugador aún no jugó
        if (!player.hasPlayed) {
            // Le asigno al jugador este tiempo
            player.time.startTime = startTime;

            // Hago un setTimeout, para que, si se termina el tiempo, el jugador pierda la batalla
            player.time.timer = setTimeout(async () => {
                io.to(battle.room).emit('finished-timeout', player.username);
                await finishBattle(battle, opponent, player); // Gana opponent
            }, player.time.timeLeft); // Tiempo restante player
        }

        // Si el oponente aún no jugó
        if (!opponent.hasPlayed) {
            // Le asigno al oponente este tiempo
            opponent.time.startTime = startTime;

            // Hago un setTimeout, para que, si se termina el tiempo, el oponente pierda la batalla
            opponent.time.timer = setTimeout(async () => {
                io.to(battle.room).emit('finished-timeout', opponent.username);
                await finishBattle(battle, player, opponent); // Gana player
            }, opponent.time.timeLeft); // Tiempo restante opponent
        }

        // Envío el mensaje de que se inició el contador
        io.to(battle.room).emit('started-timeout');
    });

    // Pauso el contador de tiempo de un jugador
    const pauseCounter = player => {
        // Si en algún momento se inició su contador
        if (player.time.startTime) {
            // Tomo el tiempo en el que se pausa el contador
            player.time.endTime = new Date();

            // El tiempo restante del jugador es la diferencia entre el tiempo inicial y el tiempo final
            player.time.timeLeft -= player.time.endTime - player.time.startTime;

            // Limpio el contador
            clearTimeout(player.time.timer);
        }
    }

    // Cuando tengo que resumir el contador de un jugador
    const resumeCounter = (battle, player, opponent) => {
        // Si el contador está activo
        if (battle.activeTimer) {
            // Asigno un tiempo inicial para resumir
            player.time.startTime = new Date();

            // Hago un setTimeout, para que, si se termina el tiempo, el jugador pierda la batalla
            player.time.timer = setTimeout(async () => {
                io.to(battle.room).emit('finished-timeout', player.username);
                await finishBattle(battle, opponent, player); // Gana opponent
            }, player.time.timeLeft); // Tiempo restante player

            // Envio a los clientes el tiempo restante del jugador
            io.to(battle.room).emit('resumed-timeout', player.username, player.time.timeLeft);
        }
    }

    // Cuando un jugador selecciona el primer Pokemon, pasa un indice
    client.on('select-first-pokemon', async index => {
        player.hasPlayed = true;
        pauseCounter(player);

        // Asigno el Pokémon activo del jugador
        player.activePokemon = player.battleTeam[index];

        // Si jugaron ambos
        if (player.hasPlayed && opponent.hasPlayed) {
            // Ahora deben jugar nuevamente
            player.hasPlayed = false;
            opponent.hasPlayed = false;

            // Envío el estado de la batalla necesaria a los clientes
            io.to(battle.room).emit('select-first-pokemon', battle);

            // Resumo los contadores de tiempo de ambos clientes
            resumeCounter(battle, player, opponent);
            resumeCounter(battle, opponent, player);
        }
    });

    // Cuando un jugador realiza una acción en un turno
    client.on('select-turn-action', async action => {
        player.hasPlayed = true;
        pauseCounter(player);

        // Asigno la accion
        player.chosenAction = action;

        // Si jugaron ambos
        if (player.hasPlayed && opponent.hasPlayed) {
            // Ahora deben jugar nuevamente
            player.hasPlayed = false;
            opponent.hasPlayed = false;

            // Inicio el vector de mensajes de chat del servidor
            let turnMessages = [];

            // Si la acción del jugador se ejecuta antes que la del oponente
            if (battleFunctions.whoActsFirst(player, opponent)) {
                // Uso la acción del jugador
                battleFunctions.useAction(player, opponent, player.chosenAction, turnMessages, battle.weather);

                // Envío el resultado de la acción al servidor
                io.to(battle.room).emit('action-result', battle, turnMessages);

                turnMessages = [];
                // Si el Pokémon del oponente está vivo
                if (opponent.activePokemon.isAlive) {
                    // Espero unos segundos
                    await mathFunctions.sleep(2500);

                    // Uso la acción del oponente
                    battleFunctions.useAction(opponent, player, opponent.chosenAction, turnMessages, battle.weather);

                    // Envío el resultado de la acción al servidor
                    io.to(battle.room).emit('action-result', battle, turnMessages);
                }
            } else {
                // Uso la acción del oponente
                battleFunctions.useAction(opponent, player, opponent.chosenAction, turnMessages, battle.weather);
                io.to(battle.room).emit('action-result', battle, turnMessages);

                turnMessages = [];
                // Si el Pokémon del jugador está vivo
                if (player.activePokemon.isAlive) {
                    // Espero unos segundos
                    await mathFunctions.sleep(2500);

                    // Uso la acción del jugador
                    battleFunctions.useAction(player, opponent, player.chosenAction, turnMessages, battle.weather);

                    // Envío el resultado de la acción al servidor
                    io.to(battle.room).emit('action-result', battle, turnMessages);
                }
            }

            // Envío el estado al final del turno al servidor
            io.to(battle.room).emit('finished-turn', battle);

            // Reinicio el contador para ambos usuarios
            resumeCounter(battle, player, opponent);
            resumeCounter(battle, opponent, player);
        }
    });

    // Funcion de terminar la batalla (con ganador/perdedor)
    const finishBattle = async (battle, winner, loser) => {
        // El resultado es la cantidad de Pokémon que les quedan a c/u
        battle.result = `${winner.battleTeam.length} - ${loser.battleTeam.length}`;

        // Envío mensaje a los clientes con el ganador y el resultado
        io.to(battle.room).emit('battle-end', {
            winner: winner.username,
            result: battle.result
        });

        // Pongo los resultados en la base de datos
        await databaseFunctions.setBattleResults(battle.id, winner.username, loser.username, battle.result);

        // Reinicio la batalla
        battleFunctions.resetBattle(battle);
    }

    // Para el botón de rendirse, simplemente termino la batalla
    client.on('surrender', async () => await finishBattle(battle, opponent, player));

    // Para las desconexiones
    client.on('disconnect', async () => {
        // Si estoy en una batalla (porque puedo estar en un chat y no en una batalla)
        if (battle) {
            // Si se unió un segundo usuario, termino la batalla como siempre, de otro modo la borro de la base de datos
            (battle.user2) ? await finishBattle(battle, opponent, player) : await databaseFunctions.deleteBattle(battle.id);

            // Reinicio el objeto de la batalla para liberarlo para futuros combates
            battleFunctions.resetBattle(battle);
        }
    });
});


// Middleware para verificar que hice login
app.use((req, res, next) => {
    // Verifico que no sea una petición AJAX, que no esté el req.session.user y que no esté haciendo login
    req.mustLogin = (!req.xhr && !req.session.user && req.url !== "/account/login");
    next();
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

// Al final de todo, usamos el errorHandler
app.use(apiErrorHandler);

// Si no fue con ninguna de las URL, es error 404
app.use(api404Handler);
