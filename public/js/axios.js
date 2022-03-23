const nodeReq = axios.create({
    baseURL: location.origin,
    headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/json"
    },
    timeout: 20000,
    responseEncoding: "utf-8",
    responseType: "text"
});

nodeReq.interceptors.request.use(req => {
    try {
        return req;
    } catch (err) {
        return Promise.reject(err);
    }
}, err => Promise.reject(err));

nodeReq.interceptors.response.use(res => {
    try {
        return res;
    } catch (err) {
        return Promise.reject(err);
    }
}, err => Promise.reject(err));

const handleAxiosError = err => {
    if (err.response) {
        // Un modal si es error 401, otro si es cualquier otro error en la respuesta del servidor
        if (err.response.status == 401) {
            createModal(
                "errorModal",
                "¡Alerta!",
                `Debe iniciar sesión para poder hacer este pedido.
                <br><br><b>Error ${err.response.status}: ${err.response.statusText}.
                <br>${err.response.data}</b>`,
                "Volver a inicio de sesión",
                () => document.getElementById("rootLink").click()
            );
        } else {
            createErrorModal(
                "errorModal",
                `Ocurrió un error. Inténtelo nuevamente más tarde.
                <br><br><b>Error ${err.response.status}: ${err.response.statusText}.
                <br>${err.response.data}</b>`
            );
        }
    } else if (err.request) {
        console.dir(err.request);
    } else {
        createErrorModal(
            "errorModal",
            `Ocurrió un error. Inténtelo nuevamente más tarde.
            <br><br><b>Error: ${err.message}</b>`
        );
    }
}
