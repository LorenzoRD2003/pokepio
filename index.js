const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const fetchFunctions = require('./modulos/fetchFunctions');
const databaseFunctions = require('./modulos/databaseFunctions');
const mathFunctions = require('./modulos/mathFunctions');
const dataArrays = require("./modulos/dataArrays");
const battleFunctions = require("./modulos/battleFunctions");
const credentials = require("./modulos/credentials");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "public/img/profile_photos");
    },
    filename: (req, file, callback) => {
        callback(null, Date.now() + path.extname(file.originalname));
    },
    encoding: null
});
const upload = multer({ storage: storage });
const deleteFileHandler = (err) => {
    (err) ? console.log("No se puedo borrar.", err) : console.log("Se pudo borrar");
}

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
    client.on('chat-message', async data => {
        // Parseo lo que me envio el cliente
        const { ID_Chat, userSender, messageContent } = JSON.parse(data);

        // Hago un objeto mensaje
        const message = {
            userSender: userSender,
            messageContent: messageContent
        }

        // Envio el mensaje al chat (para que les salga a ambos)
        io.to(chat).emit('chat-message', message);

        // Guardo el mensaje en la base de datos
        await databaseFunctions.addMessageToChat(ID_Chat, message);
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

app.get('/', async (req, res) => {
    if (req.session.user) return res.redirect('/home');
    res.render('login', null);
});
app.get('/home', async (req, res) => {
    if (!req.session.user) return res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    res.render('home', { user: req.session.user });
});
app.get('/teambuilder', (req, res) => {
    if (!req.session.user) return res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    res.render('teambuilder', { user: req.session.user, teams: req.session.teams });
});
app.get('/teambuilder/create', (req, res) => {
    if (req.session.user) {
        res.render('createTeam', {
            user: req.session.user,
            pokemonNamesList: dataArrays.pokemonNamesList,
            naturesList: dataArrays.naturesList,
            itemsList: dataArrays.itemsList
        });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});
app.get('/createAccount', (req, res) => {
    req.session.destroy();
    res.render('createAccount', null);
});
app.get('/home/modifyUserData', (req, res) => {
    if (req.session.user) {
        res.render('modifyUserData', {
            user: req.session.user,
            pokemonNamesList: dataArrays.pokemonNamesList
        });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});
app.get('/home/modifyPassword', (req, res) => {
    if (!req.session.user) return res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    res.render('modifyPassword', { user: req.session.user });
});
app.post('/createAccount/create', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const boolUsernameInDB = await databaseFunctions.usernameAlreadyInDatabase(username);
        if (boolUsernameInDB) {
            return res.send({ success: "alreadyExistingUsername" });
        }
        const boolEmailInDB = await databaseFunctions.emailAlreadyInDatabase(email);
        if (boolEmailInDB) {
            return res.send({ success: "alreadyExistingEmail" });
        }
        await databaseFunctions.insertUser(email, username, password)
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.post('/login', async (req, res) => {
    try {
        const { email_or_username, password } = req.body;
        const { user, success } = (email_or_username.search("@") != -1) ?
            await databaseFunctions.loginIntoSystemWithEmail(email_or_username, password) :
            await databaseFunctions.loginIntoSystemWithUsername(email_or_username, password);
        switch (success) {
            case "access":
                req.session.user = user;
                const ID_User = req.session.user.ID_User;
                req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);
                res.redirect('/home');
                break;
            case "wrong-password":
                res.render('login', { error: "La contraseña ingresada es incorrecta." });
                break;
            case "non-existent-email":
                res.render('login', { error: "El email no está registrado." });
                break;
            case "non-existent-username":
                res.render('login', { error: "El nombre de usuario no está registrado." });
                break;
        }
    } catch (err) {
        console.log(err);
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
})
app.put('/home/modifyUserData/modify', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        const { real_name, age, nationality, hobbies, pokemon_favorito } = req.body;
        if (real_name) {
            await databaseFunctions.updateUserData(ID_User, "real_name", real_name);
            req.session.user.real_name = real_name;
        }
        if (age) {
            await databaseFunctions.updateUserData(ID_User, "age", age);
            req.session.user.age = age;
        }
        if (nationality) {
            await databaseFunctions.updateUserData(ID_User, "nationality", nationality);
            req.session.user.nationality = nationality;
        }
        if (hobbies) {
            await databaseFunctions.updateUserData(ID_User, "hobbies", hobbies);
            req.session.user.hobbies = hobbies;
        }
        if (pokemon_favorito) {
            await databaseFunctions.updateUserData(ID_User, "pokemon_favorito", pokemon_favorito);
            req.session.user.pokemon_favorito = pokemon_favorito;
            throw "Hola";
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});
const deleteProfilePhoto = async (ID_User) => {
    const profilePhoto = await databaseFunctions.getProfilePhoto(ID_User);
    fs.unlink(`${__dirname}/public/img/profile_photos/${profilePhoto}`, deleteFileHandler);
}
app.post('/home/uploadProfilePhoto', upload.single('profile_photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.render('home', {
                user: req.session.user,
                teams: req.session.teams,
                error: "Debe ingresar una foto de perfil."
            });
        }
        const ID_User = req.session.user.ID_User;
        await deleteProfilePhoto(ID_User);
        const profilePhoto = req.file.filename;
        await databaseFunctions.updateUserData(ID_User, "profile_photo", profilePhoto);
        req.session.user.profile_photo = profilePhoto;
        res.render('home', { user: req.session.user, teams: req.session.teams });
    } catch (err) {
        console.log(err);
        if (req.session.user) {
            res.render('home', { user: req.session.user, teams: req.session.teams, error: "Ocurrió un error. Inténtelo nuevamente." });
        } else {
            res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
        }
    }
});
app.get('/home/modifyPassword/getOldPassword', (req, res) => {
    const oldPassword = req.session.user.acc_password;
    res.send({ oldPassword: oldPassword });
});
app.put('/home/modifyPassword/update', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const newPassword = req.body.newPassword;
        await databaseFunctions.updateUserData(ID_User, "acc_password", newPassword);
        req.session.user.acc_password = newPassword;
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.post('/teambuilder/create/newTeam', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const team_name = req.body.team_name;

        // Quiero verificar que no tengo otro equipo con el mismo nombre
        const foundTeam = req.session.teams.find(team => team.team_name == team_name);
        if (foundTeam) return res.send({ success: "already-existing-name" });

        await databaseFunctions.createNewTeam(ID_User, team_name);
        req.session.selected_team = await databaseFunctions.selectTeamByUserAndTeamName(ID_User, team_name);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.get('/teambuilder/create/searchPokemonData', async (req, res) => {
    const pokemon = req.query.name;
    const pokemonData = await fetchFunctions.searchPokemonData(pokemon);
    res.send(pokemonData);
});
app.post('/teambuilder/create/addPokemonToTeam', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const ID_Team = req.session.selected_team.ID_Team;
        const pokemon = req.body;
        await databaseFunctions.addPokemonToTeam(ID_Team, pokemon);
        const pokemonAmount = (await databaseFunctions.getPokemonArray(ID_Team)).length;
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);
        return (pokemonAmount == 6) ? res.send({ success: "sixPokemon" }) : res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.delete('/teambuilder/deleteTeam', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const ID_Team = req.body.ID_Team;
        await databaseFunctions.deleteTeam(ID_Team);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.put('/teambuilder/modifyTeamName', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const { ID_Team, newName } = req.body;

        // Verifico que no haya otro equipo con este nombre
        const foundTeam = req.session.teams.find(team => team.team_name == newName && team.ID_Team != ID_Team);
        if (foundTeam) return res.send({ success: "already-existing-name" });

        await databaseFunctions.modifyTeamName(ID_Team, newName);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.delete('/teambuilder/deletePokemon', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const { ID_Team, pokemonNumber } = req.body;
        await databaseFunctions.deletePokemon(ID_Team, pokemonNumber);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.get('/teambuilder/updateSelectedTeamToAddPokemon', async (req, res) => {
    try {
        const ID_User = req.session.user.ID_User;
        const team_name = req.query.team_name;
        req.session.selected_team = await databaseFunctions.selectTeamByUserAndTeamName(ID_User, team_name);
        const pokemonAmount = (await databaseFunctions.getPokemonArray(req.session.selected_team.ID_Team)).length;
        if (pokemonAmount == 6) {
            res.send({ success: "sixPokemon" })
        } else {
            res.send({
                success: "successful",
                pokemonNamesList: dataArrays.pokemonNamesList,
                naturesList: dataArrays.naturesList,
                itemsList: dataArrays.itemsList
            });
        }
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.get('/lobby', async (req, res) => {
    if (!req.session.user) return res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    res.render('lobby', { user: req.session.user, teams: req.session.teams });
});
app.get('/lobby/getChat', async (req, res) => {
    try {
        const other_user = req.query.other_user;
        const ID_User1 = req.session.user.ID_User;
        const ID_User2 = await databaseFunctions.getIDUserByUsername(other_user);
        if (!ID_User1 || !ID_User2) return res.send({ success: "non-existing-users" });
        let chat = await databaseFunctions.getChatByUsers(ID_User1, ID_User2);
        if (!chat) {
            await databaseFunctions.createNewChat(ID_User1, ID_User2);
            chat = await databaseFunctions.getChatByUsers(ID_User1, ID_User2);
        }
        res.send({
            success: "successful",
            userSender: { id: ID_User1, name: req.session.user.username },
            userReceiver: { id: ID_User2, name: other_user },
            ID_Chat: chat.ID_Chat,
            messages: chat.messages_list
        });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.put('/lobby/selectTeam', async (req, res) => {
    try {
        const ID_Team = req.body.ID_Team;
        const team = await databaseFunctions.getTeamByID(ID_Team);
        const battleTeam = team.pokemon.map(pokemon => {
            const pokemonTypes = pokemon.types.map(poketype => dataArrays.allTypes.find(type => poketype.name == type.name));
            const pokemonNature = dataArrays.naturesList.find(nature => nature.name == pokemon.nature);

            const move1 = dataArrays.allMoves.find(move => move.id == pokemon.moves[0]);
            const move2 = dataArrays.allMoves.find(move => move.id == pokemon.moves[1]);
            const move3 = dataArrays.allMoves.find(move => move.id == pokemon.moves[2]);
            const move4 = dataArrays.allMoves.find(move => move.id == pokemon.moves[3]);

            const baseStats = fetchFunctions.getPokemonBaseStats(pokemon.name);
            const hpStat = (pokemon.name != "shedinja") ? mathFunctions.calculateHP(baseStats.hp, pokemon.level, pokemon.ev.hp, pokemon.iv.hp) : 1;
            let natureMultiplier = 1;

            if (pokemonNature.statUp == "attack") natureMultiplier = 1.1;
            if (pokemonNature.statDown == "attack") natureMultiplier = 0.9;
            const atkStat = mathFunctions.calculateStat(baseStats.atk, pokemon.level, pokemon.ev.atk, pokemon.iv.atk, natureMultiplier);

            if (pokemonNature.statUp == "defense") natureMultiplier = 1.1;
            if (pokemonNature.statDown == "defense") natureMultiplier = 0.9;
            const defStat = mathFunctions.calculateStat(baseStats.def, pokemon.level, pokemon.ev.def, pokemon.iv.def, natureMultiplier);

            if (pokemonNature.statUp == "special-attack") natureMultiplier = 1.1;
            if (pokemonNature.statDown == "special-attack") natureMultiplier = 0.9;
            const spaStat = mathFunctions.calculateStat(baseStats.spa, pokemon.level, pokemon.ev.spa, pokemon.iv.spa, natureMultiplier);

            if (pokemonNature.statUp == "special-defense") natureMultiplier = 1.1;
            if (pokemonNature.statDown == "special-defense") natureMultiplier = 0.9;
            const spdStat = mathFunctions.calculateStat(baseStats.spd, pokemon.level, pokemon.ev.spd, pokemon.iv.spd, natureMultiplier);

            if (pokemonNature.statUp == "speed") natureMultiplier = 1.1;
            if (pokemonNature.statDown == "speed") natureMultiplier = 0.9;
            const speStat = mathFunctions.calculateStat(baseStats.spe, pokemon.level, pokemon.ev.spe, pokemon.iv.spe, natureMultiplier);
            return {
                name: pokemon.name,
                types: pokemonTypes,
                level: pokemon.level,
                happiness: pokemon.happiness,
                ability: pokemon.ability,
                item: pokemon.item,
                nature: pokemonNature,
                moves: [
                    move1,
                    move2,
                    move3,
                    move4
                ],
                sprite: pokemon.sprite,
                stats: {
                    hp: {
                        maxHP: hpStat,
                        currentHP: hpStat
                    },
                    atk: {
                        name: "Ataque",
                        baseStat: atkStat,
                        stage: 0
                    },
                    def: {
                        name: "Defensa",
                        baseStat: defStat,
                        stage: 0
                    },
                    spa: {
                        name: "Ataque Especial",
                        baseStat: spaStat,
                        stage: 0
                    },
                    spd: {
                        name: "Defensa Especial",
                        baseStat: spdStat,
                        stage: 0
                    },
                    spe: {
                        name: "Velocidad",
                        baseStat: speStat,
                        stage: 0
                    },
                    acc: {
                        name: "Precisión",
                        stage: 0
                    },
                    eva: {
                        name: "Evasión",
                        stage: 0
                    }
                },
                crit_rate: 0,
                happiness: 255,
                isAlive: true,
                status: "OK",
                otherStatus: {
                    confused: false,
                    flinched: false,
                    hasToRest: false,
                    bounded: false,
                    cursed: false,
                    drowsy: false,
                    encore: false,
                    identified: false,
                    infatuated: false,
                    leech_seed: false,
                    nightmare: false,
                    perish_song: false,
                    taunted: false,
                    tormented: false,
                    bracing: false,
                    charging_turn: false,
                    center_of_attention: false,
                    defense_curl: false,
                    rooting: false,
                    magic_coat: false,
                    minimized: false,
                    protected: false,
                    flying: false,
                    digging: false,
                    diving: false,
                    substitute: false,
                    aiming: false,
                    thrashing: false,
                    transformed: false,
                    safeguard: false
                },
                canChange: true
            }
        });
        req.session.battleTeam = battleTeam;
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
    }
});
app.get('/battle', async (req, res) => {
    if (!req.session.user) return res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    res.render('battle', {
        username: req.session.user.username,
        profile_photo: req.session.user.profile_photo,
        battleTeam: req.session.battleTeam,
        pokemonLeft: req.session.battleTeam.length
    });
});
app.get('/battle/getBattleTeam', async (req, res) => {
    res.send({
        id: req.session.user.ID_User,
        username: req.session.user.username,
        profile_photo: req.session.user.profile_photo,
        battleTeam: req.session.battleTeam,
        activePokemon: null,
        hasPlayed: false,
        chosenAction: null,
        time: {
            timer: null,
            timeLeft: 10000,
            startTime: null,
            endTime: null
        }
    });
});
app.get('/battle/returnLobby', (req, res) => {
    res.redirect('/lobby');
});
