/**
 *
 * Reldens - CMS - Frontend - ContentRenderer
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class ContentRenderer
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.templateEngine = sc.get(props, 'templateEngine', false);
        this.templateResolver = sc.get(props, 'templateResolver', false);
        this.templateCache = sc.get(props, 'templateCache', false);
        this.metaDefaults = sc.get(props, 'metaDefaults', {});
    }

    fetchMetaFields(data)
    {
        if(!sc.isObject(data) || 0 === Object.keys(data).length){
            return this.metaDefaults;
        }
        let result = Object.assign({}, this.metaDefaults);
        for(let key of Object.keys(data)){
            let value = data[key];
            if(null !== value && '' !== value && 'undefined' !== typeof value){
                result[key] = value;
            }
        }
        let titleValue = sc.get(result, 'title', '');
        let metaTitleValue = sc.get(result, 'meta_title', titleValue);
        if(metaTitleValue && '' !== metaTitleValue){
            result.meta_title = metaTitleValue;
        }
        let metaOgTitleValue = sc.get(result, 'meta_og_title', metaTitleValue);
        if(metaOgTitleValue && '' !== metaOgTitleValue){
            result.meta_og_title = metaOgTitleValue;
        }
        let metaDescValue = sc.get(result, 'meta_description', '');
        let metaOgDescValue = sc.get(result, 'meta_og_description', metaDescValue);
        if(metaOgDescValue && '' !== metaOgDescValue){
            result.meta_og_description = metaOgDescValue;
        }
        let jsonData = sc.get(result, 'json_data', null);
        if(sc.isString(jsonData)){
            jsonData = sc.toJson(jsonData, {});
        }
        if(!sc.isObject(jsonData)){
            jsonData = {};
        }
        let viewportValue = sc.get(jsonData, 'viewport', this.metaDefaults.viewport);
        if(viewportValue && '' !== viewportValue){
            jsonData.viewport = viewportValue;
        }
        result.json_data = jsonData;
        return result;
    }

    async generateRouteContent(route, domain, req)
    {
        if(!route.router){
            return false;
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            return false;
        }
        let content = await entity.loadOneWithRelations({route_id: route.id});
        if(!content){
            return false;
        }
        return await this.renderWithTemplateContent(content, Object.assign({}, route, content), domain, req, route);
    }

    async generateTemplateContent(templatePath, domain, req, data = {})
    {
        let template = FileHandler.readFile(templatePath);
        if(!template){
            Logger.error('Failed to read template: ' + templatePath);
            return false;
        }
        return await this.templateEngine.render(
            template,
            data,
            this.templateCache.getPartialsForDomain(domain),
            domain,
            req,
            null,
            null
        );
    }

    async renderWithTemplateContent(content, data, domain, req, route)
    {
        let templateName = sc.get(content, 'template', 'page');
        if(!templateName){
            templateName = 'page';
        }
        let layoutName = sc.get(content, 'layout', '');
        if(!layoutName){
            layoutName = 'default';
        }
        let currentEntityData = Object.assign({}, content, data);
        let layoutContent = await this.processContentWithLayout(
            content,
            data,
            layoutName,
            domain,
            req,
            route,
            currentEntityData
        );
        let templatePath = this.templateResolver.findTemplatePath(templateName, domain);
        if(!templatePath){
            return layoutContent;
        }
        let routerKey = route?.router;
        let categoryName = currentEntityData?.cms_categories?.name;
        let siteHandle = this.templateResolver.resolveDomainToSiteKey(domain)
            + (routerKey ? ' '+routerKey : '')
            + (categoryName ? ' cat-'+categoryName : '');
        return await this.generateTemplateContent(
            templatePath,
            domain,
            req,
            Object.assign(
                {},
                this.fetchMetaFields(data),
                {
                    content: layoutContent,
                    siteHandle
                }
            )
        );
    }

    async processContentWithLayout(content, data, layoutName, domain, req, route, currentEntityData)
    {
        let processedContent = await this.processContent(content, data, domain, req, route, currentEntityData);
        let layoutPath = this.templateResolver.findLayoutPath(layoutName, domain);
        if(!layoutPath){
            return processedContent;
        }
        return await this.generateTemplateContent(
            layoutPath,
            domain,
            req,
            Object.assign({}, data, {content: processedContent})
        );
    }

    async processContent(content, data, domain, req, route, currentEntityData)
    {
        let contentText = sc.get(content, 'content', '');
        if(!contentText){
            return '';
        }
        return await this.templateEngine.render(
            contentText,
            data,
            this.templateCache.getPartialsForDomain(domain),
            domain,
            req,
            route,
            currentEntityData
        );
    }

}

module.exports.ContentRenderer = ContentRenderer;
