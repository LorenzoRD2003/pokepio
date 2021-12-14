// Para ahorrar en escritura
const getValueByID = (elemID) => document.getElementById(elemID).value;
const getSelectedOption = (selectElemID) => {
    const selectElem = document.getElementById(selectElemID);
    const selectedIndex = selectElem.selectedIndex;
    return selectElem[selectedIndex];
}
const getDatasetOfOption = (selectElemID) => getSelectedOption(selectElemID).dataset;

/**
 * Devuelve si una string esta en otra con un bool
 * @param {String} str String sobre la que buscar
 * @param {String} substr String a buscar
 * @returns true o false
 */
const isInStr = (str, substr) => str.search(substr) != -1;

/**
 * Crea un modal y lo muestra por pantalla
 * @param {String} id Id del modal
 * @param {String} title Titulo del modal
 * @param {String} text Texto del modal
 * @param {String} buttonText Texto del botón del modal
 * @param {Function} buttonCallback Función que se ejecuta al tocar el botón
 * @param {String} secondButtonText Opcional. Texto del segundo botón del modal
 * @param {Function} secondButtonCallback Opcional. Función que se ejecuta al tocar el segundo botón
 */
const createModal = (id, title, text, buttonText, buttonCallback, secondButtonText = undefined, secondButtonCallback = undefined) => {
    const modalContainer = document.getElementById('modalContainer');
    modalContainer.innerHTML = `
    <div class="modal fade" id="${id}" data-keyboard="false" data-backdrop="static">
        <div class="modal-dialog">    
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${id}Label">${title}</h5>
                </div>
                <div class="modal-body">
                    ${text}
                </div>
                <div id="${id}Footer" class="modal-footer">
                    <button id="${id}Button" type="button" class="btn btn-primary" data-bs-dismiss="modal">${buttonText}</button>
                </div>
            </div>
        </div>
    </div>`;

    document.getElementById(`${id}Button`).onclick = buttonCallback;
    if (secondButtonText) {
        document.getElementById(`${id}Footer`).innerHTML += `
        <button id="${id}Button2" type="button" class="btn btn-danger" data-bs-dismiss="modal">${secondButtonText}</button>`;
        document.getElementById(`${id}Button`).onclick = buttonCallback;
        document.getElementById(`${id}Button2`).onclick = secondButtonCallback;
    }

    $(`#${id}`).modal({ backdrop: 'static', keyboard: false });
    $(`#${id}`).modal("show");
};

const createErrorModal = (id, errorMessage) => createModal(id, "¡Alerta!", errorMessage, "Cerrar", () => $(`#${id}`).modal("hide"));
const createSuccessModal = (id, successMessage) => createModal(id, "¡Felicidades!", successMessage, "Cerrar", $(`#${id}`).modal("hide"));

// Activar y desactivar un botón
const enableButton = (buttonID) => document.getElementById(`${buttonID}`).disabled = false;
const disableButton = (buttonID) => document.getElementById(`${buttonID}`).disabled = true;

// Validación de los datos en el registro
const validateEmail = (email) => {
    const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    return emailRegex.test(email);
}
const validateUsername = (username) => username.length >= 8;
const validatePassword = (password) => {
    return password.length >= 8;
    // agregar minimo de un numero, una mayuscula, una minuscula
}
const fullUserValidation = (email, username, password) => {
    if (!validateEmail(email)) {
        createErrorModal("errorCreatingAccountModal", "El email ingresado es incorrecto.");
        return false;
    }
    if (!validateUsername(username)) {
        createErrorModal("errorCreatingAccountModal", "El nombre de usuario debe tener al menos 8 caracteres.");
        return false;
    }
    if (!validatePassword(password)) {
        createErrorModal("errorCreatingAccountModal", "La contraseña debe tener al menos 8 caracteres.");
        return false;
    }
    return true;
};

const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const enforceMinMax = (elem) => {
    if (elem.value != "") {
        if (parseInt(elem.value) < parseInt(elem.min)) {
            elem.value = elem.min;
        }
        if (parseInt(elem.value) > parseInt(elem.max)) {
            elem.value = elem.max;
        }
    } else {
        elem.value = "0";
    }
}
