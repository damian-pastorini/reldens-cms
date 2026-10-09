/**
 *
 * Reldens - CMS - PaginationHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PaginationHandler
{

    constructor(props)
    {
        this.getAccessRules = sc.get(props, 'getAccessRules', () => ({}));
        this.defaultLimit = 10;
        this.defaultPublicMaxLimit = 100;
        this.prevPageLabel = 'Previous';
        this.nextPageLabel = 'Next';
    }

    sanitizeCollectionKey(collectionKey)
    {
        if(!collectionKey || 'object' !== typeof collectionKey){
            return {};
        }
        let sanitizedKey = {};
        let page = sc.parseNumber(sc.get(collectionKey, 'page', 0));
        if(1 <= page){
            sanitizedKey.page = page;
        }
        let limit = sc.parseNumber(sc.get(collectionKey, 'limit', 0));
        if(0 < limit){
            sanitizedKey.limit = limit;
        }
        let sortBy = sc.get(collectionKey, 'sortBy', '');
        if(sc.isString(sortBy) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortBy)){
            sanitizedKey.sortBy = sortBy;
        }
        let sortDirection = sc.get(collectionKey, 'sortDirection');
        if('asc' === sortDirection || 'desc' === sortDirection){
            sanitizedKey.sortDirection = sortDirection;
        }
        let filters = sc.get(collectionKey, 'filters', false);
        if(sc.isObject(filters)){
            sanitizedKey.filters = filters;
        }
        return sanitizedKey;
    }

    extractCollectionKeyFromRequest(req, collectionId)
    {
        if(!req || !req.query){
            return {};
        }
        let paramName = collectionId + '-key';
        let paramValue = sc.get(req.query, paramName, '');
        if(!paramValue){
            return {};
        }
        let decodedValue = decodeURIComponent(paramValue);
        let parsedKey = sc.parseJson(decodedValue, {});
        if(!parsedKey){
            Logger.warning('Invalid collection key JSON: ' + decodedValue);
            return {};
        }
        return this.sanitizeCollectionKey(parsedKey);
    }

    mergeCollectionParameters(templateParams, requestParams, entityName)
    {
        return {
            limit: this.resolvePublicLimit(
                sc.get(requestParams, 'limit', 0),
                sc.get(templateParams, 'limit', this.defaultLimit),
                entityName
            ),
            page: sc.get(requestParams, 'page', 1),
            sortBy: this.resolvePublicSort(
                sc.get(requestParams, 'sortBy', ''),
                sc.get(templateParams, 'sortBy', 'id'),
                entityName
            ),
            sortDirection: sc.get(requestParams, 'sortDirection', sc.get(templateParams, 'sortDirection', 'asc')),
            filters: Object.assign(
                {},
                this.filterPublicFilters(sc.get(requestParams, 'filters', {}), entityName),
                sc.get(templateParams, 'filters', {})
            )
        };
    }

    fetchPublicFields(entityName, rulesKey)
    {
        let publicFields = sc.get(this.getAccessRules(entityName), rulesKey, []);
        if(!sc.isArray(publicFields)){
            return [];
        }
        return publicFields;
    }

    filterPublicFilters(requestFilters, entityName)
    {
        let publicFields = this.fetchPublicFields(entityName, 'publicFilters');
        let publicFilters = {};
        for(let filterKey of Object.keys(requestFilters)){
            if(!publicFields.includes(filterKey)){
                continue;
            }
            let filterValue = requestFilters[filterKey];
            if(sc.isString(filterValue) || sc.isNumber(filterValue) || sc.isBoolean(filterValue)){
                publicFilters[filterKey] = filterValue;
            }
        }
        return publicFilters;
    }

    resolvePublicLimit(requestLimit, templateLimit, entityName)
    {
        if(!requestLimit){
            return templateLimit;
        }
        let publicMaxLimit = sc.parseNumber(
            sc.get(this.getAccessRules(entityName), 'publicMaxLimit', this.defaultPublicMaxLimit)
        );
        if(0 === publicMaxLimit){
            return requestLimit;
        }
        if(!sc.isNumber(publicMaxLimit) || 0 > publicMaxLimit){
            publicMaxLimit = this.defaultPublicMaxLimit;
        }
        return Math.min(requestLimit, publicMaxLimit);
    }

    resolvePublicSort(requestSortBy, templateSortBy, entityName)
    {
        if(!requestSortBy){
            return templateSortBy;
        }
        if(!this.fetchPublicFields(entityName, 'publicSort').includes(requestSortBy)){
            return templateSortBy;
        }
        return requestSortBy;
    }

    calculatePaginationData(totalRecords, currentPage, limit, baseUrl, collectionId, params, templateDefaults)
    {
        if(0 >= totalRecords){
            return this.createEmptyPaginationData();
        }
        let totalPages = Math.ceil(totalRecords / limit);
        if(currentPage > totalPages){
            currentPage = totalPages;
        }
        let offset = (currentPage - 1) * limit;
        let hasNextPage = currentPage < totalPages;
        let hasPrevPage = 1 < currentPage;
        let prevPageUrl = '';
        let nextPageUrl = '';
        if(hasPrevPage){
            prevPageUrl = this.buildPageUrl(baseUrl, collectionId, params, currentPage - 1, templateDefaults);
        }
        if(hasNextPage){
            nextPageUrl = this.buildPageUrl(baseUrl, collectionId, params, currentPage + 1, templateDefaults);
        }
        let prevPages = this.calculatePrevPages(currentPage, params, baseUrl, collectionId, templateDefaults);
        let nextPages = this.calculateNextPages(
            currentPage,
            totalPages,
            params,
            baseUrl,
            collectionId,
            templateDefaults
        );
        return {
            currentPage,
            totalPages,
            totalRecords,
            limit,
            offset,
            hasNextPage,
            hasPrevPage,
            prevPageUrl,
            nextPageUrl,
            prevPageLabel: this.prevPageLabel,
            nextPageLabel: this.nextPageLabel,
            prevPages,
            nextPages
        };
    }

    createEmptyPaginationData()
    {
        return {
            currentPage: 1,
            totalPages: 0,
            totalRecords: 0,
            limit: this.defaultLimit,
            offset: 0,
            hasNextPage: false,
            hasPrevPage: false,
            prevPageUrl: '',
            nextPageUrl: '',
            prevPageLabel: this.prevPageLabel,
            nextPageLabel: this.nextPageLabel,
            prevPages: [],
            nextPages: []
        };
    }

    calculatePrevPages(currentPage, params, baseUrl, collectionId, templateDefaults)
    {
        let prevPagesCount = sc.parseNumber(sc.get(params, 'prevPages', 2));
        if(!prevPagesCount || 0 >= prevPagesCount || 1 >= currentPage){
            return [];
        }
        let prevPages = [];
        let startPage = Math.max(1, currentPage - prevPagesCount);
        for(let page = startPage; page < currentPage; page++){
            prevPages.push({
                pageLabel: page,
                pageUrl: this.buildPageUrl(baseUrl, collectionId, params, page, templateDefaults)
            });
        }
        return prevPages;
    }

    calculateNextPages(currentPage, totalPages, params, baseUrl, collectionId, templateDefaults)
    {
        let nextPagesCount = sc.parseNumber(sc.get(params, 'nextPages', 2));
        if(!nextPagesCount || 0 >= nextPagesCount || currentPage >= totalPages){
            return [];
        }
        let nextPages = [];
        let endPage = Math.min(totalPages, currentPage + nextPagesCount);
        for(let page = currentPage + 1; page <= endPage; page++){
            nextPages.push({
                pageLabel: page,
                pageUrl: this.buildPageUrl(baseUrl, collectionId, params, page, templateDefaults)
            });
        }
        return nextPages;
    }

    buildPageUrl(baseUrl, collectionId, params, page, templateDefaults)
    {
        let urlParams = {};
        urlParams.page = page;
        let templateFilters = sc.get(templateDefaults, 'filters', {});
        let templateLimit = sc.get(templateDefaults, 'limit', this.defaultLimit);
        let templateSortBy = sc.get(templateDefaults, 'sortBy', 'id');
        let templateSortDirection = sc.get(templateDefaults, 'sortDirection', 'asc');
        let currentFilters = sc.get(params, 'filters', {});
        for(let filterKey of Object.keys(currentFilters)){
            if(!sc.hasOwn(templateFilters, filterKey) || templateFilters[filterKey] !== currentFilters[filterKey]){
                if(!sc.hasOwn(urlParams, 'filters')){
                    urlParams.filters = {};
                }
                urlParams.filters[filterKey] = currentFilters[filterKey];
            }
        }
        if(params.limit !== templateLimit){
            urlParams.limit = params.limit;
        }
        if(params.sortBy !== templateSortBy){
            urlParams.sortBy = params.sortBy;
        }
        if(params.sortDirection !== templateSortDirection){
            urlParams.sortDirection = params.sortDirection;
        }
        let collectionKey = encodeURIComponent(JSON.stringify(urlParams));
        let paramName = collectionId + '-key';
        let separator = -1 !== baseUrl.indexOf('?') ? '&' : '?';
        return baseUrl + separator + paramName + '=' + collectionKey;
    }

    async getCollectionTotal(entity, filters)
    {
        if(!entity || !sc.isFunction(entity.count)){
            Logger.critical('Entity does not support count method');
            return 0;
        }
        try {
            return await entity.count(filters || {});
        } catch (error) {
            Logger.critical('Failed to count collection records: ' + error.message);
            return 0;
        }
    }

}

module.exports.PaginationHandler = PaginationHandler;
