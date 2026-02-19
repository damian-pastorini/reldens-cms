/**
 *
 * Reldens - CMS - SearchRenderer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class SearchRenderer
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
    }

    async renderSearchResults(searchResults, config, domain, req)
    {
        if(!searchResults || !sc.isArray(searchResults) || 0 === searchResults.length){
            return this.renderNoSearchResults(domain);
        }
        let renderedContent = '';
        for(let entityResult of searchResults){
            if(!sc.hasOwn(entityResult, 'results') || !sc.isArray(entityResult.results)){
                continue;
            }
            if(0 === entityResult.results.length){
                renderedContent += this.renderNoSearchResults(domain);
                continue;
            }
            let partialName = sc.get(config, 'render.partial', 'entriesListView');
            let partialTemplate = this.loadPartialTemplate(partialName, domain);
            if(!partialTemplate){
                Logger.error('Search result partial template not found: ' + partialName);
                continue;
            }
            let templateData = sc.get(config, 'render.templateData', {});
            if(sc.hasOwn(entityResult, 'pagination')){
                let entityContent = await this.renderSearchEntityResults(entityResult.results, partialTemplate, domain, templateData);
                let totalPages = sc.get(entityResult.pagination, 'totalPages', 1);
                if(1 < totalPages){
                    let paginationContainer = sc.get(config, 'render.paginationContainer', 'pagedCollection');
                    let paginationTemplate = this.loadPaginationTemplate(paginationContainer, domain);
                    let paginationData = Object.assign({}, entityResult.pagination, {
                        collectionContentForCurrentPage: entityContent,
                        hasResults: 0 < entityResult.results.length,
                        noResultsMessage: entityResult.noResultsMessage || 'No results found.'
                    });
                    renderedContent += this.renderEngine.render(
                        paginationTemplate,
                        paginationData,
                        this.getPartialsForDomain(domain)
                    );
                    continue;
                }
                renderedContent += entityContent;
                continue;
            }
            renderedContent += await this.renderSearchEntityResults(entityResult.results, partialTemplate, domain, templateData);
        }
        return renderedContent;
    }

    async renderSearchEntityResults(results, partialTemplate, domain, templateData = {})
    {
        let renderedContent = '';
        if(!sc.hasOwn(templateData, 'columnsClass') || '' === templateData.columnsClass){
            templateData.columnsClass = 'col-lg-6';
        }
        for(let row of results){
            let rowData = Object.assign({}, templateData, {row});
            renderedContent += this.renderEngine.render(partialTemplate, rowData, this.getPartialsForDomain(domain));
        }
        return renderedContent;
    }

    renderNoSearchResults(domain)
    {
        let noResultsTemplate = this.loadPartialTemplate('noResults', domain);
        if(noResultsTemplate){
            return this.renderEngine.render(
                noResultsTemplate,
                {
                    message: 'No search results found.',
                    cssClass: 'no-search-results',
                    alertClass: 'alert-info'
                },
                this.getPartialsForDomain(domain)
            );
        }
        return '<div class="no-search-results alert alert-info">No search results found.</div>';
    }

    loadPartialTemplate(partialName, domain)
    {
        return sc.get(this.getPartialsForDomain(domain), partialName, false);
    }

    loadPaginationTemplate(containerName, domain)
    {
        if(!containerName || '' === containerName){
            containerName = 'pagedCollection';
        }
        let partialContent = this.loadPartialTemplate(containerName, domain);
        if(partialContent){
            return partialContent;
        }
        Logger.critical('Pagination template not found: ' + containerName + '. Please create the template file.');
        return '{{&collectionContentForCurrentPage}}';
    }

    getPartialsForDomain(domain)
    {
        if(!this.getPartials){
            Logger.error('getPartials function not provided to SearchRenderer');
            return {};
        }
        return this.getPartials(domain);
    }

}

module.exports.SearchRenderer = SearchRenderer;
