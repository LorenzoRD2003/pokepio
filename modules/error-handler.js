class ApiError {
    constructor(code, message) {
        this.code = code;
        this.message = message;
    }

    static badRequestError(msg) {
        return new ApiError(400, msg);
    }

    static notFoundError(msg) {
        return new ApiError(404, msg);
    }

    static internalServerError(msg) {
        return new ApiError(500, msg);
    }
}
exports.ApiError = ApiError;

const apiErrorHandler = (err, req, res, next) => {
    console.error(err);

    if (err instanceof ApiError)
        return res.status(err.code).send(err.message);

    res.status(500).send("Ha ocurrido un error imprevisto.");
}
exports.apiErrorHandler = apiErrorHandler;
