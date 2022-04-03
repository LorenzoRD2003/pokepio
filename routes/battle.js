const { ApiError } = require('../modules/error-handler.js');
const { Player } = require('../modules/pokemon-logic/player.js');

const express = require("express");
const router = new express.Router();

router.get('/', (req, res, next) => {
    try {
        if (!req.session.user)
            return next(ApiError.internalServerError("Error de sesión."));;

        const battle_team = req.session.battle_team;
        if (!battle_team)
            return next(ApiError.badRequestError("Debe tener seleccionado un equipo de batalla para poder entrar a esta página."));

        res.render('battle', {
            username: req.session.user.username,
            profile_photo: req.session.user.profile_photo,
            battle_team: battle_team,
            pokemonLeft: battle_team.length
        });
    } catch (err) {
        return next(ApiError.internalServerError(err.message));
    }
});

router.get('/team', async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.battle_team)
            next(ApiError.internalServerError("Error de sesión."));

        const { ID_User, username, profile_photo } = req.session.user;
        const battle_team = req.session.battle_team;

        res.status(200).send({
            id: ID_User,
            username: username,
            profile_photo: profile_photo,
            battle_team: battle_team
        });
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.get('/lobby', (req, res) => res.redirect('/lobby'));

module.exports = router;
