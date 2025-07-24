/**
 *
 * Reldens - CMS - DynamicFormRenderer
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class DynamicFormRenderer
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.templatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        this.defaultDomain = sc.get(props, 'defaultDomain', 'default');
        this.loadedTemplates = {};
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager not provided to DynamicFormRenderer - forms functionality disabled');
            this.isDisabled = true;
        }
    }

    async renderForm(formConfig, fieldsToRender, domain, req, attributes = {}, systemVariables = {}, enhancedData = {})
    {
        if(this.isDisabled){
            return '';
        }
        await this.events.emit('reldens.dynamicFormRenderer.beforeFieldsRender', {
            formConfig,
            fieldsToRender,
            domain,
            req,
            attributes,
            systemVariables,
            enhancedData
        });
        let formFields = await this.renderFormFields(fieldsToRender, domain, req);
        await this.events.emit('reldens.dynamicFormRenderer.afterFieldsRender', {
            formConfig,
            fieldsToRender,
            formFields,
            domain,
            req,
            attributes,
            systemVariables,
            enhancedData
        });
        let formTemplate = await this.loadFormTemplate('form', domain);
        if(!formTemplate){
            Logger.error('Form template not found');
            return '';
        }
        let messageData = this.parseFormMessages(req, attributes);
        return this.renderEngine.render(formTemplate, Object.assign({}, enhancedData, {
            formKey: formConfig.form_key,
            formFields,
            submitUrl: sc.get(attributes, 'submitUrl', '/dynamic-form'),
            successRedirect: sc.get(attributes, 'successRedirect', '/'),
            errorRedirect: sc.get(attributes, 'errorRedirect', '/'),
            honeypotFieldName: sc.get(attributes, 'honeypotFieldName', 'website_url'),
            submitButtonText: sc.get(attributes, 'submitButtonText', 'Submit'),
            cssClass: sc.get(attributes, 'cssClass', 'dynamic-form'),
            showSuccessMessage: messageData.showSuccessMessage,
            successMessage: messageData.successMessage,
            showErrorMessage: messageData.showErrorMessage,
            errorMessage: messageData.errorMessage,
            systemVariables
        }), this.getPartialsForDomain(domain));
    }

    parseFormMessages(req, attributes)
    {
        let queryParams = sc.get(req, 'query', {});
        let formSuccess = sc.get(queryParams, 'form-success', '');
        let formError = sc.get(queryParams, 'form-error', '');
        let formKey = sc.get(queryParams, 'form-key', '');
        let showSuccessMessage = '1' === formSuccess && '' !== formKey;
        let showErrorMessage = '' !== formError && '' !== formKey;
        let successMessage = sc.get(attributes, 'successMessage', 'Form submitted successfully!');
        let errorMessage = sc.get(attributes, 'errorMessage', formError || 'There was an error submitting the form.');
        return {
            showSuccessMessage,
            successMessage,
            showErrorMessage,
            errorMessage
        };
    }

    async renderFormFields(fieldsToRender, domain, req, submittedValues = {}, errors = {})
    {
        if(!sc.isArray(fieldsToRender) || 0 === fieldsToRender.length){
            return '';
        }
        let renderedFields = '';
        for(let field of fieldsToRender){
            if(!sc.isObject(field)){
                continue;
            }
            let fieldHtml = await this.renderFormField(field, domain, submittedValues, errors);
            if(fieldHtml){
                renderedFields += fieldHtml;
            }
        }
        return renderedFields;
    }

    async renderFormField(field, domain, submittedValues = {}, errors = {})
    {
        let fieldType = sc.get(field, 'type', 'text');
        let fieldTemplate = await this.loadFormTemplate('field_'+fieldType, domain);
        if(!fieldTemplate){
            fieldTemplate = await this.loadFormTemplate('field_text', domain);
        }
        if(!fieldTemplate){
            Logger.error('Field template not found for type: '+fieldType);
            return '';
        }
        return this.renderEngine.render(
            fieldTemplate,
            this.buildFieldTemplateData(field, submittedValues, errors),
            this.getPartialsForDomain(domain)
        );
    }

    buildFieldTemplateData(field, submittedValues = {}, errors = {})
    {
        let fieldName = sc.get(field, 'name', '');
        let fieldType = sc.get(field, 'type', 'text');
        let fieldLabel = sc.get(field, 'label', fieldName);
        let fieldValue = sc.get(submittedValues, fieldName, sc.get(field, 'defaultValue', ''));
        let isRequired = sc.get(field, 'required', false);
        let fieldError = sc.get(errors, fieldName, '');
        let options = sc.get(field, 'options', []);
        if(sc.isArray(options)){
            options = options.map(option => {
                if(sc.isObject(option)){
                    return {
                        value: sc.get(option, 'value', ''),
                        label: sc.get(option, 'label', sc.get(option, 'value', '')),
                        selected: sc.get(option, 'value', '') === fieldValue
                    };
                }
                return {
                    value: option,
                    label: option,
                    selected: option === fieldValue
                };
            });
        }
        return {
            field,
            fieldName,
            fieldType,
            fieldLabel,
            fieldValue,
            isRequired,
            fieldError,
            hasError: '' !== fieldError,
            requiredClass: isRequired ? 'required' : '',
            errorClass: '' !== fieldError ? 'error' : '',
            options,
            placeholder: sc.get(field, 'placeholder', ''),
            helpText: sc.get(field, 'helpText', ''),
            maxLength: sc.get(field, 'maxLength', ''),
            pattern: sc.get(field, 'pattern', ''),
            min: sc.get(field, 'min', ''),
            max: sc.get(field, 'max', ''),
            step: sc.get(field, 'step', '')
        };
    }

    async loadFormTemplate(templateName, domain)
    {
        let cacheKey = templateName+'_'+domain;
        if(sc.hasOwn(this.loadedTemplates, cacheKey)){
            return this.loadedTemplates[cacheKey];
        }
        let templatePath = this.findFormTemplate(templateName, domain);
        if(!templatePath){
            Logger.warning('Form template not found: '+templateName+' for domain: '+domain);
            return false;
        }
        let templateContent = await FileHandler.readFile(templatePath);
        if(!templateContent){
            Logger.error('Failed to read form template: '+templatePath);
            return false;
        }
        this.loadedTemplates[cacheKey] = templateContent;
        return templateContent;
    }

    findFormTemplate(templateName, domain)
    {
        let filename = templateName+'.html';
        let domainTemplatePath = FileHandler.joinPaths(this.templatesPath, 'domains', domain, 'cms_forms', filename);
        if(FileHandler.exists(domainTemplatePath)){
            return domainTemplatePath;
        }
        if(this.defaultDomain && domain !== this.defaultDomain){
            let defaultDomainPath = FileHandler.joinPaths(this.templatesPath, 'domains', this.defaultDomain, 'cms_forms', filename);
            if(FileHandler.exists(defaultDomainPath)){
                return defaultDomainPath;
            }
        }
        let rootTemplatePath = FileHandler.joinPaths(this.templatesPath, 'cms_forms', filename);
        if(FileHandler.exists(rootTemplatePath)){
            return rootTemplatePath;
        }
        return false;
    }

    getPartialsForDomain(domain)
    {
        if(!this.getPartials){
            Logger.error('getPartials function not provided to DynamicFormRenderer');
            return {};
        }
        return this.getPartials(domain);
    }

}

module.exports.DynamicFormRenderer = DynamicFormRenderer;
