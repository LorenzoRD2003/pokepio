const express = require('express'); //Para el manejo del servidor Web
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const fetchFunctions = require('./modulos/fetchFunctions');
const databaseFunctions = require('./modulos/databaseFunctions');
const mathFunctions = require('./modulos/mathFunctions');
const dataArrays = require("./modulos/dataArrays");
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
app.use(session({ secret: 'adfsadsafdsafjhbsdfahbjfjhfhewqfwebjhfqjhwqefjhefwqjwefqjefwqwqf', resave: true, saveUninitialized: true }));

const LISTEN_PORT = 3000;
const server = app.listen(process.env.PORT || LISTEN_PORT, () => console.log('Servidor NodeJS corriendo.'));

const io = require('socket.io')(server);
const allBattles = new Array(100);
for (let i = 0; i < allBattles.length; i++) {
    allBattles[i] = {
        players: 0,
        dbID: null,
        user1: null,
        user2: null,
        result: ""
    };
}
io.on('connection', client => {
    let connectedToChat = "";
    let connectedToBattle = "";

    client.on('join-chat', data => {
        if (connectedToChat) {
            client.leave(connectedToChat);
        }
        const chatID = `${data.ID_Chat}`;
        connectedToChat = chatID;
        client.join(chatID);
        io.to(chatID).emit('join-chat', null);
    });

    client.on('chat-message', async data => {
        const { ID_Chat, userSender, messageContent } = JSON.parse(data);
        const message = {
            userSender: userSender,
            messageContent: messageContent
        }
        io.to(`${ID_Chat}`).emit('chat-message', message);
        await databaseFunctions.addMessageToChat(ID_Chat, message);
    });

    client.on('join-battle', async data => {
        const foundBattle = allBattles.find(battle => battle.players < 2);
        foundBattle.players++;
        console.log(client.rooms);
        if (!foundBattle.user1) {
            foundBattle.dbID = await databaseFunctions.createBattle(data.id);
            const battleID = `B${foundBattle.dbID}`;
            connectedToBattle = battleID;
            client.join(battleID);
            foundBattle.user1 = data;
        } else if (!foundBattle.user2) {
            await databaseFunctions.addSecondUserToBattle(foundBattle.dbID, data.id);
            const battleID = `B${foundBattle.dbID}`;
            connectedToBattle = battleID;
            client.join(battleID);
            foundBattle.user2 = data;
            io.to(battleID).emit('start-battle', foundBattle);
        }
    });

    client.on('select-first-pokemon', async data => {
        const foundBattle = allBattles.find(battle => data.battleID == battle.dbID);
        if (data.username == foundBattle.user1.username) {
            foundBattle.user1.hasPlayed = true;
            foundBattle.user1.currentPokemonIndex = data.index;
        } else {
            foundBattle.user2.hasPlayed = true;
            foundBattle.user2.currentPokemonIndex = data.index;
        }
        if (foundBattle.user1.hasPlayed && foundBattle.user2.hasPlayed) {
            foundBattle.user1.hasPlayed = false;
            foundBattle.user2.hasPlayed = false;
            const battleID = `B${foundBattle.dbID}`;
            io.to(battleID).emit('select-first-pokemon', foundBattle);
        }
    });

    client.on('surrender', async data => {
        let foundBattle = allBattles.find(battle => data.battleID == battle.dbID);
        let winner, loser, result;
        if (data.username == foundBattle.user1.username) {
            winner = foundBattle.user2.username;
            loser = foundBattle.user1.username;
            result = `${foundBattle.user2.battleTeam.length} - ${foundBattle.user1.battleTeam.length}`;
        } else {
            winner = foundBattle.user1.username;
            loser = foundBattle.user2.username;
            result = `${foundBattle.user1.battleTeam.length} - ${foundBattle.user2.battleTeam.length}`;
        }
        await databaseFunctions.finishBattle(foundBattle.dbID, winner, loser, result);
        const battleID = `B${foundBattle.dbID}`;
        foundBattle = {
            players: 0,
            dbID: null,
            user1: null,
            user2: null,
            result: ""
        };
        io.to(battleID).emit('surrender', {
            winner: winner,
            result: result
        });
    });

    client.on('disconnect', () => {
        connectedToChat = "";
        connectedToBattle = "";
    })
});

app.get('/', async (req, res) => {
    req.session.destroy();
    res.render('login', null);
});
app.get('/home', async (req, res) => {
    if (req.session.user) {
        res.render('home', { user: req.session.user, teams: req.session.teams });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});
app.get('/teambuilder', (req, res) => {
    if (req.session.user) {
        res.render('teambuilder', { user: req.session.user, teams: req.session.teams });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});
app.get('/teambuilder/create', (req, res) => {
    if (req.session.user) {
        res.render('createTeam', {
            user: req.session.user,
            pokemonList: dataArrays.pokemonList,
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
            pokemonList: dataArrays.pokemonList
        });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});
app.get('/home/modifyPassword', (req, res) => {
    if (req.session.user) {
        res.render('modifyPassword', { user: req.session.user });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
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
                pokemonList: dataArrays.pokemonList,
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
    if (req.session.user) {
        res.render('lobby', { user: req.session.user, teams: req.session.teams });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
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
    const battleTeam = await Promise.all(team.pokemon.map(async pokemon => {
        const pokemonTypes = pokemon.types.map(poketype => {
            dataArrays.allTypes.find(type => poketype.name == type.name);
        });
        const pokemonNature = dataArrays.naturesList.find(nature => nature.name == pokemon.nature);

        const move1 = dataArrays.allMoves.find(move => move.id == pokemon.moves[0]);
        const move2 = dataArrays.allMoves.find(move => move.id == pokemon.moves[1]);
        const move3 = dataArrays.allMoves.find(move => move.id == pokemon.moves[2]);
        const move4 = dataArrays.allMoves.find(move => move.id == pokemon.moves[3]);

        const baseStats = await fetchFunctions.getPokemonBaseStats(pokemon.name);
        const hpStat = mathFunctions.calculateHP(baseStats.hp, pokemon.ev.hp, pokemon.iv.hp);
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
                prec: {
                    baseStat: 100,
                    multiplier: 1
                },
                eva: {
                    baseStat: 100,
                    multiplier: 1
                }
            },
            isAlive: true,
            status: null,
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
    }));
    req.session.battleTeam = battleTeam;
    res.send(null);
});

app.get('/battle', async (req, res) => {
    if (req.session.user) {
        res.render('battle', {
            username: req.session.user.username,
            profile_photo: req.session.user.profile_photo,
            battleTeam: req.session.battleTeam,
            pokemonLeft: req.session.battleTeam.length
        });
    } else {
        res.render('login', { error: "Ocurrió un error. Inténtelo nuevamente." });
    }
});

app.get('/battle/getBattleTeam', async (req, res) => {
    res.send({
        id: req.session.user.ID_User,
        username: req.session.user.username,
        profile_photo: req.session.user.profile_photo,
        battleTeam: req.session.battleTeam,
        currentPokemonIndex: "no-pokemon-selected",
        hasPlayed: false,
        timeLeft: 120
    });
});
