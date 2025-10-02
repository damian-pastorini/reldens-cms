/**
 *
 * Reldens - CMS - CdnTransformer
 *
 */

const { sc } = require('@reldens/utils');

class CdnTransformer
{

    async transform(template, domain, req, systemVariables)
    {
        if(!template){
            return template;
        }
        let currentRequest = sc.get(systemVariables, 'currentRequest', {});
        let cdnPattern = /\[cdn\(([^)]+)\)\]/g;
        let matches = [...template.matchAll(cdnPattern)];
        for(let i = matches.length - 1; i >= 0; i--){
            let match = matches[i];
            let cdnPath = match[1].replace(/['"]/g, '');
            let absoluteUrl = this.buildCdnUrl(cdnPath, currentRequest);
            template = template.substring(0, match.index)+absoluteUrl+template.substring(match.index+match[0].length);
        }
        return template;
    }

    buildCdnUrl(cdnPath, currentRequest)
    {
        // if the path is a url, we will not transform it:
        if(cdnPath && cdnPath.startsWith('http')){
            return cdnPath;
        }
        let assetUrl = sc.get(currentRequest, 'assetUrl', '');
        let publicUrl = sc.get(currentRequest, 'publicUrl', '');
        if(!cdnPath){
            if(assetUrl){
                return assetUrl;
            }
            return publicUrl;
        }
        let normalizedPath = cdnPath.startsWith('/') ? cdnPath : '/'+cdnPath;
        if(assetUrl){
            return assetUrl+normalizedPath;
        }
        return publicUrl+normalizedPath;
    }

}

module.exports.CdnTransformer = CdnTransformer;
