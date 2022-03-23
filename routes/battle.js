const { ApiError } = require('../modules/error-handler.js');
const { Player } = require('../modules/pokemon-logic/player.js');

const express = require("express");
const router = new express.Router();

router.get('/', (req, res, next) => {
    try {
        const battleTeam = req.session.battleTeam;
        if (!battleTeam)
            return next(ApiError.badRequestError("Debe tener seleccionado un equipo de batalla para poder entrar a esta página."));

        res.render('battle', {
            username: req.session.user.username,
            profile_photo: req.session.user.profile_photo,
            battleTeam: battleTeam,
            pokemonLeft: battleTeam.length
        });
    } catch (err) {
        return next(ApiError.internalServerError(err.message));
    }
});

router.get('/team', async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.battleTeam)
            next(ApiError.internalServerError("Error de sesión."));

        res.status(200).send(new Player(
            req.session.user.ID_User,
            req.session.user.username,
            req.session.user.profile_photo,
            req.session.battle_team
        ));
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.get('/lobby', (req, res) => res.redirect('/lobby'));

module.exports = router;
