const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");
const { allMoves, allTypes, naturesList } = require("../modules/dataArrays");
const fetchFunctions = require('../modules/fetchFunctions');
const { Pokemon } = require('../modules/pokemon-logic/pokemon.js');
const { Move } = require('../modules/pokemon-logic/move.js');

const express = require("express");
const router = new express.Router();

router.get('/', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        if (!ID_User)
        return next(ApiError.internalServerError("Error de sesión."));

        // Lista de otros usuarios conectados
        const onlineUsers = await databaseFunctions.getOnlineUsers(ID_User);

        res.render('lobby', {
            user: req.session.user,
            teams: req.session.teams,
            onlineUsers: onlineUsers
        });
    } catch (err) {
        return next(ApiError.internalServerError(err.message));
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
        const battle_team = team.pokemon.map(pokemon => {
            const pokemonTypes = pokemon.types.map(poketype => allTypes.find(type => poketype.name == type.name));
            const pokemonNature = naturesList.find(nature => nature.name == pokemon.nature);
            const baseStats = fetchFunctions.getPokemonBaseStats(pokemon.name);

            const move1 = allMoves.find(move => move.id == pokemon.moves[0]);
            const move2 = allMoves.find(move => move.id == pokemon.moves[1]);
            const move3 = allMoves.find(move => move.id == pokemon.moves[2]);
            const move4 = allMoves.find(move => move.id == pokemon.moves[3]);

            return new Pokemon(
                pokemon.name,
                pokemonTypes,
                pokemon.level,
                pokemon.happiness,
                pokemon.ability,
                pokemon.item,
                pokemonNature,
                [
                    new Move(move1.name, move1.power, move1.type, move1.pp, move1.accuracy, move1.priority, move1.damage_class, move1.effect_chance, move1.meta.crit_rate),
                    new Move(move2.name, move2.power, move2.type, move2.pp, move2.accuracy, move2.priority, move2.damage_class, move2.effect_chance, move2.meta.crit_rate),
                    new Move(move3.name, move3.power, move3.type, move3.pp, move3.accuracy, move3.priority, move3.damage_class, move3.effect_chance, move3.meta.crit_rate),
                    new Move(move4.name, move4.power, move4.type, move4.pp, move4.accuracy, move4.priority, move4.damage_class, move4.effect_chance, move4.meta.crit_rate)
                ],
                pokemon.sprite,
                baseStats,
                pokemon.ev,
                pokemon.iv
            );
        });

        req.session.battle_team = battle_team;
        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

module.exports = router;
