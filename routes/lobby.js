const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");

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

        const battle_team = req.session.teams.find(team => team.ID_Team == ID_Team);
        if (!battle_team)
            return next(ApiError.badRequestError("No existe el equipo ingresado."));
        
        req.session.battle_team = battle_team.pokemon;
        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

module.exports = router;
