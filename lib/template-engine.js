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
            await this.processLoopCollections(
                await this.processSingleFieldCollections(
                    await this.processEntityFunctions(template)
                )
            ),
            data,
            partials
        );
    }

    getEntityRegex()
    {
        return /\{\{\s*entity\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"]\s*)?\)\s*\}\}/g;
    }

    getSingleFieldCollectionRegex()
    {
        return /\{\{\s*collection\(\s*['"]([^'"]+)['"]\s*,\s*(\{[^}]*\})\s*,\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g;
    }

    getLoopCollectionStartRegex()
    {
        return /\{\{\s*#collection\(\s*['"]([^'"]+)['"]\s*,\s*(\{[^}]*\})\s*\)\s*\}\}/g;
    }

    getLoopCollectionEndRegex(tableName)
    {
        return new RegExp('\\{\\{\\s*\\/collection\\(\\s*[\'"]'
            +this.escapeRegex(tableName)
            +'[\'"]\\s*\\)\\s*\\}\\}'
        );
    }

    async processEntityFunctions(template)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getEntityRegex())){
            let tableName = match[1];
            let identifier = match[2];
            let identifierField = match[3] || 'id';
            let entityData = await this.fetchEntityForTemplate(tableName, identifier, identifierField);
            processedTemplate = processedTemplate.replace(match[0], sc.get(entityData, 'content', ''));
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
            processedTemplate = processedTemplate.replace(
                match[0],
                this.extractFieldValues(
                    await this.fetchCollectionForTemplate(tableName, filtersJson),
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
            let tableName = startMatch[1];
            let filtersJson = startMatch[2];
            let loopResult = await this.processLoopCollection(processedTemplate, startMatch, tableName, filtersJson);
            if(false !== loopResult){
                processedTemplate = loopResult;
            }
        }
        return processedTemplate;
    }

    async processLoopCollection(template, startMatch, tableName, filtersJson)
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
            await this.fetchCollectionForTemplate(tableName, filtersJson)
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

    async fetchCollectionForTemplate(tableName, filtersJson)
    {
        let entity = this.dataServer.getEntity(tableName);
        if(!entity){
            Logger.warning('Entity not found in dataServer: '+tableName);
            return [];
        }
        let filters = sc.toJson(filtersJson);
        if(!filters){
            return await entity.loadAll();
        }
        return await entity.load(filters);
    }

}

module.exports.TemplateEngine = TemplateEngine;
