const modifyUserDataButton = document.getElementById("modifyUserDataButton");
modifyUserDataButton.addEventListener("click", async () => {
    modifyUserDataButton.disabled = true;

    // Pido los datos y creo un objeto con ellos
    const object = {
        real_name: getValueByID("modifyUserDataRealName"),
        age: getValueByID("modifyUserDataAge"),
        nationality: getValueByID("modifyUserDataNationality"),
        hobbies: getValueByID("modifyUserDataHobbies"),
        pokemon_favorito: getValueByID("modifyUserDataFavoritePokemon")
    }

    // Hago el pedido al servidor
    try {
        await nodeReq.put('/home/user-data', object);
        createModal(
            "modifyUserDataModal",
            "¬°Felicidades!",
            "Sus datos fueron actualizados satisfactoriamente.",
            "Volver a Mi Usuario",
            () => document.getElementById("returnHomeLink").click()
        );
    } catch (err) {
        return handleAxiosError(err);
    } finally {
        modifyUserDataButton.disabled = false;
    }
});