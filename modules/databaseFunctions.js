const MySQL = require('./mysql');
const mathFunctions = require('./mathFunctions');
const tablaUsuarios = "POKEPIO_Users";
const tablaEquipos = "POKEPIO_Teams";
const tablaChats = "POKEPIO_Chats";
const tablaBatallas = "POKEPIO_Battles";

/**
 * En la creación de usuarios, queremos saber si el nombre está disponible.
 * Esta función se fija en la base de datos para saberlo.
 * @param {String} newUsername Nombre de usuario del nuevo usuario. 
 * @returns true si está disponible, false si no lo está.
 */
const usernameAlreadyInDatabase = async (newUsername) => {
    const usernamesList = await MySQL.realizarQuery(`select username from ${tablaUsuarios}`);
    const foundUsername = usernamesList.find(object => newUsername == object.username);
    return (foundUsername) ? true : false;
}
exports.usernameAlreadyInDatabase = usernameAlreadyInDatabase;

/**
 * En la creación de usuarios, queremos saber si el email no fue usado.
 * Esta función se fija en la base de datos para saberlo.
 * @param {String} newEmail Email del nuevo usuario. 
 * @returns true si está disponible, false si no lo está.
 */
const emailAlreadyInDatabase = async (newEmail) => {
    const emailsList = await MySQL.realizarQuery(`select email from ${tablaUsuarios}`);
    const foundEmail = emailsList.find(object => newEmail == object.email);
    return (foundEmail) ? true : false;
}
exports.emailAlreadyInDatabase = emailAlreadyInDatabase;

/**
 * Ingresa un usuario a la base de datos.
 * @param {String} email Email del nuevo usuario.
 * @param {String} username Nombre de usuario del nuevo usuario.
 * @param {String} password Contraseña del nuevo usuario.
 */
exports.insertUser = async (email, username, password) => {
    await MySQL.realizarQuery(`
        insert into ${tablaUsuarios}(email, username, acc_password) values
        ('${email}', '${username}', '${password}');
    `);
}

/**
 * Inicia sesión con el email.
 * @param {String} email Email del usuario.
 * @param {String} password Contraseña del usuario.
 * @returns Un objeto con el usuario (si se pudo ingresar) y un error (en caso de no haberse podido ingresar).
 */
exports.loginIntoSystemWithEmail = async (email, password) => {
    const userList = await MySQL.realizarQuery(`select * from ${tablaUsuarios}`);
    for (let user of userList) {
        if (email == user.email) {
            return (password == user.acc_password) ? { user: user, success: "access" } : { user: null, success: "wrong-password" };
        }
    }
    return { user: null, success: "non-existent-email" };
};

/**
 * Inicia sesión con el nombre de usuario.
 * @param {String} username Nombre de usuario del usuario.
 * @param {String} password Contraseña del usuario.
 * @returns Un objeto con el usuario (si se pudo ingresar) y un error (en caso de no haberse podido ingresar).
 */
exports.loginIntoSystemWithUsername = async (username, password) => {
    const userList = await MySQL.realizarQuery(`select * from ${tablaUsuarios}`);
    for (let user of userList) {
        if (username == user.username) {
            return (password == user.acc_password) ? { user: user, success: "access" } : { user: null, success: "wrong-password" };
        }
    }
    return { user: null, success: "non-existent-username" };
};

/**
 * Devuelve el ID de un usuario dado su nombre de usuario.
 * @param {String} username Nombre de usuario del usuario.
 * @returns El id del usuario en caso de existir, de otra forma devuelve null.
 */
exports.getIDUserByUsername = async username => {
    const existsUser = await usernameAlreadyInDatabase(username);
    if (existsUser) {
        return (await MySQL.realizarQuery(`
            select ID_User from ${tablaUsuarios}
            where username = '${username}';
        `))[0].ID_User;
    } else {
        return null;
    }
}

/**
 * Devuelve el ID de un usuario dado su email.
 * @param {String} email Email del usuario.
 * @returns El id del usuario en caso de existir, de otra forma devuelve null.
 */
exports.getIDUserByEmail = async email => {
    const existsUser = await this.emailAlreadyInDatabase(email);
    if (existsUser) {
        return (await MySQL.realizarQuery(`
            select ID_User from ${tablaUsuarios}
            where email = '${email}';
        `))[0].ID_User;
    } else {
        return null;
    }
}

/**
 * Actualiza datos de un usuario dado su ID.
 * @param {Number} ID_User ID del usuario. 
 * @param {String} column  Columna a actualizar.
 * @param {String} value Valor a ingresar en la columna.
 */
exports.updateUserData = async (ID_User, column, value) => {
    await MySQL.realizarQuery(`
        update ${tablaUsuarios}
        set ${column} = '${value}'
        where ID_User = ${ID_User};
    `);
}

/**
 * Devuelve el nombre de la foto de perfil de un usuario dado su ID.
 * @param {Number} ID_User ID del usuario.
 * @returns El nombre de la foto de perfil.
 */
exports.getProfilePhoto = async ID_User => {
    return (await MySQL.realizarQuery(`
        select profile_photo from ${tablaUsuarios}
        where ID_User = ${ID_User};
    `))[0].profile_photo;
}

/**
 * Crea un nuevo equipo para un usuario en la base de datos.
 * @param {Number} ID_User ID del usuario.
 * @param {String} team_name Nombre del equipo.
 */
exports.createNewTeam = async (ID_User, team_name) => {
    const today = mathFunctions.todayDate();
    await MySQL.realizarQuery(`
        insert into ${tablaEquipos}(ID_User, team_name, pokemon, modification_date)
        values (${ID_User}, '${team_name}', '[]', '${today}');
    `);
}

/**
 * Devuelve un equipo dado su usuario y nombre de equipo.
 * @param {Number} ID_User ID del usuario.
 * @param {String} team_name Nombre del equipo.
 * @returns Objeto con el equipo.
 */
exports.selectTeamByUserAndTeamName = async (ID_User, team_name) => {
    return (await MySQL.realizarQuery(`
        select * from ${tablaEquipos}
        where ID_User = ${ID_User} and team_name = '${team_name}';
    `))[0];
}

/**
 * Devuelve los Pokémon de un equipo.
 * @param {Number} ID_Team ID del equipo. 
 * @returns Vector con los Pokémon del equipo.
 */
const getPokemonArray = async ID_Team => {
    return (await MySQL.realizarQuery(`
        select pokemon from ${tablaEquipos}
        where ID_Team = ${ID_Team};
    `))[0].pokemon;
}
exports.getPokemonArray = getPokemonArray;

/**
 * Añade un Pokémon a un equipo.
 * @param {Number} ID_Team ID del equipo.
 * @param {Object} pokemon Pokémon a añadir.
 */
exports.addPokemonToTeam = async (ID_Team, pokemon) => {
    const today = mathFunctions.todayDate();
    const pokemonArray = await getPokemonArray(ID_Team);
    if (pokemonArray.length < 6) {
        pokemonArray.push(pokemon);
        await MySQL.realizarQuery(`
            update ${tablaEquipos}
            set pokemon = '${JSON.stringify(pokemonArray)}', modification_date = '${today}'
            where ID_Team = ${ID_Team};
        `);

        return pokemonArray.length;
    }
}

/**
 * Devuelve todos los equipos de un usuario.
 * @param {Number} ID_User ID del usuario. 
 * @returns Vector con los equipos.
 */
exports.selectAllTeamsByUser = async ID_User => {
    return (await MySQL.realizarQuery(`
        select * from ${tablaEquipos}
        where ID_User = ${ID_User};
    `));
}

/**
 * Borra un equipo de la base de datos.
 * @param {Number} ID_Team ID del equipo. 
 */
exports.deleteTeam = async (ID_Team) => {
    await MySQL.realizarQuery(`
        delete from ${tablaEquipos}
        where ID_Team = ${ID_Team};
    `);
}

/**
 * Modifica el nombre de un equipo.
 * @param {Number} ID_Team ID del equipo.
 * @param {String} newName Nuevo nombre para el equipo.
 */
exports.modifyTeamName = async (ID_Team, newName) => {
    const today = mathFunctions.todayDate();
    await MySQL.realizarQuery(`
        update ${tablaEquipos}
        set team_name = '${newName}', modification_date = '${today}'
        where ID_Team = ${ID_Team};
    `);
}

/**
 * Borra un Pokémon de un equipo.
 * @param {Number} ID_Team ID del equipo.
 * @param {Number} pokemonNumber Índice del Pokémon a borrar en el vector del equipo.
 */
exports.deletePokemon = async (ID_Team, pokemonNumber) => {
    const today = mathFunctions.todayDate();
    const pokemonArray = await getPokemonArray(ID_Team);
    pokemonArray.splice(pokemonNumber, 1);
    await MySQL.realizarQuery(`
        update ${tablaEquipos}
        set pokemon = '${JSON.stringify(pokemonArray)}', modification_date = '${today}'
        where ID_Team = ${ID_Team};
    `);
}

/**
 * Pone a todos los usuarios en OFFLINE.
 */
exports.setAllUsersOffline = async () => {
    await MySQL.realizarQuery(`
        update ${tablaUsuarios}
        set is_online = false;
    `);
}

/**
 * Checkea si un usuario está online.
 * @param {Nombre} ID_User ID del usuario.
 * @returns Si está ONLINE (true) u OFFLINE (false). 
 */
exports.checkUserOnline = async ID_User => {
    const user = await MySQL.realizarQuery(`
        select is_online from ${tablaUsuarios}
        where ID_User = ${ID_User};
    `);
    return user[0].is_online;
}

/**
 * Pone en ONLINE al usuario especificado.
 * @param {Number} ID_User ID del usuario. 
 */
exports.setUserOnline = async ID_User => {
    await MySQL.realizarQuery(`
        update ${tablaUsuarios}
        set is_online = true
        where ID_User = ${ID_User};
    `);
}

/**
 * Pone en OFFLINE al usuario especificado.
 * @param {Number} ID_User ID del usuario. 
 */
exports.setUserOffline = async ID_User => {
    await MySQL.realizarQuery(`
        update ${tablaUsuarios}
        set is_online = false
        where ID_User = ${ID_User};
    `);
}

/**
 * Devuelve una lista de los nombres de usuario de los usuarios conectados
 * (excepto por el usuario que está haciendo el pedido).
 * @param {Number} ID_User ID del usuario.
 * @returns Lista de nombres de usuario.
 */
exports.getOnlineUsers = async ID_User => {
    return (await MySQL.realizarQuery(`
        select username from ${tablaUsuarios}
        where is_online = true and ID_User != ${ID_User};
    `));
}

/**
 * Crea un chat entre dos usuarios.
 * @param {Number} ID_User1 ID del primer usuario.
 * @param {Number} ID_User2 ID del segundo usuario. 
 */
exports.createNewChat = async (ID_User1, ID_User2) => {
    await MySQL.realizarQuery(`insert into ${tablaChats} (ID_User1, ID_User2) values (${ID_User1}, ${ID_User2});`);
}

/**
 * Devuelve un chat dados los dos usuarios que participan en el mismo.
 * @param {Number} ID_User1 ID del primer usuario.
 * @param {Number} ID_User2 ID del segundo usuario.
 * @returns Chat.
 */
const getChatByUsers = async (ID_User1, ID_User2) => {
    const chat = await MySQL.realizarQuery(`
        select * from ${tablaChats}
        where (ID_User1 = ${ID_User1} and ID_User2 = ${ID_User2}) or (ID_User1 = ${ID_User2} and ID_User2 = ${ID_User1});
    `);
    return (chat) ? chat[0] : null;
}
exports.getChatByUsers = getChatByUsers;

/**
 * Devuelve el vector de mensajes de un chat.
 * @param {Number} ID_Chat ID del chat. 
 * @returns Vector de mensajes.
 */
const getMessagesArrayFromChat = async ID_Chat => {
    return (await MySQL.realizarQuery(`
        select messages_list from ${tablaChats}
        where ID_Chat = ${ID_Chat};
    `))[0].messages_list;
}

/**
 * Añade un mensaje al vector de mensajes de un chat. Si ya hay 15 mensajes, se borra el más antiguo.
 * @param {Number} ID_Chat ID del chat. 
 * @param {String} message Mensaje a añadir al vector. 
 */
exports.addMessageToChat = async (ID_Chat, message) => {
    let messagesArray = (await getMessagesArrayFromChat(ID_Chat)) || [];
    if (messagesArray.length >= 15) messagesArray.shift();
    messagesArray.push({
        sender: message.sender,
        content: message.content
    });
    await MySQL.realizarQuery(`
        update ${tablaChats}
        set messages_list = '${JSON.stringify(messagesArray)}'
        where ID_Chat = ${ID_Chat};
    `);
};

/**
 * Devuelve un equipo dado su ID.
 * @param {Number} ID_Team ID del equipo. 
 * @returns Equipo.
 */
exports.getTeamByID = async ID_Team => {
    return (await MySQL.realizarQuery(`
        select * from ${tablaEquipos}
        where ID_Team = ${ID_Team};
    `))[0];
}

/**
 * Crea una batalla en la base de datos, cuando un usuario ingresa a ella por primera vez.
 * Luego, devuelve el ID de esta batalla.
 * @param {Number} ID_User ID del usuario.
 * @returns ID de la batalla creada.
 */
exports.createBattle = async ID_User => {
    // Creo la batalla
    await MySQL.realizarQuery(`
        insert into ${tablaBatallas}(ID_User1)
        values (${ID_User});
    `);

    // Obtengo el ID de la batalla
    return (await MySQL.realizarQuery(`
        select max(ID_Battle) as id from ${tablaBatallas}
        where ID_User1 = ${ID_User};
    `))[0].id;
}

/**
 * Añade un segundo usuario a una batalla ya creada.
 * @param {Number} ID_Battle ID de la batalla. 
 * @param {Number} ID_User ID del usuario.
 */
exports.addSecondUserToBattle = async (ID_Battle, ID_User) => {
    await MySQL.realizarQuery(`
        update ${tablaBatallas}
        set ID_User2 = ${ID_User}
        where ID_Battle = ${ID_Battle}
    `);
}

/**
 * Guarda los resultados de una batalla en la base de datos.
 * @param {Number} ID_Battle ID de la batalla. 
 * @param {String} winner Nombre de usuario del usuario ganador de la batalla.
 * @param {String} loser Nombre de usuario del usuario perdedor de la batalla.
 * @param {String} result Resultado de la batalla (en w-l).
 */
exports.setBattleResults = async (ID_Battle, winner, loser, result) => {
    await MySQL.realizarQuery(`
        update ${tablaBatallas}
        set winner = '${winner}', loser = '${loser}', result = '${result}'
        where ID_Battle = ${ID_Battle};
    `);
}

/**
 * Borra una batalla de la base de datos.
 * @param {Number} ID_Battle ID de la batalla.
 */
exports.deleteBattle = async ID_Battle => {
    await MySQL.realizarQuery(`
        delete from ${tablaBatallas}
        where ID_Battle = ${ID_Battle};
    `);
}

