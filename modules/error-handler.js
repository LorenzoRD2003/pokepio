class ApiError {
    /**
     * Constructor de la clase error.
     * @param {Number} code Código del error.
     * @param {String} message Mensaje del error.
     */
    constructor(code, message) {
        this.code = code;
        this.message = message;
    }

    /**
     * Crea un error 400 "Bad Request".
     * @param {String} msg Mensaje del error. 
     * @returns 
     */
    static badRequestError(msg) {
        return new ApiError(400, msg);
    }

    /**
     * Crea un error 401 "Unauthorized".
     * @param {String} msg Mensaje del error. 
     * @returns 
     */
    static unauthorizedError(msg) {
        return new ApiError(401, msg);
    }

    /**
     * Crea un error 404 "Not Found".
     * @param {String} msg Mensaje del error. 
     * @returns 
     */
    static notFoundError(msg) {
        return new ApiError(404, msg);
    }

    /**
     * Crea un error 500 "Internal Server Error".
     * @param {String} msg Mensaje del error. 
     * @returns 
     */
    static internalServerError(msg) {
        return new ApiError(500, msg);
    }
}
exports.ApiError = ApiError;

const apiErrorHandler = (err, req, res, next) => {
    
    console.log(err);

    // Si es un error de la clase que creamos
    if (err instanceof ApiError) {
        if (req.xhr)
            // Si es cuando hacemos un pedido AJAX (con XMLHttpRequest)
            return res.status(err.code).send(err.message);
        else
            // Si es cuando hacemos otro pedido (form/link), vamos a la página de error
            return res.status(err.code).render("error", { error: err });
    }

    // De otro modo, devolvemos mensajes genéricos
    if (res.xhr)
        res.status(500).send("Ha ocurrido un error imprevisto.");
    else
        res.status(500).render("error", {
            error: {
                code: 500,
                message: "Ha ocurrido un error imprevisto."
            }
        });
}

const api404Handler = (req, res) => {
    if (req.xhr)
        res.status(404).send("El recurso solicitado no fue encontrado.");
    else
        res.status(404).render("error", {
            error: {
                code: 404,
                message: "El recurso solicitado no fue encontrado."
            }
        });
}

module.exports = { ApiError, apiErrorHandler, api404Handler };
