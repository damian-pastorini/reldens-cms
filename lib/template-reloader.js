/**
 *
 * Reldens - CMS - TemplateReloader
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TemplateReloader
{

    constructor(props = {})
    {
        this.reloadTime = sc.get(props, 'reloadTime', 0);
        this.events = sc.get(props, 'events', false);
        this.fileTracking = {};
        this.reloadInterval = false;
        this.isActive = -1 === this.reloadTime || 0 < this.reloadTime;
        this.adminTemplatesLoader = sc.get(props, 'adminTemplatesLoader', false);
        this.mappedAdminTemplates = sc.get(props, 'mappedAdminTemplates', {});
        this.templatesPath = sc.get(props, 'templatesPath', '');
        this.templateExtensions = sc.get(props, 'templateExtensions', []);
        this.setupReloadInterval();
    }

    setupReloadInterval()
    {
        if(0 >= this.reloadTime){
            return true;
        }
        if(this.reloadInterval){
            clearInterval(this.reloadInterval);
        }
        this.reloadInterval = setInterval(() => {
            this.checkAndReloadChangedTemplates();
        }, this.reloadTime);
    }

    iterateTemplateFiles(templatesPaths, callback)
    {
        if(!templatesPaths){
            return false;
        }
        if(sc.isString(templatesPaths)){
            return callback(templatesPaths);
        }
        if(Array.isArray(templatesPaths)){
            let result = false;
            for(let filePath of templatesPaths){
                if(callback(filePath)){
                    result = true;
                }
            }
            return result;
        }
        if(sc.isObject(templatesPaths)){
            let result = false;
            for(let key of Object.keys(templatesPaths)){
                let templateData = templatesPaths[key];
                if(sc.isObject(templateData)){
                    if(this.iterateTemplateFiles(templateData, callback)){
                        result = true;
                    }
                    continue;
                }
                if(callback(templateData)){
                    result = true;
                }
            }
            return result;
        }
        return false;
    }

    trackTemplateFiles(templatesPaths)
    {
        if(0 === this.reloadTime){
            return true;
        }
        return this.iterateTemplateFiles(templatesPaths, (filePath) => {
            if(!FileHandler.exists(filePath)){
                return false;
            }
            let modTime = FileHandler.getFileModificationTime(filePath);
            if(!modTime){
                return false;
            }
            this.fileTracking[filePath] = {
                lastModified: modTime,
                isChanged: false
            };
            return true;
        });
    }

    checkTemplateChanges(templatesPaths)
    {
        if(0 === this.reloadTime){
            return false;
        }
        return this.iterateTemplateFiles(templatesPaths, (filePath) => {
            if(!FileHandler.exists(filePath)){
                return false;
            }
            let trackedFile = this.fileTracking[filePath];
            if(!trackedFile){
                this.trackTemplateFiles(filePath);
                return false;
            }
            let currentModTime = FileHandler.getFileModificationTime(filePath);
            if(!currentModTime){
                return false;
            }
            if(currentModTime.getTime() > trackedFile.lastModified.getTime()){
                if(-1 !== this.reloadTime){
                    trackedFile.lastModified = currentModTime;
                }
                trackedFile.isChanged = true;
                return true;
            }
            return false;
        });
    }

    hasChangedTemplates(templatesPaths)
    {
        return this.iterateTemplateFiles(templatesPaths, (filePath) => {
            let trackedFile = this.fileTracking[filePath];
            return trackedFile ? trackedFile.isChanged : false;
        });
    }

    markTemplatesAsReloaded(templatesPaths)
    {
        if(0 === this.reloadTime){
            return true;
        }
        return this.iterateTemplateFiles(templatesPaths, (filePath) => {
            let trackedFile = this.fileTracking[filePath];
            if(trackedFile){
                trackedFile.isChanged = false;
            }
            return true;
        });
    }

    shouldReloadAdminTemplates(mappedAdminTemplates)
    {
        if(0 === this.reloadTime){
            return false;
        }
        if(-1 === this.reloadTime){
            return this.checkTemplateChanges(mappedAdminTemplates);
        }
        return this.hasChangedTemplates(mappedAdminTemplates);
    }

    shouldReloadFrontendTemplates(templatesPath, templateExtensions)
    {
        if(0 === this.reloadTime){
            return false;
        }
        let templateFiles = this.collectTemplateFiles(templatesPath, templateExtensions);
        if(-1 === this.reloadTime){
            return this.checkTemplateChanges(templateFiles);
        }
        return this.hasChangedTemplates(templateFiles);
    }

    collectTemplateFiles(templatesPath, templateExtensions)
    {
        let templateFiles = [];
        if(!FileHandler.exists(templatesPath)){
            return templateFiles;
        }
        let partialsPath = FileHandler.joinPaths(templatesPath, 'partials');
        if(FileHandler.exists(partialsPath)){
            let partialFiles = FileHandler.getFilesInFolder(partialsPath, templateExtensions);
            for(let file of partialFiles){
                templateFiles.push(FileHandler.joinPaths(partialsPath, file));
            }
        }
        let domainsPath = FileHandler.joinPaths(templatesPath, 'domains');
        if(FileHandler.exists(domainsPath)){
            let domainFolders = FileHandler.fetchSubFoldersList(domainsPath);
            for(let domain of domainFolders){
                let domainPath = FileHandler.joinPaths(domainsPath, domain);
                let domainPartialsPath = FileHandler.joinPaths(domainPath, 'partials');
                if(FileHandler.exists(domainPartialsPath)){
                    let domainPartialFiles = FileHandler.getFilesInFolder(domainPartialsPath, templateExtensions);
                    for(let file of domainPartialFiles){
                        templateFiles.push(FileHandler.joinPaths(domainPartialsPath, file));
                    }
                }
            }
        }
        return templateFiles;
    }

    checkAndReloadChangedTemplates()
    {
        if(0 === this.reloadTime){
            return false;
        }
        let hasChanges = false;
        for(let filePath of Object.keys(this.fileTracking)){
            if(this.checkTemplateChanges(filePath)){
                hasChanges = true;
            }
        }
        if(hasChanges && this.events){
            this.events.emit('reldens.templateReloader.templatesChanged', {
                reloader: this,
                changedFiles: this.getChangedFiles()
            });
        }
        return hasChanges;
    }

    getChangedFiles()
    {
        let changedFiles = [];
        for(let filePath of Object.keys(this.fileTracking)){
            let trackedFile = this.fileTracking[filePath];
            if(trackedFile && trackedFile.isChanged){
                changedFiles.push(filePath);
            }
        }
        return changedFiles;
    }

    destroy()
    {
        if(this.reloadInterval){
            clearInterval(this.reloadInterval);
            this.reloadInterval = false;
        }
        this.fileTracking = {};
    }

    async checkAndReloadAdminTemplates()
    {
        if(!this.adminTemplatesLoader){
            return false;
        }
        if(!this.shouldReloadAdminTemplates(this.mappedAdminTemplates)){
            return false;
        }
        let newAdminFilesContents = await this.adminTemplatesLoader.fetchAdminFilesContents(this.mappedAdminTemplates);
        if(!newAdminFilesContents){
            return false;
        }
        this.markTemplatesAsReloaded(this.mappedAdminTemplates);
        return newAdminFilesContents;
    }

    async checkAndReloadFrontendTemplates()
    {
        if(!this.shouldReloadFrontendTemplates(this.templatesPath, this.templateExtensions)){
            return false;
        }
        let templateFiles = this.collectTemplateFiles(this.templatesPath, this.templateExtensions);
        this.markTemplatesAsReloaded(templateFiles);
        return true;
    }

    async updateAdminContentsAfterReload(newAdminFilesContents, adminManager)
    {
        if(!newAdminFilesContents || !adminManager){
            return false;
        }
        adminManager.adminFilesContents = newAdminFilesContents;
        adminManager.contentsBuilder.adminFilesContents = newAdminFilesContents;
        adminManager.routerContents.adminFilesContents = newAdminFilesContents;
        adminManager.addCacheButtonSubscriber.cacheCleanButton = newAdminFilesContents.cacheCleanButton;
        adminManager.addCacheButtonSubscriber.clearAllCacheButton = newAdminFilesContents.clearAllCacheButton;
        await adminManager.contentsBuilder.buildAdminContents();
        return true;
    }

    async handleAdminTemplateReload(adminManager)
    {
        if(0 === this.reloadTime){
            return false;
        }
        let reloadedContents = await this.checkAndReloadAdminTemplates();
        if(reloadedContents){
            await this.updateAdminContentsAfterReload(reloadedContents, adminManager);
        }
        return reloadedContents;
    }

    async handleFrontendTemplateReload(templateCache, templateResolver)
    {
        let reloadResult = await this.checkAndReloadFrontendTemplates();
        if(reloadResult){
            await templateCache.loadPartials();
            await templateCache.setupDomainTemplates();
            templateResolver.domainTemplatesMap = templateCache.getDomainTemplatesMap();
        }
        return reloadResult;
    }

}

module.exports.TemplateReloader = TemplateReloader;
