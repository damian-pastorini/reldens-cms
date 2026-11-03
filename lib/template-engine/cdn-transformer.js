/**
 *
 * Reldens - CMS - CdnTransformer
 *
 */

const { PathFunctionTransformer } = require('./path-function-transformer');
const { AssetVersionResolver } = require('./asset-version-resolver');
const { sc } = require('@reldens/utils');

class CdnTransformer extends PathFunctionTransformer
{

    constructor()
    {
        super(/\[cdn\(([^)]+)\)\]/g);
    }

    buildUrl(cdnPath, currentRequest, publicPath)
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
        return AssetVersionResolver.buildVersionedUrl(
            assetUrl ? assetUrl : publicUrl,
            publicPath,
            cdnPath.startsWith('/') ? cdnPath : '/'+cdnPath
        );
    }

}

module.exports.CdnTransformer = CdnTransformer;
