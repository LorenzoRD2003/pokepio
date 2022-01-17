const MySQL = require('./mysql');
const mathFunctions = require('./mathFunctions');
const tablaUsuarios = "POKEPIO_Users";
const tablaEquipos = "POKEPIO_Teams";
const tablaChats = "POKEPIO_Chats";
const tablaBatallas = "POKEPIO_Battles";

const usernameAlreadyInDatabase = async (newUsername) => {
    const usernamesList = await MySQL.realizarQuery(`select username from ${tablaUsuarios}`);
    for (let object of usernamesList) {
        if (newUsername == object.username) {
            return true;
        }
    }
    return false;
}
exports.usernameAlreadyInDatabase = usernameAlreadyInDatabase;

const emailAlreadyInDatabase = async (newEmail) => {
    const emailsList = await MySQL.realizarQuery(`select email from ${tablaUsuarios}`);
    for (let object of emailsList) {
        if (newEmail == object.email) {
            return true;
        }
    }
    return false;
}
exports.emailAlreadyInDatabase = emailAlreadyInDatabase;

exports.insertUser = async (email, username, password) => {
    await MySQL.realizarQuery(`
        insert into ${tablaUsuarios}(email, username, acc_password) values
        ('${email}', '${username}', '${password}');
    `);
}

exports.loginIntoSystemWithEmail = async (email, password) => {
    const userList = await MySQL.realizarQuery(`select * from ${tablaUsuarios}`);
    for (let user of userList) {
        if (email == user.email) {
            return (password == user.acc_password) ? { user: user, success: "access" } : { user: null, success: "wrong-password" };
        }
    }
    return { user: null, success: "non-existent-email" };
};

exports.loginIntoSystemWithUsername = async (username, password) => {
    const userList = await MySQL.realizarQuery(`select * from ${tablaUsuarios}`);
    for (let user of userList) {
        if (username == user.username) {
            return (password == user.acc_password) ? { user: user, success: "access" } : { user: null, success: "wrong-password" };
        }
    }
    return { user: null, success: "non-existent-username" };
};

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

exports.updateUserData = async (ID_User, column, value) => {
    await MySQL.realizarQuery(`
        update ${tablaUsuarios}
        set ${column} = '${value}'
        where ID_User = ${ID_User};
    `);
}

exports.getProfilePhoto = async (ID_User) => {
    return (await MySQL.realizarQuery(`
        select profile_photo from ${tablaUsuarios}
        where ID_User = ${ID_User};
    `))[0].profile_photo;
}

exports.createNewTeam = async (ID_User, team_name) => {
    const today = mathFunctions.todayDate();
    await MySQL.realizarQuery(`
        insert into ${tablaEquipos}(ID_User, team_name, pokemon, modification_date)
        values (${ID_User}, '${team_name}', '[]', '${today}');
    `);
}

exports.selectTeamByUserAndTeamName = async (ID_User, team_name) => {
    return (await MySQL.realizarQuery(`
        select * from ${tablaEquipos}
        where ID_User = ${ID_User} and team_name = '${team_name}';
    `))[0];
}

const getPokemonArray = async (ID_Team) => {
    return (await MySQL.realizarQuery(`
        select pokemon from ${tablaEquipos}
        where ID_Team = ${ID_Team};
    `))[0].pokemon;
}
exports.getPokemonArray = getPokemonArray;

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
    }
}

exports.selectAllTeamsByUser = async (ID_User) => {
    return (await MySQL.realizarQuery(`
        select * from ${tablaEquipos}
        where ID_User = ${ID_User};
    `));
}

exports.deleteTeam = async (ID_Team) => {
    await MySQL.realizarQuery(`
        delete from ${tablaEquipos}
        where ID_Team = ${ID_Team};
    `);
}

exports.modifyTeamName = async (ID_Team, newName) => {
    const today = mathFunctions.todayDate();
    await MySQL.realizarQuery(`
        update ${tablaEquipos}
        set team_name = '${newName}', modification_date = '${today}'
        where ID_Team = ${ID_Team};
    `);
}

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

exports.createNewChat = async (ID_User1, ID_User2) => {
    await MySQL.realizarQuery(`insert into ${tablaChats} (ID_User1, ID_User2) values (${ID_User1}, ${ID_User2});`);
}

const getChatByUsers = async (ID_User1, ID_User2) => {
    const chat = await MySQL.realizarQuery(`
        select * from ${tablaChats}
        where (ID_User1 = ${ID_User1} and ID_User2 = ${ID_User2}) or (ID_User1 = ${ID_User2} and ID_User2 = ${ID_User1});
    `);
    return (chat) ? chat[0] : null;
}
exports.getChatByUsers = getChatByUsers;

const getMessagesArrayFromChat = async ID_Chat => {
    return (await MySQL.realizarQuery(`
        select messages_list from ${tablaChats}
        where ID_Chat = ${ID_Chat};
    `))[0].messages_list;
}
exports.getMessagesArrayFromChat = getMessagesArrayFromChat;

exports.addMessageToChat = async (ID_Chat, message) => {
    let messagesArray = await getMessagesArrayFromChat(ID_Chat);
    if (!messagesArray) messagesArray = [];
    if (messagesArray.length >= 15) messagesArray.shift();
    messagesArray.push(message);
    await MySQL.realizarQuery(`
        update ${tablaChats}
        set messages_list = '${JSON.stringify(messagesArray)}'
        where ID_Chat = ${ID_Chat};
    `);
};

exports.getTeamByID = async (ID_Team) => {
    return (await MySQL.realizarQuery(`
        select * from ${tablaEquipos}
        where ID_Team = ${ID_Team};
    `))[0];
}

exports.createBattle = async (ID_User1) => {
    await MySQL.realizarQuery(`
        insert into ${tablaBatallas}(ID_User1)
        values (${ID_User1});
    `);

    return (await MySQL.realizarQuery(`
        select max(ID_Battle) as id from ${tablaBatallas}
        where ID_User1 = ${ID_User1};
    `))[0].id;
}

exports.addSecondUserToBattle = async (ID_Battle, ID_User2) => {
    await MySQL.realizarQuery(`
        update ${tablaBatallas}
        set ID_User2 = ${ID_User2}
        where ID_Battle = ${ID_Battle}
    `);
}

exports.setBattleResults = async (ID_Battle, winner, loser, result) => {
    await MySQL.realizarQuery(`
        update ${tablaBatallas}
        set winner = '${winner}', loser = '${loser}', result = '${result}'
        where ID_Battle = ${ID_Battle};
    `);
}

