const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");
const { pokemonNamesList, naturesList, itemsList } = require("../modules/dataArrays");
const fetchFunctions = require('../modules/fetchFunctions');
const { Pokemon } = require('../modules/pokemon-logic/pokemon.js');
const { Move } = require('../modules/pokemon-logic/move.js');

const express = require("express");
const router = new express.Router();

router.get('/', (req, res, next) => {
    try {
        res.render('teambuilder', {
            user: req.session.user,
            teams: req.session.teams
        });
    } catch (err) {
        return next(ApiError.internalServerError(err.message));
    }
});

router.get('/create', (req, res, next) => {
    try {
        res.render('createTeam', {
            user: req.session.user,
            pokemonNamesList: pokemonNamesList,
            naturesList: naturesList,
            itemsList: itemsList
        });
    } catch (err) {
        return next(ApiError.internalServerError(err.message));
    }
});

router.get('/team', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        if (!ID_User)
            return next(ApiError.internalServerError("Error de sesión."));

        const team_name = req.query.team_name;
        if (!team_name) {
            return next(ApiError.badRequestError("Error en el nombre del equipo ingresado."));
        }
        req.session.selected_team = await databaseFunctions.selectTeamByUserAndTeamName(ID_User, team_name);

        const ID_Team = req.session.selected_team.ID_Team;
        const pokemonAmount = (await databaseFunctions.getPokemonArray(ID_Team)).length;

        if (pokemonAmount == 6)
            return next(ApiError.badRequestError("Su equipo ya tiene seis Pokémon."));

        res.status(200).send({
            message: "ok",
            pokemonNamesList: pokemonNamesList,
            naturesList: naturesList,
            itemsList: itemsList
        });
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.post('/team', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        if (!ID_User)
            return next(ApiError.internalServerError("Error de sesión."));

        const team_name = req.body.team_name;
        if (!team_name)
            return next(ApiError.badRequestError("Falta ingresar el nombre del equipo."));

        // Quiero verificar que no tengo otro equipo con el mismo nombre
        const foundTeam = req.session.teams.find(team => team.team_name == team_name);
        if (foundTeam)
            return next(ApiError.badRequestError("Ya tiene un equipo con este nombre. Elija otro nombre."));

        await databaseFunctions.createNewTeam(ID_User, team_name);
        req.session.selected_team = await databaseFunctions.selectTeamByUserAndTeamName(ID_User, team_name);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);

        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.put('/team', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        if (!ID_User)
            return next(ApiError.internalServerError("Error de sesión."));

        const { ID_Team, newName } = req.body;
        if (!ID_Team || !newName)
            return next(ApiError.badRequestError("Falta ingresar el nombre del equipo."));

        // Verifico que no haya otro equipo con este nombre
        const foundTeam = req.session.teams.find(team => team.team_name == newName && team.ID_Team != ID_Team);
        if (foundTeam)
            return next(ApiError.badRequestError("Ya tiene un equipo con este nombre. Elija otro nombre."));

        await databaseFunctions.modifyTeamName(ID_Team, newName);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);

        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.delete('/team', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        if (!ID_User)
            return next(ApiError.internalServerError("Error de sesión."));

        const ID_Team = req.query.ID_Team;
        if (!ID_Team)
            return next(ApiError.badRequestError("Hubo un error con el equipo seleccionado."));

        await databaseFunctions.deleteTeam(ID_Team);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);

        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.get('/pokemon', async (req, res, next) => {
    try {
        const pokemon = req.query.name;
        if (!pokemonNamesList.includes(pokemon))
            return next(ApiError.badRequestError("El Pokémon ingresado es incorrecto."))

        const pokemonData = await fetchFunctions.searchPokemonData(pokemon);

        res.status(200).send(pokemonData);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.post('/pokemon', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        const ID_Team = req.session.selected_team.ID_Team;

        if (!ID_User || !ID_Team)
            return next(ApiError.internalServerError("Error de sesión."));

        const pokemon = req.body;
        if (!pokemon)
            return next(ApiError.badRequestError("Los datos del Pokémon ingresados son incorrectos."));

        if (pokemon.level > 100 || pokemon.level <= 0)
            return next(ApiError.badRequestError("El nivel del Pokémon no tiene un valor correcto."));

        if (pokemon.happiness > 255 || pokemon.happiness < 0)
            return next(ApiError.badRequestError("La felicidad del Pokémon no tiene un valor correcto."));

        for (let stat in pokemon.iv) {
            if (stat > 31 || stat < 0)
                return next(ApiError.badRequestError("Los IV's del Pokémon no tienen un valor correcto."));
        }

        const sumOfEV = Object.values(pokemon.ev).reduce((acc, el) => acc + el, 0);
        if (sumOfEV > 510 || sumOfEV < 0)
            return next(ApiError.badRequestError("Los EV's del Pokémon no tienen un valor correcto."));

        const pokemonAmount = await databaseFunctions.addPokemonToTeam(ID_Team, pokemon);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);

        if (pokemonAmount == 6)
            res.status(200).send({ message: "sixPokemon" });
        else
            res.status(200).send({ message: "ok" });
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.delete('/pokemon', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        if (!ID_User)
            return next(ApiError.internalServerError("Error de sesión."));

        const { ID_Team, pokemonNumber } = req.query;
        if (!ID_Team || !pokemonNumber)
            return next(ApiError.badRequestError("Hubo un error con los datos ingresados."));

        const pokemonAmount = (await databaseFunctions.getPokemonArray(ID_Team)).length;
        if (pokemonAmount == 1)
            return next(ApiError.badRequestError("No se puede borrar el último Pokémon del equipo. En su lugar, borre el equipo."));

        await databaseFunctions.deletePokemon(ID_Team, pokemonNumber);
        req.session.teams = await databaseFunctions.selectAllTeamsByUser(ID_User);

        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

module.exports = router;
