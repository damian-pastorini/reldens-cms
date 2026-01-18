/**
 *
 * Reldens - CMS - Frontend - TemplateCache
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TemplateCache
{

    constructor(props)
    {
        this.templatesPath = sc.get(props, 'templatesPath', '');
        this.templateExtensions = sc.get(props, 'templateExtensions', ['.html', '.mustache', '.template', '.txt', '.xml', '.json']);
        this.defaultDomain = sc.get(props, 'defaultDomain', 'default');
        this.partialsCache = {};
        this.domainPartialsCache = new Map();
        this.domainTemplatesMap = new Map();
        this.templateResolver = sc.get(props, 'templateResolver', false);
    }

    async loadPartials()
    {
        let partialsPath = FileHandler.joinPaths(this.templatesPath, 'partials');
        FileHandler.createFolder(partialsPath);
        let partialFiles = FileHandler.getFilesInFolder(partialsPath, this.templateExtensions);
        for(let file of partialFiles){
            let partialName = this.templateResolver.extractTemplateName(file);
            if(!partialName){
                continue;
            }
            let partialPath = FileHandler.joinPaths(partialsPath, file);
            let partialContent = FileHandler.readFile(partialPath);
            if(!partialContent){
                Logger.error('Failed to read partial: '+partialPath);
                continue;
            }
            this.partialsCache[partialName] = partialContent;
        }
    }

    async loadDomainPartials(domain, domainPath)
    {
        let domainPartialsPath = FileHandler.joinPaths(domainPath, 'partials');
        if(!FileHandler.exists(domainPartialsPath)){
            return;
        }
        let domainPartials = {};
        let partialFiles = FileHandler.getFilesInFolder(domainPartialsPath, this.templateExtensions);
        for(let file of partialFiles){
            let partialName = this.templateResolver.extractTemplateName(file);
            if(!partialName){
                continue;
            }
            let partialPath = FileHandler.joinPaths(domainPartialsPath, file);
            let partialContent = FileHandler.readFile(partialPath);
            if(!partialContent){
                Logger.error('Failed to read domain partial: '+partialPath);
                continue;
            }
            domainPartials[partialName] = partialContent;
        }
        this.domainPartialsCache.set(domain, domainPartials);
    }

    async setupDomainTemplates()
    {
        let domainsPath = FileHandler.joinPaths(this.templatesPath, 'domains');
        if(!FileHandler.exists(domainsPath)){
            return;
        }
        let domainFolders = FileHandler.fetchSubFoldersList(domainsPath);
        for(let domain of domainFolders){
            let domainPath = FileHandler.joinPaths(domainsPath, domain);
            this.domainTemplatesMap.set(domain, domainPath);
            await this.loadDomainPartials(domain, domainPath);
        }
    }

    getPartialsForDomain(domain)
    {
        let resolvedDomain = this.templateResolver.resolveDomainToFolder(domain);
        let domainPartials = this.domainPartialsCache.get(resolvedDomain);
        if(!domainPartials && this.defaultDomain && resolvedDomain !== this.defaultDomain){
            domainPartials = this.domainPartialsCache.get(this.defaultDomain);
        }
        if(!domainPartials){
            return this.partialsCache;
        }
        return Object.assign({}, this.partialsCache, domainPartials);
    }

    getDomainTemplatesMap()
    {
        return this.domainTemplatesMap;
    }

}

module.exports.TemplateCache = TemplateCache;
