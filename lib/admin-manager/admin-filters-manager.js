/**
 *
 * Reldens - AdminFiltersManager
 *
 */

const { Logger } = require('@reldens/utils');

class AdminFiltersManager
{

    getFiltersFromSession(req, entityPath)
    {
        if(!req?.session){
            return {regular: {}, entityFilterTerm: ''};
        }
        let sessionKey = 'adminFilters_'+entityPath;
        let sessionData = req.session[sessionKey];
        if(!sessionData || 'object' !== typeof sessionData){
            return {regular: {}, entityFilterTerm: ''};
        }
        return {
            regular: sessionData.regular || {},
            entityFilterTerm: sessionData.entityFilterTerm || ''
        };
    }

    saveFiltersToSession(req, entityPath, filters)
    {
        if(!req?.session){
            return false;
        }
        let sessionKey = 'adminFilters_'+entityPath;
        req.session[sessionKey] = filters;
        return true;
    }

    clearFiltersFromSession(req, entityPath)
    {
        if(!req?.session){
            return false;
        }
        let sessionKey = 'adminFilters_'+entityPath;
        delete req.session[sessionKey];
        return true;
    }

    getSortingFromSession(req, entityPath)
    {
        if(!req?.session){
            return {sortBy: '', sortDirection: ''};
        }
        let sessionKey = 'adminFilters_'+entityPath;
        let sessionData = req.session[sessionKey];
        if(!sessionData || 'object' !== typeof sessionData){
            return {sortBy: '', sortDirection: ''};
        }
        return {
            sortBy: sessionData.sortBy || '',
            sortDirection: sessionData.sortDirection || ''
        };
    }

    saveSortingToSession(req, entityPath, sortBy, sortDirection)
    {
        if(!req?.session){
            return false;
        }
        let sessionKey = 'adminFilters_'+entityPath;
        if(!req.session[sessionKey]){
            req.session[sessionKey] = {regular: {}, entityFilterTerm: ''};
        }
        req.session[sessionKey].sortBy = sortBy || '';
        req.session[sessionKey].sortDirection = sortDirection || '';
        return true;
    }

    clearSortingFromSession(req, entityPath)
    {
        if(!req?.session){
            return false;
        }
        let sessionKey = 'adminFilters_'+entityPath;
        if(req.session[sessionKey]){
            delete req.session[sessionKey].sortBy;
            delete req.session[sessionKey].sortDirection;
        }
        return true;
    }

    prepareTextFilters(entityFilterTerm, driverResource)
    {
        if(!entityFilterTerm || '' === entityFilterTerm.trim()){
            return {};
        }
        let textFields = [];
        for(let propertyKey of Object.keys(driverResource.options.properties)){
            let property = driverResource.options.properties[propertyKey];
            if(property.isId){
                continue;
            }
            if(property.isUpload){
                continue;
            }
            if('reference' === property.type){
                continue;
            }
            if('boolean' === property.type){
                continue;
            }
            if('number' === property.type){
                continue;
            }
            if('datetime' === property.type){
                continue;
            }
            if('int' === property.dbType){
                continue;
            }
            if('bigint' === property.dbType){
                continue;
            }
            if('decimal' === property.dbType){
                continue;
            }
            if('float' === property.dbType){
                continue;
            }
            if('double' === property.dbType){
                continue;
            }
            if('datetime' === property.dbType){
                continue;
            }
            if('timestamp' === property.dbType){
                continue;
            }
            if('date' === property.dbType){
                continue;
            }
            if('time' === property.dbType){
                continue;
            }
            if('boolean' === property.dbType){
                continue;
            }
            textFields.push(propertyKey);
        }
        if(0 === textFields.length){
            return {};
        }
        let orConditions = [];
        for(let field of textFields){
            orConditions.push({
                [field]: {operator: 'LIKE', value: '%'+entityFilterTerm+'%'}
            });
        }
        return {OR: orConditions};
    }

    combineFilters(regularFilters, textFilters)
    {
        let hasRegularFilters = regularFilters && 'object' === typeof regularFilters && 0 < Object.keys(regularFilters).length;
        let hasTextFilters = textFilters && 'object' === typeof textFilters && 0 < Object.keys(textFilters).length;
        if(!hasRegularFilters && !hasTextFilters){
            return {};
        }
        if(!hasRegularFilters){
            return textFilters;
        }
        if(!hasTextFilters){
            return regularFilters;
        }
        return {
            AND: [
                regularFilters,
                textFilters
            ]
        };
    }

    prepareFilters(filtersList, driverResource)
    {
        if(!filtersList || 'object' !== typeof filtersList || 0 === Object.keys(filtersList).length){
            return {};
        }
        let filters = {};
        for(let i of Object.keys(filtersList)){
            let filter = filtersList[i];
            if('' === filter || null === filter || undefined === filter){
                continue;
            }
            let rawConfigFilterProperties = driverResource.options.properties[i];
            if(!rawConfigFilterProperties){
                Logger.critical('Could not found property by key.', i);
                continue;
            }
            if(rawConfigFilterProperties.isUpload){
                continue;
            }
            if('reference' === rawConfigFilterProperties.type){
                filters[i] = Number(filter);
                continue;
            }
            if('boolean' === rawConfigFilterProperties.type){
                filters[i] = ('true' === filter || '1' === filter || 1 === filter);
                continue;
            }
            if('number' === rawConfigFilterProperties.type || rawConfigFilterProperties.isId){
                filters[i] = Number(filter);
                continue;
            }
            filters[i] = {operator: 'LIKE', value: '%'+filter+'%'};
        }
        return filters;
    }

}

module.exports.AdminFiltersManager = AdminFiltersManager;
