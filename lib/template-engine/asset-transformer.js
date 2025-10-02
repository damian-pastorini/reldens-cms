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
        // if the path is a url, we will not transform it:
        if(assetPath && assetPath.startsWith('http')){
            return assetPath;
        }
        let assetUrl = sc.get(currentRequest, 'assetUrl', '');
        let publicUrl = sc.get(currentRequest, 'publicUrl', '');
        if(!assetPath){
            if(assetUrl){
                return assetUrl;
            }
            return '';
        }
        let normalizedPath = assetPath.startsWith('/') ? assetPath : '/'+assetPath;
        if(assetUrl){
            return assetUrl+normalizedPath;
        }
        return publicUrl+'/assets'+normalizedPath;
    }

}

module.exports.AssetTransformer = AssetTransformer;
