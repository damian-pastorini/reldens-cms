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
        this.getPartials = sc.get(props, 'getPartials', false);
        this.currentDomain = '';
    }

    setCurrentDomain(domain)
    {
        this.currentDomain = domain;
    }

    async processAllTemplateFunctions(template)
    {
        return await this.processLoopCollections(
            await this.processSingleFieldCollections(
                await this.processEntityFunctions(
                    await this.processCustomPartials(template)
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
        return this.renderEngine.render(
            this.unescapeHtml(await this.processAllTemplateFunctions(template)),
            data,
            partials
        );
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
        return /<entity\s+name="([^"]+)"(?:\s+field="([^"]+)"\s+value="([^"]+)"|\s+id="([^"]+)")?\s*\/?>/g;
    }

    getSingleFieldCollectionRegex()
    {
        return /<collection\s+name="([^"]+)"(?:\s+filters="([^"]*)")?\s+field="([^"]+)"(?:\s+data="([^"]*)")?\s*\/>/g;
    }

    getLoopCollectionStartRegex()
    {
        return /<collection\s+name="([^"]+)"(?:\s+filters="([^"]*)")?(?:\s+data="([^"]*)")?\s*>/g;
    }

    getLoopCollectionEndRegex()
    {
        return new RegExp('<\\/collection>');
    }

    async processEntityFunctions(template)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getEntityRegex())){
            let tableName = match[1];
            let field = sc.get(match, '2', 'id');
            let value = sc.get(match, '3', sc.get(match, '4', ''));
            if(!value){
                Logger.warning('Entity tag missing value: '+match[0]);
                continue;
            }
            processedTemplate = processedTemplate.replace(
                match[0],
                await this.processAllTemplateFunctions(
                    sc.get(await this.fetchEntityForTemplate(tableName, value, field), 'content', '')
                )
            );
        }
        return processedTemplate;
    }

    async processSingleFieldCollections(template)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getSingleFieldCollectionRegex())){
            let tableName = match[1];
            let filtersJson = sc.get(match, '2', '{}');
            let fieldName = match[3];
            let queryOptionsJson = sc.get(match, '4', '{}');
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
                sc.get(startMatch, '2', '{}'),
                sc.get(startMatch, '3', '{}')
            );
            if(loopResult){
                processedTemplate = loopResult;
            }
        }
        return processedTemplate;
    }

    async processCustomPartials(template)
    {
        let processedTemplate = template;
        let partialTags = this.findAllPartialTags(template);
        for(let i = partialTags.length - 1; i >= 0; i--){
            let tag = partialTags[i];
            let partialContent = this.loadPartialTemplate(tag.name);
            if(!partialContent){
                Logger.warning('Partial template not found: ' + tag.name);
                processedTemplate = processedTemplate.substring(0, tag.start) + '' + processedTemplate.substring(tag.end);
                continue;
            }
            let wrapperTemplate = '{{#vars}}{{> ' + tag.name + '}}{{/vars}}';
            let renderData = { vars: tag.attributes };
            let partials = {[tag.name]: partialContent};
            processedTemplate = processedTemplate.substring(0, tag.start) +
                this.renderEngine.render(wrapperTemplate, renderData, partials) +
                processedTemplate.substring(tag.end);
        }
        return processedTemplate;
    }

    findAllPartialTags(template)
    {
        let partialTags = [];
        let searchPos = 0;
        let partialTagName = '<partial';
        for(let tagStart = template.indexOf(partialTagName, searchPos); -1 !== tagStart; tagStart = template.indexOf(partialTagName, searchPos)){
            let tagEnd = this.findPartialTagEnd(template, tagStart);
            if(-1 === tagEnd){
                searchPos = tagStart + partialTagName.length;
                continue;
            }
            let fullTag = template.substring(tagStart, tagEnd);
            let nameMatch = fullTag.match(/name=["']([^"']+)["']/);
            if(!nameMatch){
                searchPos = tagStart + partialTagName.length;
                continue;
            }
            let partialName = nameMatch[1];
            let attributes = this.parsePartialAttributes(fullTag, partialName);
            partialTags.push({
                start: tagStart,
                end: tagEnd,
                name: partialName,
                attributes: attributes,
                fullTag: fullTag
            });
            searchPos = tagEnd;
        }
        return partialTags;
    }

    findPartialTagEnd(template, tagStart)
    {
        let inQuotes = false;
        let quoteChar = '';
        let selfCloseTag = '/>';
        let openCloseTag = '</partial>';
        for(let i = tagStart; i < template.length; i++){
            let char = template[i];
            if(!inQuotes && ('"' === char || "'" === char)){
                inQuotes = true;
                quoteChar = char;
                continue;
            }
            if(inQuotes && char === quoteChar && '\\' !== template[i - 1]){
                inQuotes = false;
                quoteChar = '';
                continue;
            }
            if(!inQuotes){
                if(template.substring(i, i + selfCloseTag.length) === selfCloseTag){
                    return i + selfCloseTag.length;
                }
                if('>' === char){
                    let closeIndex = template.indexOf(openCloseTag, i);
                    if(-1 !== closeIndex){
                        return closeIndex + openCloseTag.length;
                    }
                    return i + 1;
                }
            }
        }
        return -1;
    }

    parsePartialAttributes(fullTag, partialName)
    {
        let namePattern = 'name=' + this.getQuotePattern(fullTag, partialName);
        let nameIndex = fullTag.indexOf(namePattern);
        if(-1 === nameIndex){
            return {};
        }
        let attributesStart = nameIndex + namePattern.length;
        let attributesEnd = fullTag.lastIndexOf('/>');
        if(-1 === attributesEnd){
            attributesEnd = fullTag.lastIndexOf('</partial>');
        }
        if(-1 === attributesEnd){
            attributesEnd = fullTag.lastIndexOf('>');
        }
        if(-1 === attributesEnd || attributesEnd <= attributesStart){
            return {};
        }
        let attributesString = fullTag.substring(attributesStart, attributesEnd).trim();
        return this.extractAttributesObject(attributesString);
    }

    getQuotePattern(fullTag, partialName)
    {
        if(fullTag.includes('name="' + partialName + '"')){
            return '"' + partialName + '"';
        }
        if(fullTag.includes("name='" + partialName + "'")){
            return "'" + partialName + "'";
        }
        return '"' + partialName + '"';
    }

    extractAttributesObject(attributesString)
    {
        if(!attributesString){
            return {};
        }
        let attributes = {};
        let regex = /(\w+)=(['"])((?:(?!\2)[^\\]|\\.)*)(\2)/g;
        for(let match of attributesString.matchAll(regex)){
            attributes[match[1]] = match[3];
        }
        return attributes;
    }

    loadPartialTemplate(partialName)
    {
        if(!this.getPartials){
            return false;
        }
        let partials = this.getPartials(this.currentDomain);
        if(sc.hasOwn(partials, partialName)){
            return partials[partialName];
        }
        return false;
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
        return template.substring(0, startPos) +
            await this.renderCollectionLoop(
                template.substring(startEnd, endPos),
                await this.fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson)
            ) + template.substring(endPos + endMatch[0].length);
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
