const nodeReq = axios.create({
    baseURL: location.origin,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 5000,
    responseType: "json",
    responseEncoding: "utf-8"
});