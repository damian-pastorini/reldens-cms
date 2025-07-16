/**
 *
 * Reldens - Functions
 *
 */

function getCookie(name)
{
    let value = `; ${document.cookie}`;
    let parts = value.split(`; ${name}=`);
    if(2 === parts.length){
        return parts.pop().split(';').shift()
    }
}

function deleteCookie(name)
{
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function escapeHTML(str)
{
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cloneElement(element)
{
    if(element instanceof HTMLCanvasElement){
        let clonedCanvas = document.createElement('canvas');
        clonedCanvas.width = element.width;
        clonedCanvas.height = element.height;
        let ctx = clonedCanvas.getContext('2d');
        ctx.drawImage(element, 0, 0);
        return clonedCanvas
    }
    return element.cloneNode(true);
}

function showConfirmDialog(callback)
{
    let dialog = document.querySelector('.confirm-dialog');
    if(!dialog){
        return callback(false);
    }
    dialog.showModal();
    let confirmButton = dialog.querySelector('.dialog-confirm');
    let cancelButton = dialog.querySelector('.dialog-cancel');
    let onConfirm = () => {
        dialog.close();
        callback(true);
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
    };
    let onCancel = () => {
        dialog.close();
        callback(false);
        confirmButton.removeEventListener('click', onConfirm);
        cancelButton.removeEventListener('click', onCancel);
    };
    confirmButton.addEventListener('click', onConfirm);
    cancelButton.addEventListener('click', onCancel);
}

function activateExpandCollapse()
{
    let expandCollapseButtons = document.querySelectorAll('[data-expand-collapse]');
    if(expandCollapseButtons){
        return;
    }
    for(let expandCollapseButton of expandCollapseButtons){
        expandCollapseButton.addEventListener('click', (event) => {
            let expandCollapseElement = document.querySelector(event.currentTarget.dataset.expandCollapse);
            if(expandCollapseElement){
                expandCollapseElement.classList.toggle('hidden');
            }
        });
    }
}

function activateModalElements()
{
    let modalElements = document.querySelectorAll('[data-toggle="modal"]');
    if(!modalElements){
        return;
    }
    for(let modalElement of modalElements){
        modalElement.addEventListener('click', () => {
            let overlay = document.createElement('div');
            overlay.classList.add('modal-overlay');
            let modal = document.createElement('div');
            modal.classList.add('modal');
            modal.classList.add('clickable');
            let clonedElement = cloneElement(modalElement);
            clonedElement.classList.add('clickable');
            modal.appendChild(clonedElement);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            clonedElement.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal.parentNode);
                }
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            });
        });
    }
}
