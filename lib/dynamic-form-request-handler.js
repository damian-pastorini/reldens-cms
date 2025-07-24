/**
 *
 * Reldens - CMS - DynamicFormRequestHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class DynamicFormRequestHandler
{

    constructor(props)
    {
        this.dynamicForm = sc.get(props, 'dynamicForm', false);
        this.contentRenderer = sc.get(props, 'contentRenderer', false);
        this.requestProcessor = sc.get(props, 'requestProcessor', false);
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.enableJsonResponse = sc.get(props, 'enableJsonResponse', false);
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager not provided to DynamicFormRequestHandler - forms functionality disabled');
            this.isDisabled = true;
        }
    }

    async handleFormSubmission(req, res)
    {
        if(this.isDisabled){
            return this.handleBadRequest(res, 'Forms functionality disabled');
        }
        try {
            let formKey = sc.get(req.body, 'formKey', '');
            let submittedValues = sc.get(req.body, 'submittedValues', {});
            if(!formKey || !submittedValues){
                return this.handleBadRequest(res, 'Missing formKey or submittedValues');
            }
            await this.events.emit('reldens.dynamicFormRequestHandler.beforeValidation', {
                formKey,
                submittedValues,
                req,
                res
            });
            let validation = await this.dynamicForm.validateFormSubmission(formKey, submittedValues, req);
            if(!validation.isValid){
                return this.handleValidationError(req, res, validation.error, formKey);
            }
            let preparedValues = this.dynamicForm.prepareSubmittedValues(
                submittedValues,
                validation.formConfig.fields_schema
            );
            await this.events.emit('reldens.dynamicFormRequestHandler.beforeSave', {
                formKey,
                preparedValues,
                formConfig: validation.formConfig,
                req,
                res
            });
            let submissionResult = await this.dynamicForm.saveFormSubmission(
                validation.formConfig,
                preparedValues
            );
            if(!submissionResult){
                return this.handleValidationError(req, res, 'Failed to save form submission', formKey);
            }
            await this.events.emit('reldens.dynamicFormRequestHandler.afterSave', {
                formKey,
                submissionResult,
                formConfig: validation.formConfig,
                req,
                res
            });
            return this.handleSuccessResponse(req, res, formKey, submissionResult);
        } catch(error) {
            Logger.error('Form submission handling error: '+error.message);
            return this.handleBadRequest(res, 'Internal server error');
        }
    }

    handleBadRequest(res, message)
    {
        if(this.enableJsonResponse){
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        return res.status(400).send('Bad Request: '+message);
    }

    handleValidationError(req, res, error, formKey)
    {
        if(this.enableJsonResponse){
            return res.status(400).json({
                success: false,
                error: error,
                formKey: formKey
            });
        }
        return res.redirect(this.buildErrorRedirectPath(req, error, formKey));
    }

    handleSuccessResponse(req, res, formKey, submissionResult)
    {
        if(this.enableJsonResponse){
            return res.json({
                success: true,
                message: 'Form submitted successfully',
                formKey: formKey,
                submissionId: submissionResult.id
            });
        }
        return res.redirect(this.buildSuccessRedirectPath(sc.get(req.body, 'successRedirect', '/'), formKey));
    }

    buildErrorRedirectPath(req, error, formKey)
    {
        let baseRedirect = sc.get(req.body, 'errorRedirect', '/');
        let finalRedirect = sc.get(req.headers, 'referer', baseRedirect) || baseRedirect;
        return finalRedirect
            +(finalRedirect.includes('?') ? '&' : '?')
            +'form-error='+encodeURIComponent(error)
            +'&form-key='+encodeURIComponent(formKey);
    }

    buildSuccessRedirectPath(successRedirect, formKey)
    {
        return successRedirect
            +(successRedirect.includes('?') ? '&' : '?')
            +'form-success=1'
            +'&form-key='+encodeURIComponent(formKey);
    }

}

module.exports.DynamicFormRequestHandler = DynamicFormRequestHandler;
