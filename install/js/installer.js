
document.addEventListener('DOMContentLoaded', function() {
    let urlParams = new URL(window.location.href).searchParams;
    if ('1' === urlParams.get('success')) {
        document.querySelector('.forms-container').style.display = 'none';
        let newLink = document.createElement('a');
        newLink.href = '/';
        newLink.innerHTML = 'Installation successful, click here to open your CMS!';
        newLink.classList.add('installation-successful');
        document.querySelector('.content').append(newLink);
    }

    let errorCode = (urlParams.get('error') || '').toString();
    if ('' !== errorCode) {
        let errorElement = document.querySelector('.' + errorCode);
        if (errorElement) {
            errorElement.style.display = 'block';
        }
    }

    document.getElementById('install-form').addEventListener('submit', () => {
        let loadingImage = document.querySelector('.install-loading');
        if (loadingImage) {
            loadingImage.classList.remove('hidden');
        }
        let installButton = document.getElementById('install-submit-button');
        if (installButton) {
            installButton.classList.add('disabled');
            installButton.disabled = true;
        }
    });
});
