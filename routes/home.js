const { ApiError } = require('../modules/error-handler.js');
const databaseFunctions = require("../modules/databaseFunctions.js");

// Para el ingreso de imágenes
const multer = require('multer');
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
const deleteFileHandler = err => err ? console.log("No se puedo borrar.", err) : console.log("Se pudo borrar");
const deleteProfilePhoto = async ID_User => {
    const profilePhoto = await databaseFunctions.getProfilePhoto(ID_User);
    fs.unlink(`${__dirname}/public/img/profile_photos/${profilePhoto}`, deleteFileHandler);
}

const express = require("express");
const router = new express.Router();

router.get('/', async (req, res, next) => {
    try {
        if (req.mustLogin)
            return next(ApiError.unauthorizedError("Debe iniciar sesión para poder entrar a esta página."));

        res.render('home', { user: req.session.user });
    } catch (err) {
        next(ApiError.badRequestError(err.message));
    }
});

router.get('/logout', (req, res, next) => {
    try {
        req.session.destroy();
        res.redirect('/account/login');
    } catch(err) {
        return next(ApiError.badRequestError(err.message));
    }
});

router.get('/user-data', (req, res, next) => {
    try {
        if (req.mustLogin)
            return next(ApiError.unauthorizedError("Debe iniciar sesión para poder entrar a esta página."));

        res.render('modifyUserData', {
            user: req.session.user,
            pokemonNamesList: dataArrays.pokemonNamesList
        });
    } catch (err) {
        next(ApiError.badRequestError(err.message));
    }
});

router.put('/user-data', async (req, res, next) => {
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
        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.get('/change-password', (req, res, next) => {
    try {
        if (req.mustLogin)
            return next(ApiError.unauthorizedError("Debe iniciar sesión para poder entrar a esta página."));

        res.render('modifyPassword', { user: req.session.user });
    } catch (err) {
        next(ApiError.badRequestError(err.message));
    }
});

router.put('/change-password', async (req, res, next) => {
    try {
        const ID_User = req.session.user.ID_User;
        const acc_password = req.session.user.acc_password;
        if (!ID_User || !acc_password)
            return next(ApiError.internalServerError("Error de sesión."));

        const { oldPassword, newPassword } = req.body;
        if (!oldPassword)
            return next(ApiError.badRequestError("Falta ingresar la contraseña actual."));

        if (!newPassword)
            return next(ApiError.badRequestError("Falta ingresar la nueva contraseña."));

        if (acc_password !== oldPassword)
            return next(ApiError.badRequestError("La contraseña actual ingresada no es correcta."));

        await databaseFunctions.updateUserData(ID_User, "acc_password", newPassword);
        req.session.user.acc_password = newPassword;

        res.sendStatus(200);
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

router.post('/uploadProfilePhoto', upload.single('profile_photo'), async (req, res, next) => {
    try {
        if (!req.file)
            return next(ApiError.badRequestError("Debe ingresar una foto de perfil."));

        const ID_User = req.session.user.ID_User;
        if (!ID_User)
            return next(ApiError.internalServerError("Error de sesión."));

        await deleteProfilePhoto(ID_User);
        const profilePhoto = req.file.filename;
        await databaseFunctions.updateUserData(ID_User, "profile_photo", profilePhoto);
        req.session.user.profile_photo = profilePhoto;
        res.render('home', { user: req.session.user });
    } catch (err) {
        next(ApiError.internalServerError(err.message));
    }
});

module.exports = router;
