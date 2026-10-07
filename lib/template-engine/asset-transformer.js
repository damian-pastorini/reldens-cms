/**
 *
 * Reldens - CMS - AssetTransformer
 *
 */

const { PathFunctionTransformer } = require('./path-function-transformer');
const { AssetVersionResolver } = require('./asset-version-resolver');
const { sc } = require('@reldens/utils');

class AssetTransformer extends PathFunctionTransformer
{

    constructor()
    {
        super(/\[asset\(([^)]+)\)\]/g);
    }

    buildUrl(assetPath, currentRequest, publicPath)
    {
        if(!assetPath || assetPath.startsWith('http')){
            return assetPath;
        }
        return AssetVersionResolver.buildVersionedUrl(
            sc.get(currentRequest, 'assetUrl', ''),
            publicPath,
            '/assets'+(assetPath.startsWith('/') ? assetPath : '/'+assetPath)
        );
    }

}

module.exports.AssetTransformer = AssetTransformer;
