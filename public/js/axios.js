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
    } catch(err) {
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
        createErrorModal(
            "errorModal",
            `Ocurrió un error. Inténtelo nuevamente más tarde.
            <br><br><b>Error ${err.response.status}: ${err.response.statusText}.
            <br>${err.response.data}</b>`
        );
    } else if (err.request) {
        console.dir(err.request);
    } else {
        console.log(err);
        createErrorModal(
            "errorModal",
            `Ocurrió un error. Inténtelo nuevamente más tarde.
            <br><br><b>Error: ${err.message}</b>`
        );
    }
}
