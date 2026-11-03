/**
 *
 * Reldens - CMS - AssetVersionResolver
 *
 */

const { FileHandler, Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class AssetVersionResolver
{

    constructor()
    {
        this.hashAlgorithm = 'md5';
        this.versionParameter = 'v';
        this.versions = {};
    }

    buildVersionedUrl(baseUrl, publicPath, publicFilePath)
    {
        let url = baseUrl+publicFilePath;
        if(!publicPath){
            return url;
        }
        if(-1 !== url.indexOf('?')){
            return url;
        }
        let version = this.fetchVersion(FileHandler.joinPaths(publicPath, publicFilePath));
        if(!version){
            return url;
        }
        return url+'?'+this.versionParameter+'='+version;
    }

    fetchVersion(filePath)
    {
        let fileStats = FileHandler.getFileStats(filePath);
        if(!fileStats){
            return '';
        }
        if(!fileStats.isFile()){
            return '';
        }
        let cachedVersion = sc.get(this.versions, filePath, false);
        if(cachedVersion && cachedVersion.modifiedTime === fileStats.mtimeMs){
            return cachedVersion.hash;
        }
        let hash = Encryptor.hashData(FileHandler.readFile(filePath), this.hashAlgorithm);
        if(!hash){
            return '';
        }
        this.versions[filePath] = {modifiedTime: fileStats.mtimeMs, hash};
        return hash;
    }

}

module.exports.AssetVersionResolver = new AssetVersionResolver();
