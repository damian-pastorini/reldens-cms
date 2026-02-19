/**
 *
 * Reldens - CMS - Frontend - ResponseManager
 *
 */

const { sc } = require('@reldens/utils');

class ResponseManager
{

    constructor(props)
    {
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.contentRenderer = sc.get(props, 'contentRenderer', false);
        this.templateResolver = sc.get(props, 'templateResolver', false);
        this.requestProcessor = sc.get(props, 'requestProcessor', false);
    }

    async renderWithCacheHandler(contentGenerator, errorHandler, responseHandler, domain, res, path, req)
    {
        let renderedContent = await contentGenerator();
        if(!renderedContent){
            return await errorHandler();
        }
        if(this.cacheManager && this.cacheManager.isEnabled()){
            let cacheKey = this.requestProcessor.buildCacheKey(path, req);
            await this.cacheManager.set(domain, cacheKey, renderedContent);
        }
        return await responseHandler(renderedContent);
    }

    async renderNotFound(domain, res, req)
    {
        let notFoundPath = this.templateResolver.findTemplatePath('404', domain);
        if(notFoundPath){
            let content = await this.contentRenderer.generateTemplateContent(notFoundPath, domain, req, {});
            if(content){
                res.status(404);
                return res.send(await this.contentRenderer.renderWithTemplateContent(
                    {content},
                    {meta_title: 'Page not found'},
                    domain,
                    req,
                    null
                ));
            }
        }
        return res.status(404).send('Page not found');
    }

}

module.exports.ResponseManager = ResponseManager;
