const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");

const express = require("express");
const router = new express.Router();

router.get("/login", async (req, res, next) => {
    try {
        // Si la sesión está iniciada, ir a /home
        if (req.session.user)
            return res.redirect('/home');

        // Borrar la sesión y cargar login.handlebars
        req.session.destroy();
        res.render('login', null);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const { email_or_username, password } = req.body;

        if (!email_or_username || !password)
            return next(ApiError.badRequestError("Los datos ingresados no pueden estar en blanco."));

        // Hago login, si ingresé con el email o con el usuario son dos funciones diferentes
        const { user, success } = (email_or_username.search("@") != -1) ?
            await databaseFunctions.loginIntoSystemWithEmail(email_or_username, password) :
            await databaseFunctions.loginIntoSystemWithUsername(email_or_username, password);

        // Según la respuesta guardada en success, o bien seguimos o bien tiramos errores
        switch (success) {
            case "access":
                if (!user)
                    return next(ApiError.internalServerError("Ha ocurrido un error con el usuario obtenido."));

                // Checkeamos que el usuario esté online
                const alreadyOnline = await databaseFunctions.checkUserOnline(user.ID_User);
                if (alreadyOnline)
                    return next(ApiError.badRequestError("Su usuario ya inició sesión."));
                
                // Actualizamos que el usuario está ONLINE
                await databaseFunctions.setUserOnline(user.ID_User)

                // Guardamos datos en las variables de sesión
                req.session.user = user;
                req.session.teams = await databaseFunctions.selectAllTeamsByUser(user.ID_User);

                // Redirigimos a /home
                return res.redirect('/home');
            case "wrong-password":
                return next(ApiError.badRequestError("La contraseña es incorrecta."));
            case "non-existent-email":
                return next(ApiError.badRequestError("El email no está registrado."));
            case "non-existent-username":
                return next(ApiError.badRequestError("El nombre de usuario no está registrado."));
        }
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.get("/create", (req, res, next) => {
    try {
        req.session.destroy();
        res.render('createAccount', null);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.post("/create", async (req, res, next) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password)
            return next(ApiError.badRequestError("Faltan ingresar datos."));

        const boolUsernameInDB = await databaseFunctions.usernameAlreadyInDatabase(username);
        if (boolUsernameInDB)
            return next(ApiError.badRequestError("El nombre de usuario ya está registrado."));

        const boolEmailInDB = await databaseFunctions.emailAlreadyInDatabase(email);
        if (boolEmailInDB)
            return next(ApiError.badRequestError("El email ya está registrado."));

        await databaseFunctions.insertUser(email, username, password);
        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

module.exports = router;
