/**
 *
 * Reldens - Admin Client JS
 *
 */

if(window.trustedTypes?.createPolicy){
    trustedTypes.createPolicy('default', {createHTML: s => s});
}

window.addEventListener('DOMContentLoaded', () => {

    // helpers:
    let location = window.location;
    let currentPath = location.pathname;
    let queryString = location.search;
    let urlParams = new URLSearchParams(queryString);

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

    activateExpandCollapse();

    activateModalElements();

    // login errors:
    if('true' === urlParams.get('login-error')){
        let loginErrorBox = document.querySelector('form.login-form .response-error');
        if(loginErrorBox){
            loginErrorBox.innerHTML = 'Login error, please try again.';
        }
    }

    // entity search functionality:
    let entityFilterTerm = document.querySelector('#entityFilterTerm');
    let filterForm = document.querySelector('#filter-form');
    let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
    if(entityFilterTerm && filterForm){
        entityFilterTerm.addEventListener('input', () => {
            if(entityFilterTerm.value){
                for(let filterInput of allFilters){
                    filterInput.value = '';
                }
            }
        });
        entityFilterTerm.addEventListener('keypress', (event) => {
            if(13 === event.keyCode){
                event.preventDefault();
                filterForm.submit();
            }
        });
        for(let filterInput of allFilters){
            filterInput.addEventListener('input', () => {
                if(filterInput.value){
                    entityFilterTerm.value = '';
                }
            });
        }
        filterForm.addEventListener('submit', () => {
            if(entityFilterTerm.value && allFilters.some(input => input.value)){
                for(let filterInput of allFilters){
                    filterInput.value = '';
                }
            }
        });
    }

    // forms behavior:
    let forms = document.querySelectorAll('form');
    if(forms){
        for(let form of forms){
            form.addEventListener('submit', (event) => {
                let submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
                submitButton.disabled = true;
                let loadingImage = document.querySelector('.submit-container .loading');
                if(loadingImage){
                    loadingImage.classList.remove('hidden');
                }
                if(form.classList.contains('form-delete') || form.classList.contains('confirmation-required')){
                    event.preventDefault();
                    showConfirmDialog((confirmed) => {
                        if(confirmed){
                            form.submit();
                        }
                        if(!confirmed){
                            submitButton.disabled = false;
                            if(loadingImage){
                                loadingImage.classList.add('hidden');
                            }
                        }
                    });
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
        let entitySearchInput = document.querySelector('#entityFilterTerm');
        let hasEntitySearch = entitySearchInput && '' !== entitySearchInput.value;
        let activeFilters = Array.from(allFilters).filter(input => '' !== input.value);
        if(0 < activeFilters.length || hasEntitySearch){
            filtersToggleContent.classList.remove('hidden');
        }
        let paginationLinks = document.querySelectorAll('.pagination a');
        if(paginationLinks && filterForm){
            for(let link of paginationLinks){
                link.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    let url = new URL(link.href);
                    let params = new URLSearchParams(url.search);
                    if(entitySearchInput && entitySearchInput.value){
                        params.set('entityFilterTerm', entitySearchInput.value);
                    }
                    for(let filterInput of allFilters){
                        if(filterInput.value){
                            let filterName = filterInput.name;
                            params.set(filterName, filterInput.value);
                        }
                    }
                    let newUrl = url.pathname + '?' + params;
                    window.location.href = newUrl;
                    return false;
                })
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
        listDeleteSelection.addEventListener('click', (event) => {
            event.preventDefault();
            showConfirmDialog((confirmed) => {
                if(confirmed){
                    let checkboxes = document.querySelectorAll('.ids-checkbox');
                    let ids = [];
                    for(let checkbox of checkboxes){
                        if(checkbox.checked){
                            ids.push(parseInt(checkbox.value));
                        }
                    }
                    if(0 === ids.length){
                        return;
                    }
                    deleteSelectionForm.innerHTML = '';
                    for(let id of ids){
                        let input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'ids[]';
                        input.value = id;
                        deleteSelectionForm.appendChild(input);
                    }
                    deleteSelectionForm.submit();
                }
            });
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

    // cache clear all functionality:
    let cacheClearAllButton = document.querySelector('.cache-clear-all-button');
    let cacheClearForm = document.querySelector('.cache-clear-form');
    if(cacheClearAllButton){
        cacheClearAllButton.addEventListener('click', () => {
            showConfirmDialog((confirmed) => {
                if(confirmed && cacheClearForm){
                    let submitButton = cacheClearForm.querySelector('button[type="submit"]');
                    if(submitButton){
                        submitButton.disabled = true;
                    }
                    cacheClearForm.submit();
                }
            });
        });
    }

});
