/**
 *
 * Reldens - CMS - UrlTransformer
 *
 */

const { sc } = require('@reldens/utils');

class UrlTransformer
{

    async transform(template, domain, req, systemVariables)
    {
        if(!template){
            return template;
        }
        let currentRequest = sc.get(systemVariables, 'currentRequest', {});
        let urlPattern = /url\(([^)]+)\)/g;
        let matches = [...template.matchAll(urlPattern)];
        for(let i = matches.length - 1; i >= 0; i--){
            let match = matches[i];
            let urlPath = match[1].replace(/['"]/g, '');
            let absoluteUrl = this.buildAbsoluteUrl(urlPath, currentRequest);
            template = template.substring(0, match.index) +
                absoluteUrl +
                template.substring(match.index + match[0].length);
        }
        return template;
    }

    buildAbsoluteUrl(relativePath, currentRequest)
    {
        if(!relativePath || relativePath.startsWith('http')){
            return relativePath;
        }
        let cleanPath = relativePath.startsWith('/') ? relativePath : '/'+relativePath;
        return sc.get(currentRequest, 'baseUrl', '') + cleanPath;
    }

}

module.exports.UrlTransformer = UrlTransformer;
