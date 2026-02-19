/**
 *
 * Reldens - CMS - SearchRequestHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class SearchRequestHandler
{

    constructor(props)
    {
        this.search = sc.get(props, 'search', false);
        this.searchRenderer = sc.get(props, 'searchRenderer', false);
        this.contentRenderer = sc.get(props, 'contentRenderer', false);
        this.requestProcessor = sc.get(props, 'requestProcessor', false);
        this.cacheManager = sc.get(props, 'cacheManager', false);
    }

    async handleSearchRequest(req, res)
    {
        try {
            let domain = this.requestProcessor.getDomainFromRequest(req);
            let config = this.search.parseSearchParameters(req.query);
            if(!config){
                return res.redirect('/?error-message=searchInvalidParameters');
            }
            let cacheKey = this.requestProcessor.buildCacheKey(req.path, req);
            if(this.cacheManager && this.cacheManager.isEnabled()){
                let cachedContent = await this.cacheManager.get(domain, cacheKey);
                if(cachedContent){
                    return res.send(cachedContent);
                }
            }
            let searchResults = await this.search.executeSearch(config);
            if(false === searchResults){
                return res.redirect('/?error-message=searchExecutionFailed');
            }
            let content = await this.contentRenderer.renderWithTemplateContent(
                {
                    template: config.render.page,
                    layout: config.render.layout,
                    content: await this.searchRenderer.renderSearchResults(searchResults, config, domain, req)
                },
                Object.assign({}, {
                    search_query: sc.get(req.query, 'search', ''),
                    searchConfig: config,
                    query: req.query
                }),
                domain,
                req,
                null
            );
            if(this.cacheManager && this.cacheManager.isEnabled()){
                await this.cacheManager.set(domain, cacheKey, content);
            }
            return res.send(content);
        } catch (error) {
            Logger.error('Search request handling error: ' + error.message);
            return res.redirect('/?error-message=searchError');
        }
    }

}

module.exports.SearchRequestHandler = SearchRequestHandler;
