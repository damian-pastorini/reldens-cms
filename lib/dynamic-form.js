/**
 *
 * Reldens - CMS - DynamicForm
 *
 */

const { SchemaValidator, Logger, sc } = require('@reldens/utils');

class DynamicForm
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.honeypotFieldName = sc.get(props, 'honeypotFieldName', 'website_url');
        this.allowedOrigins = sc.get(props, 'allowedOrigins', []);
        this.rateLimitCache = new Map();
        this.rateLimitWindow = sc.get(props, 'rateLimitWindow', 300000);
        this.rateLimitMax = sc.get(props, 'rateLimitMax', 5);
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager not provided to DynamicForm - forms functionality disabled');
            this.isDisabled = true;
        }
    }

    async validateFormSubmission(formKey, submittedValues, req)
    {
        if(this.isDisabled){
            return {isValid: false, error: 'Forms functionality disabled'};
        }
        if(!formKey || !submittedValues){
            return {isValid: false, error: 'Missing formKey or submittedValues'};
        }
        if(!sc.isObject(submittedValues)){
            return {isValid: false, error: 'Invalid submittedValues format'};
        }
        let formConfig = await this.getFormConfig(formKey);
        if(!formConfig){
            return {isValid: false, error: 'Form not found or disabled'};
        }
        await this.events.emit('reldens.dynamicForm.beforeValidation', {
            formKey,
            formConfig,
            submittedValues,
            req
        });
        let originValidation = this.validateOrigin(req);
        if(!originValidation.isValid){
            return originValidation;
        }
        let honeypotValidation = this.validateHoneypot(submittedValues);
        if(!honeypotValidation.isValid){
            return honeypotValidation;
        }
        let rateLimitValidation = this.validateRateLimit(req);
        if(!rateLimitValidation.isValid){
            return rateLimitValidation;
        }
        let fieldsValidation = this.validateFields(formConfig.fields_schema, submittedValues);
        if(!fieldsValidation.isValid){
            return fieldsValidation;
        }
        await this.events.emit('reldens.dynamicForm.afterValidation', {
            formKey,
            formConfig,
            submittedValues,
            req,
            validationResult: {isValid: true, formConfig}
        });
        return {isValid: true, formConfig};
    }

    async getFormConfig(formKey)
    {
        let formsEntity = this.dataServer.getEntity('cmsForms');
        if(!formsEntity){
            Logger.error('Forms entity not found');
            return false;
        }
        let form = await formsEntity.loadOneBy('form_key', formKey);
        if(!form || !form.enabled){
            return false;
        }
        return form;
    }

    validateHoneypot(submittedValues)
    {
        let honeypotValue = sc.get(submittedValues, this.honeypotFieldName, '');
        if('' !== honeypotValue){
            Logger.warning('Honeypot field filled, potential bot submission');
            return {isValid: false, error: 'Invalid submission'};
        }
        return {isValid: true};
    }

    validateOrigin(req)
    {
        if(0 === this.allowedOrigins.length){
            return {isValid: true};
        }
        let origin = sc.get(req.headers, 'origin', '');
        let referer = sc.get(req.headers, 'referer', '');
        let host = sc.get(req.headers, 'host', '');
        let isValidOrigin = false;
        for(let allowedOrigin of this.allowedOrigins){
            if(origin.includes(allowedOrigin) || referer.includes(allowedOrigin) || host.includes(allowedOrigin)){
                isValidOrigin = true;
                break;
            }
        }
        if(!isValidOrigin){
            Logger.warning('Invalid form submission origin: '+origin+' / '+referer+' / '+host);
            return {isValid: false, error: 'Invalid request origin'};
        }
        return {isValid: true};
    }

    validateRateLimit(req)
    {
        let clientIp = this.getClientIp(req);
        let now = Date.now();
        let clientLimits = this.rateLimitCache.get(clientIp) || {submissions: [], firstSubmission: now};
        clientLimits.submissions = clientLimits.submissions.filter(time => now - time < this.rateLimitWindow);
        if(clientLimits.submissions.length >= this.rateLimitMax){
            Logger.warning('Rate limit exceeded for IP: '+clientIp);
            return {isValid: false, error: 'Too many submissions, please try again later'};
        }
        clientLimits.submissions.push(now);
        this.rateLimitCache.set(clientIp, clientLimits);
        return {isValid: true};
    }

    getClientIp(req)
    {
        return sc.get(req.headers, 'x-forwarded-for', sc.get(req.connection, 'remoteAddress', 'unknown')).split(',')[0].trim();
    }

    validateFields(fieldsSchema, submittedValues)
    {
        let parsedSchema = sc.isString(fieldsSchema) ? sc.toJson(fieldsSchema) : fieldsSchema;
        if(!sc.isArray(parsedSchema)){
            Logger.error('Invalid fields schema format');
            return {isValid: false, error: 'Invalid form configuration'};
        }
        let schemaForValidator = {};
        let missingFields = [];
        for(let field of parsedSchema){
            if(!sc.isObject(field)){
                continue;
            }
            let fieldName = sc.get(field, 'name', '');
            let fieldType = sc.get(field, 'type', 'text');
            let isRequired = sc.get(field, 'required', false);
            if('' === fieldName){
                continue;
            }
            let validationSchema = this.buildValidationSchema(field, fieldType);
            validationSchema.required = isRequired;
            schemaForValidator[fieldName] = validationSchema;
            if(isRequired){
                let fieldValue = sc.get(submittedValues, fieldName, '');
                if('' === fieldValue || null === fieldValue || undefined === fieldValue){
                    let fieldLabel = sc.get(field, 'label', fieldName);
                    missingFields.push(fieldLabel);
                }
            }
        }
        if(0 < missingFields.length){
            return {
                isValid: false,
                error: 'Required fields missing: '+missingFields.join(', '),
                missingFields
            };
        }
        let validator = new SchemaValidator(schemaForValidator);
        if(!validator.validate(submittedValues)){
            return {isValid: false, error: 'Invalid field values provided'};
        }
        return {isValid: true};
    }

    buildValidationSchema(field, fieldType)
    {
        let schema = {type: 'string'};
        let minLength = sc.get(field, 'minLength', 0);
        let maxLength = sc.get(field, 'maxLength', 0);
        let pattern = sc.get(field, 'pattern', '');
        let min = sc.get(field, 'min', '');
        let max = sc.get(field, 'max', '');
        if('number' === fieldType){
            schema.type = 'number';
            if('' !== min && sc.isNumber(Number(min))){
                schema.min = Number(min);
            }
            if('' !== max && sc.isNumber(Number(max))){
                schema.max = Number(max);
            }
        }
        if('email' === fieldType){
            schema.custom = (value) => {
                if(!value){
                    return true;
                }
                let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailPattern.test(value);
            };
        }
        if(0 < minLength){
            schema.min = minLength;
        }
        if(0 < maxLength){
            schema.max = maxLength;
        }
        if('' !== pattern){
            try {
                schema.pattern = new RegExp(pattern);
            } catch(error) {
                Logger.warning('Invalid field pattern: '+pattern+' for field: '+sc.get(field, 'name', ''));
            }
        }
        let options = sc.get(field, 'options', []);
        if(sc.isArray(options) && 0 < options.length){
            schema.enum = options.map(option => {
                return sc.isObject(option) ? sc.get(option, 'value', '') : option;
            });
        }
        return schema;
    }

    prepareSubmittedValues(submittedValues, fieldsSchema)
    {
        let parsedSchema = sc.isString(fieldsSchema) ? sc.toJson(fieldsSchema) : fieldsSchema;
        if(!sc.isArray(parsedSchema)){
            return submittedValues;
        }
        let prepared = {};
        for(let field of parsedSchema){
            if(!sc.isObject(field)){
                continue;
            }
            let fieldName = sc.get(field, 'name', '');
            let fieldType = sc.get(field, 'type', 'text');
            let fieldValue = sc.get(submittedValues, fieldName, '');
            if('' === fieldName){
                continue;
            }
            prepared[fieldName] = this.normalizeFieldValue(fieldValue, fieldType, field);
        }
        return prepared;
    }

    normalizeFieldValue(value, type, field = {})
    {
        if(!value){
            return '';
        }
        let stringValue = String(value);
        if('email' === type){
            stringValue = stringValue.toLowerCase().trim();
        }
        if('number' === type){
            let numberValue = parseFloat(stringValue);
            return isNaN(numberValue) ? '' : numberValue;
        }
        let maxLength = sc.get(field, 'maxLength', 0);
        if(0 < maxLength){
            stringValue = stringValue.substring(0, maxLength);
        }
        return stringValue;
    }

    async saveFormSubmission(formConfig, preparedValues)
    {
        let submissionsEntity = this.dataServer.getEntity('cmsFormsSubmitted');
        if(!submissionsEntity){
            Logger.error('Forms submissions entity not found');
            return false;
        }
        await this.events.emit('reldens.dynamicForm.beforeSave', {
            formConfig,
            preparedValues
        });
        try {
            let submissionData = {
                form_id: formConfig.id,
                submitted_values: JSON.stringify(preparedValues)
            };
            let result = await submissionsEntity.create(submissionData);
            if(!result){
                Logger.error('Failed to save form submission');
                return false;
            }
            await this.events.emit('reldens.dynamicForm.afterSave', {
                formConfig,
                preparedValues,
                result
            });
            Logger.info('Form submission saved successfully for form: '+formConfig.form_key);
            return result;
        } catch(error) {
            Logger.error('Error saving form submission: '+error.message);
            return false;
        }
    }

}

module.exports.DynamicForm = DynamicForm;
