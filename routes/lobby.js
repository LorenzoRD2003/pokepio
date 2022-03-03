const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");

const express = require("express");
const router = new express.Router();

router.get('/', (req, res, next) => {
    try {
        if (req.mustLogin)
            return next(ApiError.unauthorizedError("Debe iniciar sesión para poder entrar a esta página."));

        res.render('lobby', {
            user: req.session.user,
            teams: req.session.teams
        });
    } catch (err) {
        return next(ApiError.badRequestError(err.message));
    }
});

router.get('/chat', async (req, res, next) => {
    try {
        const other_user = req.query.other_user;
        if (!other_user)
            return next(ApiError.badRequestError("No ingresó ningún usuario."));

        const ID_User1 = req.session.user.ID_User;
        const this_user = req.session.user.username;
        if (!ID_User1 || !this_user)
            return next(ApiError.internalServerError("Error de sesión."));

        if (this_user == other_user)
            return next(ApiError.badRequestError("No puede iniciar un chat con usted mismo."));

        const ID_User2 = await databaseFunctions.getIDUserByUsername(other_user);
        if (!ID_User2)
            return next(ApiError.badRequestError("El usuario que ingresó no existe."));

        // Obtengo un chat entre los usuarios. Si no existe, lo creo
        let chat = await databaseFunctions.getChatByUsers(ID_User1, ID_User2);
        if (!chat) {
            await databaseFunctions.createNewChat(ID_User1, ID_User2);
            chat = await databaseFunctions.getChatByUsers(ID_User1, ID_User2);
        }

        res.send({
            userSender: { id: ID_User1, name: req.session.user.username },
            userReceiver: { id: ID_User2, name: other_user },
            ID_Chat: chat.ID_Chat,
            messages: chat.messages_list
        });
    } catch (err) {
        return next(ApiError.internalServerError(err.message));
    }
});

router.get('/team', async (req, res, next) => {
    try {
        const ID_Team = req.query.ID_Team;
        if (!ID_Team)
            return next(ApiError.badRequestError("Hubo un error con el equipo ingresado."));

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
        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

module.exports = router;
