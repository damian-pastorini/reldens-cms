/**
 *
 * Reldens CMS - Cookie Consent - GDPR-compliant with granular controls
 *
 */

window.gtmID = 'GTM-XXXXXXXX';

let CookieConsent = {
    config: {
        storageKey: 'reldens_cookie_consent',
        preferencesKey: 'reldens_cookie_preferences',
        gtmId: window.gtmID || null,
        gaId: window.gaID || 'G-XXXXXXX',
        privacyPolicyUrl: '/privacy',
        waitForUpdate: 500,
        useGTM: false
    },

    elements: {
        banner: null,
        acceptBtn: null,
        rejectBtn: null,
        customizeBtn: null,
        manageBtn: null,
        preferencesModal: null,
        savePreferencesBtn: null,
        cancelPreferencesBtn: null
    },

    categories: {
        essential: {
            name: 'Essential Cookies',
            description: 'Required for basic site functionality and cannot be disabled.',
            required: true,
            enabled: true
        },
        analytics: {
            name: 'Analytics Cookies',
            description: 'Help us understand how visitors interact with our website.',
            required: false,
            enabled: false
        },
        marketing: {
            name: 'Marketing Cookies',
            description: 'Used to track visitors across websites for personalized advertising.',
            required: false,
            enabled: false
        }
    },

    init()
    {
        this.detectTrackingMethod();
        if('undefined' === typeof window.dataLayer){
            window.dataLayer = [];
        }
        if('undefined' === typeof window.gtag){
            window.gtag = function() { window.dataLayer.push(arguments); };
        }
        this.setDefaultConsent();
        this.initElements();
        this.bindEvents();
        this.checkExistingConsent();
    },

    detectTrackingMethod()
    {
        if(this.config.gtmId){
            this.config.useGTM = true;
            return;
        }
        this.config.useGTM = false;
    },

    setDefaultConsent()
    {
        window.gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: this.config.waitForUpdate
        });
    },

    initElements()
    {
        this.elements.banner = document.getElementById('cookie-banner');
        this.elements.acceptBtn = document.getElementById('accept-cookies');
        this.elements.rejectBtn = document.getElementById('reject-cookies');
        this.elements.customizeBtn = document.getElementById('customize-cookies');
        this.elements.manageBtn = document.getElementById('manage-cookies');
        this.elements.preferencesModal = document.getElementById('cookie-preferences');
        this.elements.savePreferencesBtn = document.getElementById('save-preferences');
        this.elements.cancelPreferencesBtn = document.getElementById('cancel-preferences');
    },

    bindEvents()
    {
        if(this.elements.acceptBtn){
            this.elements.acceptBtn.onclick = () => this.acceptAll();
        }
        if(this.elements.rejectBtn){
            this.elements.rejectBtn.onclick = () => this.rejectAll();
        }
        if(this.elements.customizeBtn){
            this.elements.customizeBtn.onclick = () => this.showPreferences();
        }
        if(this.elements.manageBtn){
            this.elements.manageBtn.onclick = () => this.showPreferences();
        }
        if(this.elements.savePreferencesBtn){
            this.elements.savePreferencesBtn.onclick = () => this.savePreferences();
        }
        if(this.elements.cancelPreferencesBtn){
            this.elements.cancelPreferencesBtn.onclick = () => this.hidePreferences();
        }
        if(this.elements.preferencesModal){
            this.elements.preferencesModal.onclick = (e) => {
                if(e.target === this.elements.preferencesModal){
                    this.hidePreferences();
                }
            };
        }
        document.addEventListener('keydown', (e) => {
            if(
                27 === e.keyCode && this.elements.preferencesModal
                && !this.elements.preferencesModal.classList.contains('hidden')
            ){
                this.hidePreferences();
            }
        });
    },

    checkExistingConsent()
    {
        let savedConsent = this.getStoredConsent();
        if(!savedConsent){
            this.showBanner();
            return;
        }
        this.loadSavedPreferences();
        this.updateConsentMode();
        if(this.shouldLoadAnalytics()){
            this.loadAnalytics();
        }
    },

    getStoredConsent()
    {
        try {
            return localStorage.getItem(this.config.storageKey);
        } catch(e) {
            return null;
        }
    },

    getStoredPreferences()
    {
        try {
            let stored = localStorage.getItem(this.config.preferencesKey);
            if(stored){
                return JSON.parse(stored);
            }
            return null;
        } catch(e) {
            return null;
        }
    },

    saveConsent(value)
    {
        try {
            localStorage.setItem(this.config.storageKey, value);
            return true;
        } catch(e) {
            return false;
        }
    },

    savePreferencesToStorage(preferences)
    {
        try {
            localStorage.setItem(this.config.preferencesKey, JSON.stringify(preferences));
            return true;
        } catch(e) {
            return false;
        }
    },

    loadSavedPreferences()
    {
        let saved = this.getStoredPreferences();
        if(!saved){
            return;
        }
        for(let categoryKey of Object.keys(this.categories)){
            if(saved.hasOwnProperty(categoryKey)){
                this.categories[categoryKey].enabled = saved[categoryKey];
            }
        }
    },

    showBanner()
    {
        if(!this.elements.banner){
            return;
        }
        this.elements.banner.classList.remove('hidden');
        this.elements.banner.classList.add('animate-in');
        this.elements.banner.setAttribute('aria-hidden', 'false');
        let firstButton = this.elements.banner.querySelector('button');
        if(firstButton){
            firstButton.focus();
        }
    },

    hideBanner()
    {
        if(!this.elements.banner){
            return;
        }
        this.elements.banner.classList.add('animate-out');
        this.elements.banner.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            this.elements.banner.classList.add('hidden');
            this.elements.banner.classList.remove('animate-in', 'animate-out');
        }, 300);
    },

    showPreferences()
    {
        if(!this.elements.preferencesModal){
            return;
        }
        this.updatePreferencesUI();
        this.elements.preferencesModal.classList.remove('hidden');
        this.elements.preferencesModal.setAttribute('aria-hidden', 'false');
        let firstInput = this.elements.preferencesModal.querySelector('input, button');
        if(firstInput){
            firstInput.focus();
        }
        this.hideBanner();
    },

    hidePreferences()
    {
        if(!this.elements.preferencesModal){
            return;
        }
        this.elements.preferencesModal.classList.add('hidden');
        this.elements.preferencesModal.setAttribute('aria-hidden', 'true');
    },

    updatePreferencesUI()
    {
        for(let categoryKey of Object.keys(this.categories)){
            let toggle = document.getElementById('cookie-' + categoryKey);
            if(toggle){
                toggle.checked = this.categories[categoryKey].enabled;
                toggle.disabled = this.categories[categoryKey].required;
            }
        }
    },

    acceptAll()
    {
        for(let categoryKey of Object.keys(this.categories)){
            this.categories[categoryKey].enabled = true;
        }
        this.saveConsent('granted');
        this.saveCurrentPreferences();
        this.updateConsentMode();
        this.loadAnalytics();
        this.hideBanner();
    },

    rejectAll()
    {
        for(let categoryKey of Object.keys(this.categories)){
            this.categories[categoryKey].enabled = this.categories[categoryKey].required;
        }
        this.saveConsent('denied');
        this.saveCurrentPreferences();
        this.updateConsentMode();
        this.hideBanner();
    },

    savePreferences()
    {
        this.readPreferencesFromUI();
        this.saveCurrentPreferences();
        let hasAnalytics = this.categories.analytics.enabled;
        let hasMarketing = this.categories.marketing.enabled;
        if(hasAnalytics || hasMarketing){
            this.saveConsent('granted');
            this.updateConsentMode();
            if(hasAnalytics){
                this.loadAnalytics();
            }
        } else {
            this.saveConsent('denied');
            this.updateConsentMode();
        }
        this.hidePreferences();
    },

    readPreferencesFromUI()
    {
        for(let categoryKey of Object.keys(this.categories)){
            let toggle = document.getElementById('cookie-' + categoryKey);
            if(toggle && !this.categories[categoryKey].required){
                this.categories[categoryKey].enabled = toggle.checked;
            }
        }
    },

    saveCurrentPreferences()
    {
        let preferences = {};
        for(let categoryKey of Object.keys(this.categories)){
            preferences[categoryKey] = this.categories[categoryKey].enabled;
        }
        this.savePreferencesToStorage(preferences);
    },

    updateConsentMode()
    {
        let analyticsStorage = this.categories.analytics.enabled ? 'granted' : 'denied';
        let adStorage = this.categories.marketing.enabled ? 'granted' : 'denied';
        window.gtag('consent', 'update', {
            analytics_storage: analyticsStorage,
            ad_storage: adStorage,
            ad_user_data: adStorage,
            ad_personalization: adStorage
        });
    },

    shouldLoadAnalytics()
    {
        return this.categories.analytics.enabled;
    },

    loadAnalytics()
    {
        if(this.config.useGTM){
            this.loadGTM();
            return;
        }
        this.loadGA();
    },

    loadGTM()
    {
        if(document.querySelector('script[src*="googletagmanager.com/gtm.js"]')){
            return;
        }
        let script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtm.js?id=' + this.config.gtmId;
        script.async = true;
        script.onload = () => {
            window.gtag('js', new Date());
            window.gtag('config', this.config.gtmId);
        };
        document.head.appendChild(script);
        let noscript = document.createElement('noscript');
        let iframe = document.createElement('iframe');
        iframe.src = 'https://www.googletagmanager.com/ns.html?id=' + this.config.gtmId;
        iframe.height = '0';
        iframe.width = '0';
        iframe.style.display = 'none';
        iframe.style.visibility = 'hidden';
        noscript.appendChild(iframe);
        document.body.appendChild(noscript);
    },

    loadGA()
    {
        if(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')){
            return;
        }
        let script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + this.config.gaId;
        script.async = true;
        script.onload = () => {
            window.gtag('js', new Date());
            window.gtag('config', this.config.gaId, {
                anonymize_ip: true,
                allow_google_signals: this.categories.marketing.enabled,
                allow_ad_personalization_signals: this.categories.marketing.enabled
            });
        };
        document.head.appendChild(script);
    },

    reset()
    {
        try {
            localStorage.removeItem(this.config.storageKey);
            localStorage.removeItem(this.config.preferencesKey);
            location.reload();
        } catch(e) {
            location.reload();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CookieConsent.init();
});
