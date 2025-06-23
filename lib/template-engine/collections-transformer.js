/**
 *
 * Reldens - CMS - CollectionsTransformer
 *
 */

const { CollectionsTransformerBase } = require('./collections-transformer-base');
const { Logger, sc } = require('@reldens/utils');

class CollectionsTransformer extends CollectionsTransformerBase
{

    constructor(props)
    {
        super(props);
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.findAllPartialTags = sc.get(props, 'findAllPartialTags', false);
        this.loadPartialTemplate = sc.get(props, 'loadPartialTemplate', false);
    }

    getLoopCollectionStartRegex()
    {
        return /<collection\s+([^>]+)>/g;
    }

    getLoopCollectionEndRegex()
    {
        return new RegExp('<\\/collection>');
    }

    async transform(template, domain)
    {
        let processedTemplate = template;
        let matches = [...template.matchAll(this.getLoopCollectionStartRegex())];
        for(let i = matches.length - 1; i >= 0; i--){
            let startMatch = matches[i];
            let tagContent = startMatch[1];
            if(tagContent.includes('field=')){
                continue;
            }
            let tableName = this.extractAttributeValue(tagContent, 'name');
            let filtersJson = this.extractAttributeValue(tagContent, 'filters');
            let queryOptionsJson = this.extractAttributeValue(tagContent, 'data');
            let relationsString = this.extractAttributeValue(tagContent, 'relations');
            let loopResult = await this.processLoopCollection(
                processedTemplate,
                startMatch,
                tableName,
                filtersJson,
                relationsString,
                queryOptionsJson,
                domain
            );
            if(loopResult){
                processedTemplate = loopResult;
            }
        }
        return processedTemplate;
    }

    async processLoopCollection(template, startMatch, tableName, filtersJson, relationsString, queryOptionsJson, domain)
    {
        let startPos = startMatch.index;
        let startEnd = startPos + startMatch[0].length;
        let endMatch = this.getLoopCollectionEndRegex().exec(template.substring(startEnd));
        if(!endMatch){
            Logger.warning('No matching end tag found for collection: '+tableName);
            return false;
        }
        let endPos = startEnd + endMatch.index;
        let loopContent = template.substring(startEnd, endPos);
        let collectionData = await this.fetchCollectionForTemplate(
            tableName,
            filtersJson,
            queryOptionsJson,
            relationsString
        );
        let renderedContent = await this.renderCollectionLoop(loopContent, collectionData, domain);
        return template.substring(0, startPos) + renderedContent + template.substring(endPos + endMatch[0].length);
    }

    async renderCollectionLoop(loopContent, collectionData, domain)
    {
        let renderedContent = '';
        for(let row of collectionData){
            renderedContent += await this.processPartialsInLoop(loopContent, row, domain);
        }
        return renderedContent;
    }

    async processPartialsInLoop(content, rowData, domain)
    {
        let processedContent = content;
        let partialTags = this.findAllPartialTags(content);
        for(let i = partialTags.length - 1; i >= 0; i--){
            let tag = partialTags[i];
            let partialContent = this.loadPartialTemplate(tag.name, domain);
            if(!partialContent){
                Logger.warning('Partial template not found: ' + tag.name);
                processedContent = processedContent.substring(0, tag.start)+''+processedContent.substring(tag.end);
                continue;
            }
            if(sc.hasOwn(tag.attributes, 'row')){
                processedContent = processedContent.substring(0, tag.start)
                    +this.renderEngine.render(partialContent, {row: rowData}, this.getPartials(domain))
                    +processedContent.substring(tag.end);
                continue;
            }
            let wrapperTemplate = '{{#vars}}{{> ' + tag.name + '}}{{/vars}}';
            let renderData = { vars: tag.attributes };
            let partials = {[tag.name]: partialContent};
            processedContent = processedContent.substring(0, tag.start) +
                this.renderEngine.render(wrapperTemplate, renderData, partials) +
                processedContent.substring(tag.end);
        }
        return this.renderEngine.render(processedContent, {row: rowData}, this.getPartials(domain));
    }

}

module.exports.CollectionsTransformer = CollectionsTransformer;
