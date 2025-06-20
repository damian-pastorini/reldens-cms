/**
 *
 * Reldens - CMS - CacheManager
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class CacheManager
{

    constructor(props = {})
    {
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.cacheBasePath = FileHandler.joinPaths(this.projectRoot, '.reldens_cms_cache');
        this.enabled = sc.get(props, 'enabled', true);
    }

    generateCacheKey(domain, path)
    {
        let domainFolder = domain || 'default';
        let pathSegments = path.split('/').filter(segment => '' !== segment);
        if(0 === pathSegments.length){
            pathSegments = ['index'];
        }
        let fileName = pathSegments.pop() + '.html';
        let folderPath = FileHandler.joinPaths(this.cacheBasePath, domainFolder, ...pathSegments);
        return {
            folderPath,
            fileName,
            fullPath: FileHandler.joinPaths(folderPath, fileName)
        };
    }

    async get(domain, path)
    {
        if(!this.enabled){
            return false;
        }
        let cacheInfo = this.generateCacheKey(domain, path);
        if(!FileHandler.exists(cacheInfo.fullPath)){
            return false;
        }
        let cachedContent = FileHandler.readFile(cacheInfo.fullPath);
        if(!cachedContent){
            Logger.debug('Failed to read cached file: '+cacheInfo.fullPath);
            return false;
        }
        return cachedContent;
    }

    async set(domain, path, content)
    {
        if(!this.enabled){
            return false;
        }
        let cacheInfo = this.generateCacheKey(domain, path);
        if(!FileHandler.createFolder(cacheInfo.folderPath)){
            Logger.error('Failed to create cache folder: '+cacheInfo.folderPath);
            return false;
        }
        if(!FileHandler.writeFile(cacheInfo.fullPath, content)){
            Logger.error('Failed to write cache file: '+cacheInfo.fullPath);
            return false;
        }
        return true;
    }

    async delete(domain, path)
    {
        let cacheByDomains = this.fetchCachePathsByDomain(domain, path);
        for(let cacheInfo of cacheByDomains){
            if(!FileHandler.exists(cacheInfo.fullPath)){
                Logger.debug('File does not exist: '+cacheInfo.fullPath);
                return true;
            }
            if(!FileHandler.remove(cacheInfo.fullPath)){
                Logger.error('Failed to delete cache file: '+cacheInfo.fullPath);
                return false;
            }
        }
        return true;
    }

    fetchCachePathsByDomain(domain, path)
    {
        let cacheByDomains = [];
        if(domain && 'default' !== domain){
            cacheByDomains.push(this.generateCacheKey(domain, path));
            return cacheByDomains;
        }
        let cachedDomainFolders = FileHandler.readFolder(this.cacheBasePath);
        for(let cachedDomainFolder of cachedDomainFolders) {
            cacheByDomains.push(this.generateCacheKey(cachedDomainFolder, path));
        }
        return cacheByDomains;
    }

    async clear()
    {
        if(!FileHandler.exists(this.cacheBasePath)){
            return true;
        }
        if(!FileHandler.remove(this.cacheBasePath)){
            Logger.error('Failed to clear cache folder: '+this.cacheBasePath);
            return false;
        }
        return true;
    }

    isEnabled()
    {
        return this.enabled;
    }

    enable()
    {
        this.enabled = true;
    }

    disable()
    {
        this.enabled = false;
    }

}

module.exports.CacheManager = CacheManager;
