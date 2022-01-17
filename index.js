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
const allBattles = new Array(100);
for (let i = 0; i < allBattles.length; i++) {
    allBattles[i] = {
        players: 0,
        id: null,
        room: null,
        user1: null,
        user2: null,
        result: "",
        activeTimer: false
    };
}
io.on('connection', client => {
    let chat = null;
    let battle = null;

    let player, opponent;

    client.on('join-chat', data => {
        if (chat) client.leave(chat);
        chat = `Chat-${data.ID_Chat}`;
        client.join(chat);
        io.to(chat).emit('join-chat', null);
    });
    client.on('chat-message', async data => {
        const { ID_Chat, userSender, messageContent } = JSON.parse(data);
        const message = {
            userSender: userSender,
            messageContent: messageContent
        }
        io.to(chat).emit('chat-message', message);
        await databaseFunctions.addMessageToChat(ID_Chat, message);
    });

    client.on('join-battle', async user => {
        battle = allBattles.find(battle => battle.user1 ? battle.players < 2 && battle.user1.username != user.username : battle.players < 2);
        battle.players++;
        if (!battle.user1) {
            battle.room = `Battle-${battle.id}`;
            client.join(battle.room);
            battle.user1 = user;
            player = battle.user1;
            opponent = battle.user2;
            battle.id = await databaseFunctions.createBattle(user.id);
        } else if (!battle.user2) {
            client.join(battle.room);
            battle.user2 = user;
            player = battle.user2;
            opponent = battle.user1;
            io.to(battle.room).emit('start-battle', battle);
            await databaseFunctions.addSecondUserToBattle(battle.id, user.id);
        }
    });
    client.on('opponent-confirm', () => {
        if (!opponent) opponent = battle.user2;
    });
    const startCounter = (battleRoom, player, opponent) => {
        const startTime = new Date();
        if (!player.hasPlayed) {
            player.time.startTime = startTime;
            player.time.timer = setTimeout(async () => {
                io.to(battleRoom).emit('finished-timeout', player.username);
                await finishBattle(battle, opponent, player);
            }, player.time.timeLeft);
        }
        if (!opponent.hasPlayed) {
            opponent.time.startTime = startTime;
            opponent.time.timer = setTimeout(async () => {
                io.to(battleRoom).emit('finished-timeout', opponent.username);
                await finishBattle(battle, player, opponent);
            }, opponent.time.timeLeft);
        }
    }
    const pauseCounter = player => {
        player.time.endTime = new Date();
        player.time.timeLeft -= player.time.endTime - player.time.startTime;
        clearTimeout(player.time.timer);
    }
    client.on('start-counter', () => {
        battle.activeTimer = true;
        startCounter(battle.room, player, opponent);
        io.to(battle.room).emit('started-timeout');
    });
    client.on('pause-timeout', () => {
        if (player.time.startTime) pauseCounter(player);
    });
    client.on('select-first-pokemon', async index => {
        player.hasPlayed = true;
        player.activePokemon = player.battleTeam[index];
        if (player.hasPlayed && opponent.hasPlayed) {
            player.hasPlayed = false;
            opponent.hasPlayed = false;
            io.to(battle.room).emit('select-first-pokemon', battle);
            if (battle.activeTimer) {
                startCounter(battle.room, player, opponent);
                io.to(battle.room).emit('resumed-timeout', player.username, opponent.username, player.time.timeLeft, opponent.time.timeLeft);
            }
        }
    });
    client.on('select-turn-action', async action => {
        player.hasPlayed = true;
        player.chosenAction = action;
        if (player.hasPlayed && opponent.hasPlayed) {
            player.hasPlayed = false;
            opponent.hasPlayed = false;
            const actionResult = battleFunctions.whoActsFirst(player, opponent) ?
                battleFunctions.useAction(player, opponent, player.chosenAction) :
                battleFunctions.useAction(opponent, player, opponent.chosenAction);
            // io.to(battle.room).emit('action-result', actionResult);
        }
    });

    const finishBattle = async (battle, winner, loser) => {
        battle.result = `${winner.battleTeam.length} - ${loser.battleTeam.length}`;
        io.to(battle.room).emit('battle-end', {
            winner: winner.username,
            result: battle.result
        });
        await databaseFunctions.setBattleResults(battle.id, winner.username, loser.username, battle.result);
        battleFunctions.resetBattle(battle);
    }
    client.on('surrender', async () => await finishBattle(battle, opponent, player));
    client.on('disconnect', async () => {
        chat = null;
        if (battle) {
            (battle.user2) ? await finishBattle(battle, opponent, player) : battleFunctions.resetBattle(battle);
        }
    });
});

app.get('/', async (req, res) => {
    if (req.session.user) return res.redirect('/home');
    res.render('login', null);
});
app.get('/home', async (req, res) => {
    if (!req.session.user) return res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    res.render('home', { user: req.session.user, teams: req.session.teams });
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
app.put('/home/modifyUserData/modify', async (req, res) => {
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
        }
        res.send({ success: "successful" });
    } catch (err) {
        console.log(err);
        res.send({ success: "error" });
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
        await databaseFunctions.modifyTeamName(ID_Team, newName)
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
        const hpStat = (pokemon.name != "shedinja") ? mathFunctions.calculateHP(baseStats.hp, pokemon.ev.hp, pokemon.iv.hp) : 1;
        let natureMultiplier = 1;

        if (pokemonNature.statUp == "attack") natureMultiplier = 1.1;
        if (pokemonNature.statDown == "attack") natureMultiplier = 0.9;
        const atkStat = mathFunctions.calculateStat(baseStats.atk, pokemon.ev.atk, pokemon.iv.atk, natureMultiplier);

        if (pokemonNature.statUp == "defense") natureMultiplier = 1.1;
        if (pokemonNature.statDown == "defense") natureMultiplier = 0.9;
        const defStat = mathFunctions.calculateStat(baseStats.def, pokemon.ev.def, pokemon.iv.def, natureMultiplier);

        if (pokemonNature.statUp == "special-attack") natureMultiplier = 1.1;
        if (pokemonNature.statDown == "special-attack") natureMultiplier = 0.9;
        const spaStat = mathFunctions.calculateStat(baseStats.spa, pokemon.ev.spa, pokemon.iv.spa, natureMultiplier);

        if (pokemonNature.statUp == "special-defense") natureMultiplier = 1.1;
        if (pokemonNature.statDown == "special-defense") natureMultiplier = 0.9;
        const spdStat = mathFunctions.calculateStat(baseStats.spd, pokemon.ev.spd, pokemon.iv.spd, natureMultiplier);

        if (pokemonNature.statUp == "speed") natureMultiplier = 1.1;
        if (pokemonNature.statDown == "speed") natureMultiplier = 0.9;
        const speStat = mathFunctions.calculateStat(baseStats.spe, pokemon.ev.spe, pokemon.iv.spe, natureMultiplier);
        return {
            name: pokemon.name,
            level: 100,
            types: pokemonTypes,
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
                    baseStat: atkStat,
                    multiplier: 1
                },
                def: {
                    baseStat: defStat,
                    multiplier: 1
                },
                spa: {
                    baseStat: spaStat,
                    multiplier: 1
                },
                spd: {
                    baseStat: spdStat,
                    multiplier: 1
                },
                spe: {
                    baseStat: speStat,
                    multiplier: 1
                },
                acc: {
                    baseStat: 100,
                    multiplier: 1
                },
                eva: {
                    baseStat: 100,
                    multiplier: 1
                }
            },
            isAlive: true,
            status: "OK",
            otherStatus: {
                confused: false,
                flinched: false,
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
                transformed: false
            },
            canChange: true
        }
    });
    req.session.battleTeam = battleTeam;
    res.send(null);
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
            timeLeft: 120000,
            startTime: null,
            endTime: null
        }
    });
});
app.get('/battle/returnLobby', (req, res) => {
    res.redirect('/lobby');
});
