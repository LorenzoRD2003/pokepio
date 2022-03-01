const mySql = require("mysql2/promise");
const credentials = require("./credentials.js");
const { ApiError, apiErrorHandler } = require('./error-handler.js');

const SQL_CONFIGURATION_DATA =
{
	host: credentials.mysql.ip,
	user: credentials.mysql.username,
	password: credentials.mysql.password,
	database: credentials.mysql.database,
	port: credentials.mysql.port,
	charset: 'UTF8_GENERAL_CI'
}

/**
 * Realiza una query a la base de datos MySQL indicada en el archivo "mysql.js".
 * @param {String} queryString Query que se desea realizar. Textual como se utilizaría en el MySQL Workbench.
 * @returns Respuesta de la base de datos. Suele ser un vector de objetos.
 */
exports.realizarQuery = async function (queryString) {
	let returnObject, connection;
	try {
		connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);
		returnObject = await connection.execute(queryString);
	} catch(err) {
		return Promise.reject(err);
	} finally {
		if(connection && connection.end) connection.end();
	}
	return returnObject[0];
}