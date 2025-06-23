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

    findAllCacheFilesForPath(domain, path)
    {
        let cacheInfo = this.generateCacheKey(domain, path);
        if(!FileHandler.exists(cacheInfo.folderPath)){
            return [];
        }
        let allFiles = FileHandler.readFolder(cacheInfo.folderPath);
        if(0 === allFiles.length){
            return [];
        }
        let baseFileName = cacheInfo.fileName.replace('.html', '');
        let matchingFiles = [];
        for(let file of allFiles){
            if(file === cacheInfo.fileName){
                matchingFiles.push(FileHandler.joinPaths(cacheInfo.folderPath, file));
                continue;
            }
            if(file.startsWith(baseFileName + '_') && file.endsWith('.html')){
                matchingFiles.push(FileHandler.joinPaths(cacheInfo.folderPath, file));
            }
        }
        return matchingFiles;
    }

    async delete(domain, path)
    {
        let cacheByDomains = this.fetchCachePathsByDomain(domain, path);
        for(let cacheInfo of cacheByDomains){
            let allCacheFiles = this.findAllCacheFilesForPath(cacheInfo.domain || domain, path);
            if(0 === allCacheFiles.length){
                let singleCacheInfo = this.generateCacheKey(cacheInfo.domain || domain, path);
                if(!FileHandler.exists(singleCacheInfo.fullPath)){
                    Logger.debug('No cache files found for: '+path);
                    continue;
                }
                allCacheFiles = [singleCacheInfo.fullPath];
            }
            for(let cacheFilePath of allCacheFiles){
                if(!FileHandler.exists(cacheFilePath)){
                    Logger.debug('File does not exist: '+cacheFilePath);
                    continue;
                }
                if(!FileHandler.remove(cacheFilePath)){
                    Logger.error('Failed to delete cache file: '+cacheFilePath);
                    return false;
                }
                Logger.debug('Deleted cache file: '+cacheFilePath);
            }
        }
        return true;
    }

    fetchCachePathsByDomain(domain, path)
    {
        let cacheByDomains = [];
        if(domain && 'default' !== domain){
            cacheByDomains.push({domain: domain});
            return cacheByDomains;
        }
        if(!FileHandler.exists(this.cacheBasePath)){
            return cacheByDomains;
        }
        let cachedDomainFolders = FileHandler.readFolder(this.cacheBasePath);
        for(let cachedDomainFolder of cachedDomainFolders) {
            cacheByDomains.push({domain: cachedDomainFolder});
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
