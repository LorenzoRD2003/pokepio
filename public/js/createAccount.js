const createAccountButton = document.getElementById("createAccountButton");
createAccountButton.addEventListener("click", async () => {
    createAccountButton.disabled = true;

    // Obtengo los datos
    const email = getValueByID("createAccountEmailID");
    const username = getValueByID("createAccountUsernameID");
    const password = getValueByID("createAccountPasswordID");

    // Si la validación no es exitosa, salgo de la función
    if (!fullUserValidation(email, username, password)) {
        return createAccountButton.disabled = false;
    }

    // Creo un nuevo objeto
    const newUser = {
        email: email,
        username: username,
        password: password
    };

    // Hago el pedido al servidor
    try {
        await nodeReq.post('/createAccount/create', newUser);
        createModal("createAccountModal",
            "¡Felicidades!",
            "Su usuario fue creado satisfactoriamente.",
            "Volver al Inicio",
            () => document.getElementById("returnLoginLink").click()
        );
    } catch (err) {
        handleAxiosError(err);
    } finally {
        createAccountButton.disabled = false;
    }
});