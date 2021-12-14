/**
 * Realiza un pedido mediante Ajax, a través de cualquier de los 4 métodos vistos en clase.
 * @param {String} method Tipo de pedido que se quiere realizar. Las opciones son: "GET", "POST", "PUT" y "DELETE".
 * @param {String} url URL del pedido a realizar. Debe coincidir con la que se va a recibir en el backend.
 * @param {Object} jsonObject Objeto que se quiere enviar al backend junto con el pedido. En caso de no querer enviar nada, escribir null.
 * @param {Function} callback Función que se va a ejecutar cuando se reciba la respuesta del servidor. No olvidar que se debe indicar que la misma reciba un parámetro, el cuál será el objeto de respuesta del servidor.
 */
function ajax(method, url, jsonObject, callback) {
	let req = new XMLHttpRequest();
	if(method === "GET" && jsonObject !== null) {
		url += `?${$.param(jsonObject)}`;
	}
	req.open(method, url, true);
	req.addEventListener("load", function() {
		if (req.status >= 200 && req.status < 400) {
			//Llamada a la función callback pasándole la respuesta
			callback(req.response);
		}
		else {
			console.error(req.status + " " + req.statusText);
		}
	});
	req.addEventListener("error", function() {
		console.error("Error de red");
	});
	req.responseType = 'text';
	if(jsonObject !== null && method !== "GET") {
		req.setRequestHeader('Content-type', "application/json");
		req.send(JSON.stringify(jsonObject));
	} else {
		req.send();
	}
}