/**
 * Reldens - CMS - Scripts
 */

document.addEventListener('DOMContentLoaded', function() {
    let currentPath = window.location.pathname;

    let navLinks = document.querySelectorAll('nav a');
    for(let link of navLinks){
        if(link.getAttribute('href') === currentPath){
            link.classList.add('active');
        }
    }
});
