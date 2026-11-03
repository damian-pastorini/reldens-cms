/**
 *
 * Reldens - Forwarded Headers Test
 *
 */

const http = require('http');
const { once } = require('events');
const { sc } = require('@reldens/utils');
const { AppServerFactory } = require('@reldens/server-utils');
const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { SystemVariablesProvider } = require('../../lib/template-engine/system-variables-provider');
const { EventsManagerSingleton } = require('@reldens/utils');
const { DynamicForm } = require('../../lib/dynamic-form');
const { DynamicFormRequestHandler } = require('../../lib/dynamic-form-request-handler');

class ForwardedHeadersTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.host = '127.0.0.1';
        this.siteHostname = 'site.example.com';
        this.forwardedHostname = 'public.example.com';
        this.forwardedPublicUrl = 'https://public.example.com';
        this.customPublicUrl = 'https://custom.example.com';
        this.spoofedHeaders = {'X-Forwarded-Host': this.forwardedHostname, 'X-Public-URL': this.customPublicUrl};
    }

    async run()
    {
        this.runner.suite('ForwardedHeaders');
        await this.testUntrustedClientHeaders();
        await this.testTrustedProxyHeaders();
        await this.testFormSubmissionHeaders();
        return this.runner.getResults();
    }

    async testFormSubmissionHeaders()
    {
        this.runner.group('form submission headers and redirects');
        let formRequestHandler = new DynamicFormRequestHandler({events: EventsManagerSingleton});
        await this.runner.test('should count the form rate limit by the request address, not X-Forwarded-For', async () => {
            assert.strictEqual(
                new DynamicForm({events: EventsManagerSingleton}).getClientIp(
                    {ip: this.host, headers: {'x-forwarded-for': this.forwardedHostname}}
                ),
                this.host
            );
        });
        await this.runner.test('should keep only the path of an absolute redirect URL', async () => {
            assert.strictEqual(
                formRequestHandler.buildSuccessRedirectPath(this.customPublicUrl+'/thanks?from=form', 'contact'),
                '/thanks?from=form&form-success=1&form-key=contact'
            );
        });
        await this.runner.test('should replace a protocol relative redirect by the home path', async () => {
            assert.strictEqual(
                formRequestHandler.buildSuccessRedirectPath('//'+this.forwardedHostname+'/thanks', 'contact'),
                '/?form-success=1&form-key=contact'
            );
        });
        await this.runner.test('should keep a same site redirect path', async () => {
            assert.strictEqual(
                formRequestHandler.buildSuccessRedirectPath('/thanks', 'contact'),
                '/thanks?form-success=1&form-key=contact'
            );
        });
    }

    async fetchRequestData(trustedProxy, headers)
    {
        let app = new AppServerFactory().applicationFramework();
        app.set('trust proxy', trustedProxy);
        let systemVariablesProvider = new SystemVariablesProvider({
            domainPublicUrlMapping: {[this.forwardedHostname]: this.forwardedPublicUrl}
        });
        app.get('/', (req, res) => {
            let domain = req.hostname;
            res.json({domain, publicUrl: systemVariablesProvider.buildCurrentRequestData(req, domain).publicUrl});
        });
        let server = http.createServer(app);
        server.listen(0, this.host);
        await once(server, 'listening');
        let request = http.request({
            host: this.host,
            port: server.address().port,
            path: '/',
            agent: false,
            headers: Object.assign({'Host': this.siteHostname}, headers)
        });
        request.end();
        let response = (await once(request, 'response')).shift();
        let chunks = [];
        for await (let chunk of response){
            chunks.push(chunk);
        }
        server.close();
        server.closeAllConnections();
        await once(server, 'close');
        return sc.parseJson(String(Buffer.concat(chunks)), {});
    }

    async testUntrustedClientHeaders()
    {
        this.runner.group('headers from a client that is not a trusted proxy');
        await this.runner.test('should resolve the domain from the Host header', async () => {
            let requestData = await this.fetchRequestData(false, this.spoofedHeaders);
            assert.strictEqual(requestData.domain, this.siteHostname);
        });
        await this.runner.test('should ignore the X-Public-URL and X-Forwarded-Host public URLs', async () => {
            let requestData = await this.fetchRequestData(false, this.spoofedHeaders);
            assert.strictEqual(requestData.publicUrl, 'http://'+this.siteHostname);
        });
    }

    async testTrustedProxyHeaders()
    {
        this.runner.group('headers from a trusted proxy');
        await this.runner.test('should resolve the domain from the X-Forwarded-Host header', async () => {
            let requestData = await this.fetchRequestData('loopback', this.spoofedHeaders);
            assert.strictEqual(requestData.domain, this.forwardedHostname);
        });
        await this.runner.test('should use the X-Public-URL header', async () => {
            let requestData = await this.fetchRequestData('loopback', {'X-Public-URL': this.customPublicUrl});
            assert.strictEqual(requestData.publicUrl, this.customPublicUrl);
        });
        await this.runner.test('should use the public URL mapped to the X-Forwarded-Host header', async () => {
            let requestData = await this.fetchRequestData('loopback', this.spoofedHeaders);
            assert.strictEqual(requestData.publicUrl, this.forwardedPublicUrl);
        });
    }

}

module.exports.ForwardedHeadersTest = ForwardedHeadersTest;
