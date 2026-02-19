/**
 *
 * Reldens - CMS - TranslationService
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TranslationService
{

    constructor(props)
    {
        this.translationsPath = sc.get(props, 'translationsPath', './translations');
        this.defaultLocale = sc.get(props, 'defaultLocale', 'en');
        this.fallbackLocale = sc.get(props, 'fallbackLocale', 'en');
        this.translations = new Map();
        this.loadedLocales = new Set();
    }

    async loadTranslations(locale)
    {
        if(this.loadedLocales.has(locale)){
            return true;
        }
        let translationFile = FileHandler.joinPaths(this.translationsPath, locale + '.json');
        if(!FileHandler.exists(translationFile)){
            if(locale !== this.fallbackLocale){
                Logger.warning('Translation file not found for locale: '+locale+', loading fallback');
                return await this.loadTranslations(this.fallbackLocale);
            }
            Logger.warning('Translation file not found: '+translationFile);
            return false;
        }
        let translationContent = FileHandler.readFile(translationFile);
        if(!translationContent){
            Logger.error('Failed to read translation file: '+translationFile);
            return false;
        }
        let translationData = sc.toJson(translationContent, {});
        if(!translationData){
            Logger.error('Invalid JSON in translation file: '+translationFile);
            return false;
        }
        this.translations.set(locale, translationData);
        this.loadedLocales.add(locale);
        return true;
    }

    async translate(key, locale, defaultValue, interpolations)
    {
        let targetLocale = locale || this.defaultLocale;
        if(!this.loadedLocales.has(targetLocale)){
            await this.loadTranslations(targetLocale);
        }
        let translations = this.translations.get(targetLocale);
        let translatedText = this.getNestedTranslation(translations, key);
        if(!translatedText && targetLocale !== this.fallbackLocale){
            if(!this.loadedLocales.has(this.fallbackLocale)){
                await this.loadTranslations(this.fallbackLocale);
            }
            let fallbackTranslations = this.translations.get(this.fallbackLocale);
            translatedText = this.getNestedTranslation(fallbackTranslations, key);
        }
        if(!translatedText){
            translatedText = defaultValue || key;
        }
        if(interpolations && sc.isObject(interpolations)){
            translatedText = this.interpolateString(translatedText, interpolations);
        }
        return translatedText;
    }

    getNestedTranslation(translations, key)
    {
        if(!translations || !key){
            return null;
        }
        let keys = key.split('.');
        let current = translations;
        for(let keyPart of keys){
            if(!sc.hasOwn(current, keyPart)){
                return null;
            }
            current = current[keyPart];
        }
        return sc.isString(current) ? current : null;
    }

    interpolateString(text, interpolations)
    {
        let result = text;
        for(let key of Object.keys(interpolations)){
            let placeholder = '{' + key + '}';
            let value = interpolations[key];
            result = result.replace(new RegExp(sc.sanitize(placeholder), 'g'), value);
        }
        return result;
    }

}

module.exports.TranslationService = TranslationService;
