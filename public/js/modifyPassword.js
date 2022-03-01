const modifyPasswordButton = document.getElementById("modifyPasswordButton");
modifyPasswordButton.addEventListener("click", async () => {
    modifyPasswordButton.disabled = true;

    // Verificar que la nueva contraseña cumpla la verificación establecida
    const newPassword = getValueByID("newPassword");
    if (!validatePassword(newPassword))
        return createErrorModal("errorModal", "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.");

    // Verificar que la contraseña confirmada dos veces sea igual en ambas
    const newPasswordVerification = getValueByID("newPasswordVerification");
    if (newPassword !== newPasswordVerification)
        return createErrorModal("errorModal", "No se pudo verificar su contraseña pues las contraseñas nuevas ingresadas no son idénticas. Por favor, ingréselas nuevamente.");

    try {
        // Hago un pedido al servidor
        const res = (await nodeReq.get('/home/modifyPassword/getOldPassword')).data;

        const oldPasswordInput = getValueByID("oldPassword");
        if (oldPasswordInput != res.oldPassword)
            return createErrorModal("errorModal", "La contraseña actual ingresada no es correcta. Por favor, ingrésela nuevamente.");

        // Actualizar la contraseña con otro pedido al servidor
        const object = { newPassword: newPassword };
        await nodeReq.put('/home/modifyPassword/update', object);
        createModal(
            "modifyPasswordModal",
            "¡Felicidades!",
            "Su contraseña fue actualizada satisfactoriamente.",
            "Volver a Mi Usuario",
            () => document.getElementById("returnHomeLink").click()
        );
    } catch (err) {
        handleAxiosError(err);
    } finally {
        modifyPasswordButton.disabled = false;
    }
});