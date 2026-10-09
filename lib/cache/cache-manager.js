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
        this.maxVariantsPerPath = sc.get(props, 'maxVariantsPerPath', 100);
        this.domainMapping = sc.get(props, 'domainMapping', {});
        this.reverseDomainMapping = this.buildReverseDomainMapping();
        this.cacheDomains = this.buildCacheDomains(props);
    }

    buildCacheDomains(props)
    {
        let cacheDomains = [
            sc.get(props, 'defaultDomain', ''),
            ...Object.keys(this.reverseDomainMapping),
            ...Object.keys(this.domainMapping),
            ...Object.keys(sc.get(props, 'domainPublicUrlMapping', {}))
        ];
        for(let domainConfig of sc.get(props, 'domains', [])){
            cacheDomains.push(domainConfig.hostname, ...sc.get(domainConfig, 'aliases', []));
        }
        for(let publicUrl of sc.get(props, 'publicUrls', [])){
            if(URL.canParse(publicUrl)){
                cacheDomains.push(new URL(publicUrl).hostname);
            }
        }
        return cacheDomains;
    }

    buildReverseDomainMapping()
    {
        let reverse = {};
        for(let domain in this.domainMapping){
            let canonical = this.domainMapping[domain];
            if(!reverse[canonical]){
                reverse[canonical] = [];
            }
            reverse[canonical].push(domain);
        }
        return reverse;
    }

    generateCacheKey(domain, path)
    {
        let domainFolder = domain || 'default';
        if(!FileHandler.isValidPath(domainFolder+'/'+path)){
            return false;
        }
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

    generateEnabledCacheKey(domain, path)
    {
        if(!this.enabled){
            return false;
        }
        if(domain && !this.cacheDomains.includes(domain)){
            return false;
        }
        return this.generateCacheKey(domain, path);
    }

    async get(domain, path)
    {
        let cacheInfo = this.generateEnabledCacheKey(domain, path);
        if(!cacheInfo){
            return false;
        }
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

    async set(domain, path, content, basePath)
    {
        let cacheInfo = this.generateEnabledCacheKey(domain, path);
        if(!cacheInfo){
            return false;
        }
        if(this.isVariantsLimitReached(domain, path, basePath)){
            return false;
        }
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

    isVariantsLimitReached(domain, path, basePath)
    {
        if(!basePath){
            return false;
        }
        if(basePath === path){
            return false;
        }
        if(0 === this.maxVariantsPerPath){
            return false;
        }
        return this.maxVariantsPerPath <= this.findAllCacheFilesForPath(domain, basePath).length;
    }

    findAllCacheFilesForPath(domain, path)
    {
        let cacheInfo = this.generateCacheKey(domain, path);
        if(!cacheInfo){
            return [];
        }
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
        let cacheByDomains = this.resolveCacheDomains(domain);
        if(0 === cacheByDomains.length){
            return true;
        }
        for(let domainInfo of cacheByDomains){
            let actualDomain = domainInfo.domain;
            let allCacheFiles = this.findAllCacheFilesForPath(actualDomain, path);
            if(0 === allCacheFiles.length){
                let singleCacheInfo = this.generateCacheKey(actualDomain, path);
                if(!singleCacheInfo){
                    continue;
                }
                if(!FileHandler.exists(singleCacheInfo.fullPath)){
                    //Logger.debug('No cache files found for: '+path+' in domain: '+actualDomain);
                    continue;
                }
                allCacheFiles = [singleCacheInfo.fullPath];
            }
            for(let cacheFilePath of allCacheFiles){
                if(!FileHandler.remove(cacheFilePath)){
                    Logger.error('Failed to delete cache file: '+cacheFilePath);
                    return false;
                }
                Logger.debug('Deleted cache file: '+cacheFilePath);
            }
        }
        return true;
    }

    resolveCacheDomains(domain)
    {
        let cacheByDomains = [];
        if(!domain || 'default' === domain){
            if(!FileHandler.exists(this.cacheBasePath)){
                return cacheByDomains;
            }
            let cachedDomainFolders = FileHandler.readFolder(this.cacheBasePath);
            for(let cachedDomainFolder of cachedDomainFolders) {
                cacheByDomains.push({domain: cachedDomainFolder});
            }
            return cacheByDomains;
        }
        let domainsToDelete = this.reverseDomainMapping[domain] || [domain];
        for(let mappedDomain of domainsToDelete){
            cacheByDomains.push({domain: mappedDomain});
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
