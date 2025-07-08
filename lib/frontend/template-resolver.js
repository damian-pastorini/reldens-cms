/**
 *
 * Reldens - CMS - Frontend - TemplateResolver
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TemplateResolver
{

    constructor(props)
    {
        this.templatesPath = sc.get(props, 'templatesPath', '');
        this.templateExtensions = sc.get(props, 'templateExtensions', ['.html', '.mustache', '.template']);
        this.defaultDomain = sc.get(props, 'defaultDomain', 'default');
        this.domainMapping = sc.get(props, 'domainMapping', {});
        this.siteKeyMapping = sc.get(props, 'siteKeyMapping', {});
        this.domainTemplatesMap = sc.get(props, 'domainTemplatesMap', new Map());
    }

    extractTemplateName(filename)
    {
        for(let extension of this.templateExtensions){
            if(filename.endsWith(extension)){
                return filename.replace(extension, '');
            }
        }
        return false;
    }

    resolveDomainToFolder(domain)
    {
        if(!domain){
            domain = this.defaultDomain;
        }
        return sc.get(this.domainMapping, domain, domain);
    }

    resolveDomainToSiteKey(domain)
    {
        return sc.get(this.siteKeyMapping, this.resolveDomainToFolder(domain), 'default');
    }

    findTemplatePath(templateName, domain)
    {
        let resolvedDomain = this.resolveDomainToFolder(domain);
        if(resolvedDomain){
            let domainPath = this.domainTemplatesMap.get(resolvedDomain);
            if(domainPath){
                let domainTemplatePath = this.findTemplateInPath(templateName, domainPath);
                if(domainTemplatePath){
                    return domainTemplatePath;
                }
            }
            if(this.defaultDomain && resolvedDomain !== this.defaultDomain){
                let defaultDomainPath = this.domainTemplatesMap.get(this.defaultDomain);
                if(defaultDomainPath){
                    let defaultTemplatePath = this.findTemplateInPath(templateName, defaultDomainPath);
                    if(defaultTemplatePath){
                        return defaultTemplatePath;
                    }
                }
            }
        }
        return this.findTemplateInPath(templateName, this.templatesPath);
    }

    findTemplateInPath(templateName, basePath)
    {
        for(let extension of this.templateExtensions){
            let templatePath = FileHandler.joinPaths(basePath, templateName + extension);
            if(FileHandler.exists(templatePath)){
                return templatePath;
            }
        }
        return false;
    }

    findLayoutPath(layoutName, domain)
    {
        let resolvedDomain = this.resolveDomainToFolder(domain);
        if(resolvedDomain){
            let domainPath = this.domainTemplatesMap.get(resolvedDomain);
            if(domainPath){
                let domainLayoutPath = this.findTemplateInPath('layouts/' + layoutName, domainPath);
                if(domainLayoutPath){
                    return domainLayoutPath;
                }
            }
        }
        return this.findTemplateInPath('layouts/' + layoutName, this.templatesPath);
    }

    findTemplateByPath(path, domain)
    {
        if('/' === path){
            path = '/index';
        }
        let templatePath = path.endsWith('/') ? path.slice(0, -1) : path;
        templatePath = templatePath.startsWith('/') ? templatePath.substring(1) : templatePath;
        if('page' === templatePath){
            return false;
        }
        return this.findTemplatePath(templatePath, domain);
    }

}

module.exports.TemplateResolver = TemplateResolver;
