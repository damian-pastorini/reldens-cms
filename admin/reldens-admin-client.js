/**
 *
 * Reldens - Admin Client JS
 *
 */

window.addEventListener('DOMContentLoaded', () => {

    // helpers:
    let location = window.location;
    let currentPath = location.pathname;
    let queryString = location.search;
    let urlParams = new URLSearchParams(queryString);

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

    // error codes messages map:
    let errorMessages = {
        saveBadPatchData: 'Bad patch data on update.',
        saveEntityStorageError: 'Entity storage error.',
        saveEntityError: 'Entity could not be saved.',
        shutdownError: 'Server could not be shutdown, missing "shutdownTime".',
        errorView: 'Could not render view page.',
        errorEdit: 'Could not render edit page.',
        errorId: 'Missing entity ID on POST.'
    };

    // copyright year:
    let copyRightYear = document.querySelector('.copyright-year');
    if(copyRightYear){
        copyRightYear.innerHTML = String((new Date()).getFullYear());
    }

    // activate expand/collapse elements
    let expandCollapseButtons = document.querySelectorAll('[data-expand-collapse]');
    if(expandCollapseButtons){
        for(let expandCollapseButton of expandCollapseButtons){
            expandCollapseButton.addEventListener('click', (event) => {
                let expandCollapseElement = document.querySelector(event.currentTarget.dataset.expandCollapse);
                if(expandCollapseElement){
                    expandCollapseElement.classList.toggle('hidden');
                }
            });
        }
    }

    // activate modals on click
    let modalElements = document.querySelectorAll('[data-toggle="modal"]');
    if(modalElements){
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
                    if(e.target === modal){
                        document.body.removeChild(modal.parentNode);
                    }
                });
                overlay.addEventListener('click', (e) => {
                    if(e.target === overlay) {
                        document.body.removeChild(overlay);
                    }
                });
            });
        }
    }

    // login errors:
    if('true' === urlParams.get('login-error')){
        let loginErrorBox = document.querySelector('form.login-form .response-error');
        if(loginErrorBox){
            loginErrorBox.innerHTML = 'Login error, please try again.';
        }
    }

    // forms behavior:
    let forms = document.querySelectorAll('form');
    if(forms){
        for(let form of forms){
            form.addEventListener('submit', (event) => {
                let submitButton = document.querySelector('input[type="submit"]');
                submitButton.disabled = true;
                let loadingImage = document.querySelector('.submit-container .loading');
                if(loadingImage){
                    loadingImage.classList.remove('hidden');
                }
                if(form.classList.contains('form-delete') || form.classList.contains('confirmation-required')){
                    if(!confirm('Are you sure?')){
                        event.preventDefault();
                        submitButton.disabled = false;
                        loadingImage.classList.add('hidden');
                    }
                }
            });
        }
    }

    // sidebar headers click behavior:
    let sideBarHeaders = document.querySelectorAll('.with-sub-items h3');
    if(sideBarHeaders){
        for(let header of sideBarHeaders){
            header.addEventListener('click', (event) => {
                event.currentTarget.parentNode.classList.toggle('active');
            });
        }
    }

    // expand menu on load:
    let subItemContainers = document.querySelectorAll('.with-sub-items');
    if(subItemContainers){
        let done = false;
        for(let container of subItemContainers){
            let links = container.querySelectorAll('.side-bar-item a');
            for(let link of links){
                let linkWithoutHost = link.href.replace(location.host, '').replace(location.protocol+'//', '');
                if(currentPath === linkWithoutHost || 0 === currentPath.indexOf(linkWithoutHost+'/')){
                    link.parentNode.classList.add('active');
                    container.classList.add('active');
                    done = true;
                    break;
                }
            }
            if(done){
                break;
            }
        }
    }

    // filters toggle visibility:
    let filtersToggle = document.querySelector('.filters-toggle');
    let filtersToggleContent = document.querySelector('.filters-toggle-content');
    if(filtersToggle && filtersToggleContent){
        filtersToggle.addEventListener('click', () => {
            filtersToggle.classList.toggle('active');
            filtersToggleContent.classList.toggle('hidden');
        });
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        let activeFilters = Array.from(allFilters).filter(input => '' !== input.value);
        if(0 < activeFilters.length){
            filtersToggleContent.classList.remove('hidden');
            let paginationLinks = document.querySelectorAll('.pagination a');
            let filtersForm = document.querySelector('#filter-form');
            if(paginationLinks && filtersForm){
                for(let link of paginationLinks){
                    link.addEventListener('click', (event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        filtersForm.action = link.href;
                        filtersForm.submit();
                        return false;
                    })
                }
            }
        }
    }

    // list "select all" option:
    let listSelect = document.querySelector('.list-select');
    if(listSelect){
        listSelect.addEventListener('click', (event) => {
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            for(let checkbox of checkboxes){
                checkbox.checked = 1 === Number(event.currentTarget.dataset.checked);
            }
            event.currentTarget.dataset.checked = 1 === Number(event.currentTarget.dataset.checked) ? 0 : 1;
        });
    }

    // list delete selection:
    let listDeleteSelection = document.querySelector('.list-delete-selection');
    let deleteSelectionForm = document.getElementById('delete-selection-form');
    let hiddenInput = document.querySelector('.hidden-ids-input');
    if(listDeleteSelection && deleteSelectionForm && hiddenInput){
        listDeleteSelection.addEventListener('click', () => {
            if(!confirm('Are you sure?')){
                return;
            }
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            let ids = [];
            for(let checkbox of checkboxes){
                if(checkbox.checked){
                    ids.push(checkbox.value);
                }
            }
            hiddenInput.value = ids.join(',');
            deleteSelectionForm.submit();
        });
    }

    // display notifications from query params:
    let notificationElement = document.querySelector('.notification');
    if(notificationElement){
        let closeNotificationElement = document.querySelector('.notification .close');
        closeNotificationElement?.addEventListener('click', () => {
            notificationElement.classList.remove('success', 'error');
        });
        let queryParams = new URLSearchParams(location.search);
        let result = queryParams.get('result');
        if(!result){
            result = getCookie('result');
        }
        let notificationMessageElement = document.querySelector('.notification .message');
        if(result && notificationMessageElement){
            let notificationClass = 'success' === result ? 'success' : 'error';
            notificationMessageElement.innerHTML = '';
            notificationElement.classList.add(notificationClass);
            notificationMessageElement.innerHTML = 'success' === result
                ? 'Success!'
                : 'There was an error: '+escapeHTML(errorMessages[result] || result);
            deleteCookie('result');
        }
    }

    // shutdown timer:
    let shuttingDownTimeElement = document.querySelector('.shutting-down .shutting-down-time');
    if(shuttingDownTimeElement){
        let shuttingDownTime = shuttingDownTimeElement.getAttribute('data-shutting-down-time');
        if(shuttingDownTime){
            shuttingDownTimeElement.innerHTML = escapeHTML(String(shuttingDownTime))+'s';
            shuttingDownTime = Number(shuttingDownTime);
            let shuttingDownTimer = setInterval(
                () => {
                    shuttingDownTimeElement.innerHTML = escapeHTML(String(shuttingDownTime))+'s';
                    shuttingDownTime--;
                    if(0 === Number(shuttingDownTime)){
                        clearInterval(shuttingDownTimer);
                    }
                },
                1000
            );
        }
    }

});
