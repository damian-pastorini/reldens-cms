/**
 *
 * Reldens - CMS - FormsTransformer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class FormsTransformer
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.processAllTemplateFunctions = sc.get(props, 'processAllTemplateFunctions', false);
        this.dynamicForm = sc.get(props, 'dynamicForm', false);
        this.dynamicFormRenderer = sc.get(props, 'dynamicFormRenderer', false);
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager not provided to FormsTransformer - forms functionality disabled');
            this.isDisabled = true;
        }
    }

    async transform(template, domain, req, systemVariables, enhancedData = {})
    {
        if(this.isDisabled){
            return template;
        }
        let processedTemplate = template;
        let formTags = this.findAllFormTags(template);
        for(let i = formTags.length - 1; i >= 0; i--){
            let tag = formTags[i];
            let formKey = sc.get(tag.attributes, 'key', '');
            if(!formKey){
                Logger.warning('cmsForm tag missing key attribute');
                processedTemplate = processedTemplate.substring(0, tag.start)+''+processedTemplate.substring(tag.end);
                continue;
            }
            let formConfig = await this.dynamicForm.getFormConfig(formKey);
            if(!formConfig){
                Logger.warning('Form not found or disabled: '+formKey);
                processedTemplate = processedTemplate.substring(0, tag.start)+''+processedTemplate.substring(tag.end);
                continue;
            }
            let fieldsToRender = this.parseFieldsFilter(tag.attributes, formConfig);
            if(!sc.isArray(fieldsToRender) || 0 === fieldsToRender.length){
                processedTemplate = processedTemplate.substring(0, tag.start)+''+processedTemplate.substring(tag.end);
                continue;
            }
            await this.events.emit('reldens.formsTransformer.beforeRender', {
                formKey,
                formConfig,
                fieldsToRender,
                formAttributes: tag.attributes,
                domain,
                req,
                systemVariables,
                enhancedData
            });
            let formContent = await this.dynamicFormRenderer.renderForm(
                formConfig,
                fieldsToRender,
                domain,
                req,
                Object.assign({}, tag.attributes, {
                    successRedirect: sc.get(tag.attributes, 'successRedirect', req.path),
                    errorRedirect: sc.get(tag.attributes, 'errorRedirect', req.path)
                }),
                systemVariables,
                enhancedData
            );
            await this.events.emit('reldens.formsTransformer.afterRender', {
                formKey,
                formConfig,
                formContent,
                domain,
                req,
                systemVariables,
                enhancedData
            });
            processedTemplate = processedTemplate.substring(0, tag.start) +
                formContent +
                processedTemplate.substring(tag.end);
        }
        return processedTemplate;
    }

    findAllFormTags(template)
    {
        let formTags = [];
        let pos = 0;
        let cmsForm = '<cmsForm';
        for(let tagStart = template.indexOf(cmsForm, pos); -1 !== tagStart; tagStart=template.indexOf(cmsForm, pos)){
            let tagEnd = this.findFormTagEnd(template, tagStart);
            if(-1 === tagEnd){
                pos = tagStart + cmsForm.length;
                continue;
            }
            let fullTag = template.substring(tagStart, tagEnd);
            let attributes = this.parseFormAttributes(fullTag);
            formTags.push({
                start: tagStart,
                end: tagEnd,
                attributes: attributes,
                fullTag: fullTag
            });
            pos = tagEnd;
        }
        return formTags;
    }

    findFormTagEnd(template, tagStart)
    {
        let inQuotes = false;
        let quoteChar = '';
        let selfCloseTag = '/>';
        let openCloseTag = '</cmsForm>';
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

    parseFormAttributes(fullTag)
    {
        let attributes = {};
        let valueRegex = /(\w+)=(['"])((?:(?!\2)[^\\]|\\.)*)(\2)/g;
        for(let match of fullTag.matchAll(valueRegex)){
            attributes[match[1]] = match[3];
        }
        let booleanRegex = /\b(\w+)(?!\s*=)/g;
        for(let match of fullTag.matchAll(booleanRegex)){
            if(!sc.hasOwn(attributes, match[1]) && 'cmsForm' !== match[1]){
                attributes[match[1]] = true;
            }
        }
        return attributes;
    }

    parseFieldsFilter(attributes, formConfig)
    {
        let fieldsFilter = sc.get(attributes, 'fields', '');
        if(!fieldsFilter){
            return formConfig.fields_schema;
        }
        let fieldsSchema = sc.isString(formConfig.fields_schema) ? sc.toJson(formConfig.fields_schema) : formConfig.fields_schema;
        if(!sc.isArray(fieldsSchema)){
            return [];
        }
        let requestedFields = fieldsFilter.split(',').map(f => f.trim()).filter(f => '' !== f);
        let filteredFields = [];
        for(let fieldName of requestedFields){
            let field = sc.fetchByProperty(fieldsSchema, 'name', fieldName);
            if(field){
                filteredFields.push(field);
            }
        }
        return filteredFields;
    }

}

module.exports.FormsTransformer = FormsTransformer;
