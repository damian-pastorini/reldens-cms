/**
 *
 * Reldens - CMS - TemplateEngine
 *
 */

const { Logger, sc } = require('@reldens/utils');

class TemplateEngine
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.dataServer = sc.get(props, 'dataServer', false);
    }

    async processAllTemplateFunctions(template)
    {
        let cleanTemplate = this.unescapeHtml(template);
        return await this.processCustomTemplateFunctions(
            await this.processLoopCollections(
                await this.processSingleFieldCollections(
                    await this.processEntityFunctions(cleanTemplate)
                )
            )
        );
    }

    async render(template, data, partials)
    {
        if(!this.renderEngine){
            Logger.error('Render engine not provided');
            return '';
        }
        if(!sc.isFunction(this.renderEngine.render)){
            Logger.error('Render engine does not contain a render method');
            return '';
        }
        let processedTemplate = await this.processAllTemplateFunctions(template);
        let finalTemplate = this.unescapeHtml(processedTemplate);
        return this.renderEngine.render(finalTemplate, data, partials);
    }

    unescapeHtml(text)
    {
        return text
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&#x3D;/g, '=')
            .replace(/&#x2F;/g, '/')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    getEntityRegex()
    {
        return /\{\{\s*entity\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"]\s*)?\)\s*\}\}/g;
    }

    getSingleFieldCollectionRegex()
    {
        return /\{\{\s*collection\(\s*['"]([^'"]+)['"]\s*,\s*(\{.*?\})\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*(\{.*?\}))?\s*\)\s*\}\}/g;
    }

    getLoopCollectionStartRegex()
    {
        return /<!--\s*<collection\s+([^,]+),\s*([^,]+),\s*([^>]+)>\s*-->/g;
    }

    getLoopCollectionEndRegex(tableName)
    {
        return new RegExp('<!--\\s*<\\/collection\\s+' + this.escapeRegex(tableName.replace(/"/g, '')) + '>\\s*-->');
    }

    getCustomTemplateFunctionRegex()
    {
        return /\{\{\s*>\s*([^\s{}]+)\s*-\{([^}]*)\}-\s*\}\}/g;
    }

    async processEntityFunctions(template)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getEntityRegex())){
            let tableName = match[1];
            let identifier = match[2];
            let identifierField = match[3] || 'id';
            let entityData = await this.fetchEntityForTemplate(tableName, identifier, identifierField);
            let entityContent = sc.get(entityData, 'content', '');
            let processedEntityContent = await this.processAllTemplateFunctions(entityContent);
            processedTemplate = processedTemplate.replace(match[0], processedEntityContent);
        }
        return processedTemplate;
    }

    async processSingleFieldCollections(template)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getSingleFieldCollectionRegex())){
            let tableName = match[1];
            let filtersJson = match[2];
            let fieldName = match[3];
            let queryOptionsJson = match[4] || '{}';
            processedTemplate = processedTemplate.replace(
                match[0],
                this.extractFieldValues(
                    await this.fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson),
                    fieldName
                )
            );
        }
        return processedTemplate;
    }

    async processLoopCollections(template)
    {
        let processedTemplate = template;
        let matches = [...template.matchAll(this.getLoopCollectionStartRegex())];
        for(let i = matches.length - 1; i >= 0; i--){
            let startMatch = matches[i];
            let loopResult = await this.processLoopCollection(
                processedTemplate,
                startMatch,
                startMatch[1],
                startMatch[2],
                (startMatch[3] || '{}')
            );
            if(loopResult){
                processedTemplate = loopResult;
            }
        }
        return processedTemplate;
    }

    async processCustomTemplateFunctions(template)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getCustomTemplateFunctionRegex())){
            let partialName = match[1].trim();
            let dataContent = match[2].trim();
            let processedData = this.processCustomTemplateData(dataContent);
            let replacement = this.buildPartialCall(partialName, processedData, dataContent);
            processedTemplate = processedTemplate.replace(match[0], replacement);
        }
        return processedTemplate;
    }

    processCustomTemplateData(dataContent)
    {
        if(!dataContent){
            return '{}';
        }
        if(this.isJsonObject(dataContent)){
            let parsedData = sc.toJson(dataContent);
            if(parsedData){
                return this.convertObjectToPartialData(parsedData);
            }
        }
        return dataContent;
    }

    isJsonObject(content)
    {
        let trimmed = content.trim();
        return trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes(':');
    }

    convertObjectToPartialData(dataObject)
    {
        let dataEntries = [];
        for(let key of Object.keys(dataObject)){
            let value = dataObject[key];
            if(sc.isString(value)){
                dataEntries.push(key + '="' + value.replace(/"/g, '\\"') + '"');
                continue;
            }
            if(sc.isNumber(value) || sc.isBoolean(value)){
                dataEntries.push(key + '=' + value);
                continue;
            }
            dataEntries.push(key + '="' + JSON.stringify(value).replace(/"/g, '\\"') + '"');
        }
        return '(' + dataEntries.join(' ') + ')';
    }

    buildPartialCall(partialName, processedData, originalData)
    {
        if(this.isJsonObject(originalData)){
            return '{{> ' + partialName + ' ' + processedData + '}}';
        }
        return '{{> ' + partialName + ' ' + originalData + '}}';
    }

    async processLoopCollection(template, startMatch, tableName, filtersJson, queryOptionsJson)
    {
        let startPos = startMatch.index;
        let startEnd = startPos + startMatch[0].length;
        let endMatch = this.getLoopCollectionEndRegex(tableName).exec(template.substring(startEnd));
        if(!endMatch){
            Logger.warning('No matching end tag found for collection: '+tableName);
            return false;
        }
        let endPos = startEnd + endMatch.index;
        let renderedContent = await this.renderCollectionLoop(
            template.substring(startEnd, endPos),
            await this.fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson)
        );
        return template.substring(0, startPos) + renderedContent + template.substring(endPos + endMatch[0].length);
    }

    async renderCollectionLoop(loopContent, collectionData)
    {
        let renderedContent = '';
        for(let row of collectionData){
            renderedContent += this.renderEngine.render(loopContent, {row}, {});
        }
        return renderedContent;
    }

    extractFieldValues(collectionData, fieldName)
    {
        let fieldValues = '';
        for(let row of collectionData){
            fieldValues += sc.get(row, fieldName, '');
        }
        return fieldValues;
    }

    escapeRegex(string)
    {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async fetchEntityForTemplate(tableName, identifier, identifierField)
    {
        let entity = this.dataServer.getEntity(tableName);
        if(!entity){
            Logger.warning('Entity not found in dataServer: '+tableName);
            return false;
        }
        return await entity.loadOneBy(identifierField, identifier);
    }

    async fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson)
    {
        let entity = this.dataServer.getEntity(tableName);
        if(!entity){
            Logger.warning('Entity not found in dataServer: '+tableName);
            return [];
        }
        let filters = sc.toJson(filtersJson);
        let originalState = this.preserveEntityState(entity);
        this.applyQueryOptions(entity, sc.toJson(queryOptionsJson, {}));
        let result = filters ? await entity.load(filters) : await entity.loadAll();
        this.restoreEntityState(entity, originalState);
        return result;
    }

    preserveEntityState(entity)
    {
        return {
            limit: entity.limit,
            offset: entity.offset,
            sortBy: entity.sortBy,
            sortDirection: entity.sortDirection
        };
    }

    restoreEntityState(entity, originalState)
    {
        entity.limit = originalState.limit;
        entity.offset = originalState.offset;
        entity.sortBy = originalState.sortBy;
        entity.sortDirection = originalState.sortDirection;
    }

    applyQueryOptions(entity, queryOptions)
    {
        if(sc.hasOwn(queryOptions, 'limit')){
            entity.limit = queryOptions.limit;
        }
        if(sc.hasOwn(queryOptions, 'offset')){
            entity.offset = queryOptions.offset;
        }
        if(sc.hasOwn(queryOptions, 'sortBy')){
            entity.sortBy = queryOptions.sortBy;
        }
        if(sc.hasOwn(queryOptions, 'sortDirection')){
            entity.sortDirection = queryOptions.sortDirection;
        }
    }

}

module.exports.TemplateEngine = TemplateEngine;
