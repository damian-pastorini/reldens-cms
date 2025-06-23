/**
 *
 * Reldens - CMS - PaginationHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PaginationHandler
{

    constructor()
    {
        this.defaultLimit = 10;
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
        if('object' === typeof filters){
            sanitizedKey.filters = this.sanitizeFilters(filters);
        }
        return sanitizedKey;
    }

    sanitizeFilters(filters)
    {
        let sanitizedFilters = {};
        for(let key of Object.keys(filters)){
            if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)){
                continue;
            }
            let value = filters[key];
            if(sc.isString(value) || sc.isNumber(value) || sc.isBoolean(value)){
                sanitizedFilters[key] = value;
            }
        }
        return sanitizedFilters;
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

    mergeCollectionParameters(templateParams, requestParams)
    {
        let mergedFilters = Object.assign({}, templateParams.filters || {}, requestParams.filters || {});
        return {
            limit: sc.get(requestParams, 'limit', sc.get(templateParams, 'limit', this.defaultLimit)),
            page: sc.get(requestParams, 'page', 1),
            sortBy: sc.get(requestParams, 'sortBy', sc.get(templateParams, 'sortBy', 'id')),
            sortDirection: sc.get(requestParams, 'sortDirection', sc.get(templateParams, 'sortDirection', 'asc')),
            filters: mergedFilters
        };
    }

    calculatePaginationData(totalRecords, currentPage, limit, baseUrl, collectionId, params)
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
            prevPageUrl = this.buildPageUrl(baseUrl, collectionId, params, currentPage - 1);
        }
        if(hasNextPage){
            nextPageUrl = this.buildPageUrl(baseUrl, collectionId, params, currentPage + 1);
        }
        let prevPages = this.calculatePrevPages(currentPage, params, baseUrl, collectionId);
        let nextPages = this.calculateNextPages(currentPage, totalPages, params, baseUrl, collectionId);
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

    calculatePrevPages(currentPage, params, baseUrl, collectionId)
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
                pageUrl: this.buildPageUrl(baseUrl, collectionId, params, page)
            });
        }
        return prevPages;
    }

    calculateNextPages(currentPage, totalPages, params, baseUrl, collectionId)
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
                pageUrl: this.buildPageUrl(baseUrl, collectionId, params, page)
            });
        }
        return nextPages;
    }

    buildPageUrl(baseUrl, collectionId, params, page)
    {
        let urlParams = Object.assign({}, params.filters || {});
        urlParams.page = page;
        urlParams.limit = params.limit;
        if(params.sortBy){
            urlParams.sortBy = params.sortBy;
        }
        if(params.sortDirection){
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
