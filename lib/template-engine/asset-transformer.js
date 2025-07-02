/**
 *
 * Reldens - CMS - AssetTransformer
 *
 */

const { sc } = require('@reldens/utils');

class AssetTransformer
{

    async transform(template, domain, req, systemVariables)
    {
        if(!template){
            return template;
        }
        let currentRequest = sc.get(systemVariables, 'currentRequest', {});
        let assetPattern = /\[asset\(([^)]+)\)\]/g;
        let matches = [...template.matchAll(assetPattern)];
        for(let i = matches.length - 1; i >= 0; i--){
            let match = matches[i];
            let assetPath = match[1].replace(/['"]/g, '');
            let absoluteUrl = this.buildAssetUrl(assetPath, currentRequest);
            template = template.substring(0, match.index) +
                absoluteUrl +
                template.substring(match.index + match[0].length);
        }
        return template;
    }

    buildAssetUrl(assetPath, currentRequest)
    {
        if(!assetPath || assetPath.startsWith('http')){
            return assetPath;
        }
        return sc.get(currentRequest, 'baseUrl', '')+'/assets'+(assetPath.startsWith('/') ? assetPath : '/'+assetPath);
    }

}

module.exports.AssetTransformer = AssetTransformer;
