const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");

const express = require("express");
const router = new express.Router();

router.get('/', (req, res, next) => {
    try {
        if (req.mustLogin)
            return next(ApiError.unauthorizedError("Debe iniciar sesión para poder entrar a esta página."));

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
        return next(ApiError.badRequestError(err.message));
    }
});

router.get('/team', async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.battleTeam)
            next(ApiError.internalServerError("Error de sesión."));

        res.status(200).send({
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
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.get('/lobby', (req, res) => res.redirect('/lobby'));

module.exports = router;
