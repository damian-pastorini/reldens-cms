/**
 *
 * Reldens - CMS - TranslateTransformer
 *
 */

const { TranslationService } = require('./translation-service');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TranslateTransformer
{

    constructor(props)
    {
        let projectRoot = sc.get(props, 'projectRoot', './');
        let translationsPath = FileHandler.joinPaths(projectRoot, 'translations');
        this.translationService = new TranslationService({
            translationsPath,
            defaultLocale: sc.get(props, 'defaultLocale', 'en'),
            fallbackLocale: sc.get(props, 'fallbackLocale', 'en')
        });
    }

    async transform(template, domain, req, systemVariables)
    {
        if(!template){
            return template;
        }
        let currentLocale = this.extractLocaleFromSystemVariables(systemVariables);
        let translatePattern = /(?:translate|t)\(([^)]+)\)/g;
        let matches = [...template.matchAll(translatePattern)];
        for(let i = matches.length - 1; i >= 0; i--){
            let match = matches[i];
            let args = this.parseTranslateArgs(match[1]);
            let translatedText = await this.translationService.translate(
                args.key,
                currentLocale,
                args.defaultValue,
                args.interpolations
            );
            template = template.substring(0, match.index) +
                translatedText +
                template.substring(match.index + match[0].length);
        }
        return template;
    }

    parseTranslateArgs(argsString)
    {
        let args = argsString.split(',').map(arg => arg.trim().replace(/['"]/g, ''));
        return {
            key: args[0] || '',
            defaultValue: args[1] || '',
            interpolations: this.parseInterpolations(args[2])
        };
    }

    parseInterpolations(interpolationsStr)
    {
        if(!interpolationsStr){
            return {};
        }
        let interpolations = {};
        let pairs = interpolationsStr.replace(/[{}]/g, '').split(',');
        for(let pair of pairs){
            let keyValue = pair.split(':');
            if(2 === keyValue.length){
                interpolations[keyValue[0].trim()] = keyValue[1].trim();
            }
        }
        return interpolations;
    }

    extractLocaleFromSystemVariables(systemVariables)
    {
        let currentRequest = sc.get(systemVariables, 'currentRequest', {});
        let headers = sc.get(currentRequest, 'headers', {});
        let acceptLanguage = sc.get(headers, 'accept-language', '');
        if(acceptLanguage){
            let primaryLanguage = acceptLanguage.split(',')[0];
            if(primaryLanguage && primaryLanguage.includes('-')){
                return primaryLanguage.split('-')[0];
            }
            if(primaryLanguage){
                return primaryLanguage;
            }
        }
        let locale = sc.get(currentRequest, 'query', {}).locale;
        if(locale){
            return locale;
        }
        return this.translationService.defaultLocale;
    }

}

module.exports.TranslateTransformer = TranslateTransformer;
