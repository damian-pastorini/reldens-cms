/**
 *
 * Reldens - CMS - CollectionsSingleTransformer
 *
 */

const { CollectionsTransformerBase } = require('./collections-transformer-base');
const { sc } = require('@reldens/utils');

class CollectionsSingleTransformer extends CollectionsTransformerBase
{

    getSingleFieldCollectionRegex()
    {
        return /<collection\s+([^>]+)\/>/g;
    }

    async transform(template, domain)
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
                this.extractFieldValues(
                    await this.fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson, relationsString),
                    fieldName
                )
            );
        }
        return processedTemplate;
    }

    extractFieldValues(collectionData, fieldName)
    {
        let fieldValues = '';
        for(let row of collectionData){
            fieldValues += sc.get(row, fieldName, '');
        }
        return fieldValues;
    }

}

module.exports.CollectionsSingleTransformer = CollectionsSingleTransformer;
