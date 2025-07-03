/**
 *
 * Reldens - CMS - CollectionsSingleTransformer
 *
 */

const { CollectionsTransformerBase } = require('./collections-transformer-base');
const { sc } = require('@reldens/utils');

class CollectionsSingleTransformer extends CollectionsTransformerBase
{

    constructor(props)
    {
        super(props);
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.findAllPartialTags = sc.get(props, 'findAllPartialTags', false);
        this.loadPartialTemplate = sc.get(props, 'loadPartialTemplate', false);
        this.processAllTemplateFunctions = sc.get(props, 'processAllTemplateFunctions', false);
    }

    getSingleFieldCollectionRegex()
    {
        return /<collection\s+([^>]+)\/>/g;
    }

    async transform(template, domain, req, systemVariables)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getSingleFieldCollectionRegex())){
            let tagContent = match[1];
            if(!tagContent.includes('field=')){
                continue;
            }
            let tableName = this.extractAttributeValue(tagContent, 'name');
            let filtersJson = this.extractAttributeValue(tagContent, 'filters');
            let queryOptionsJson = this.extractAttributeValue(tagContent, 'data');
            let relationsString = this.extractAttributeValue(tagContent, 'relations');
            let fieldName = this.extractAttributeValue(tagContent, 'field');
            processedTemplate = processedTemplate.replace(
                match[0],
                await this.extractFieldValues(
                    await this.fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson, relationsString),
                    fieldName,
                    domain,
                    req,
                    systemVariables
                )
            );
        }
        return processedTemplate;
    }

    async extractFieldValues(collectionData, fieldName, domain, req, systemVariables)
    {
        let fieldValues = '';
        for(let row of collectionData){
            let fieldValue = sc.get(row, fieldName, '');
            if(fieldValue && this.processAllTemplateFunctions){
                fieldValue = await this.processAllTemplateFunctions(fieldValue, domain, req, systemVariables);
            }
            fieldValues += fieldValue;
        }
        return fieldValues;
    }

}

module.exports.CollectionsSingleTransformer = CollectionsSingleTransformer;
