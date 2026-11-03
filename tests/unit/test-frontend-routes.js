/**
 *
 * Reldens - Frontend Routes Test
 *
 */

const http = require('http');
const { EventsManagerSingleton } = require('@reldens/utils');
const { AppServerFactory } = require('@reldens/server-utils');
const { LocalHttpExchange } = require('@reldens/server-utils/tests/local-http-exchange');
const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { Frontend } = require('../../lib/frontend');

class FrontendRoutesTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.localHttpExchange = new LocalHttpExchange();
        this.rootRoute = {id: 1, path: '/', domain: null, redirect_url: '/home', redirect_type: '302'};
        this.deepRoute = {
            id: 2,
            path: '/blog/category/first-post',
            domain: null,
            redirect_url: '/blog',
            redirect_type: '301'
        };
        this.slashRoute = {id: 3, path: '/about/', domain: null};
        this.routes = [this.rootRoute, this.deepRoute, this.slashRoute];
        this.malformedJsonBody = '{"formKey":';
    }

    async run()
    {
        this.runner.suite('FrontendRoutes');
        await this.testCatchAllRoute();
        await this.testErrorResponse();
        return this.runner.getResults();
    }

    createFrontend(app, appServerFactory)
    {
        let frontend = new Frontend({
            app,
            appServerFactory,
            events: EventsManagerSingleton,
            dataServer: {
                getEntity: () => ({load: async (filters) => this.routes.filter((route) => route.path === filters.path)})
            }
        });
        frontend.setupRoutes();
        return frontend;
    }

    async requestFrontendPath(path)
    {
        let app = new AppServerFactory().applicationFramework();
        this.createFrontend(app, false);
        return await this.localHttpExchange.requestServer(http.createServer(app), {path});
    }

    async testCatchAllRoute()
    {
        this.runner.group('catch-all route');
        await this.runner.test('should handle the root path', async () => {
            let response = await this.requestFrontendPath(this.rootRoute.path);
            assert.strictEqual(response.statusCode, Number(this.rootRoute.redirect_type));
            assert.strictEqual(response.headers.location, this.rootRoute.redirect_url);
        });
        await this.runner.test('should handle a deep path', async () => {
            let response = await this.requestFrontendPath(this.deepRoute.path);
            assert.strictEqual(response.statusCode, Number(this.deepRoute.redirect_type));
            assert.strictEqual(response.headers.location, this.deepRoute.redirect_url);
        });
        await this.runner.test('should redirect a route path requested without the trailing slash', async () => {
            let response = await this.requestFrontendPath(this.slashRoute.path.slice(0, -1));
            assert.strictEqual(response.statusCode, 301);
            assert.strictEqual(response.headers.location, this.slashRoute.path);
        });
    }

    async sendMalformedJson()
    {
        let recordedErrors = [];
        let appServerFactory = new AppServerFactory();
        appServerFactory.createAppServer({onError: (event) => recordedErrors.push(event)});
        return {
            response: await this.localHttpExchange.requestServer(
                http.createServer(appServerFactory.app),
                {
                    method: 'POST',
                    path: this.createFrontend(appServerFactory.app, appServerFactory).dynamicFormPath,
                    headers: {'Content-Type': 'application/json'}
                },
                this.malformedJsonBody
            ),
            recordedErrors
        };
    }

    async testErrorResponse()
    {
        this.runner.group('error response');
        await this.runner.test('should answer a malformed JSON body with 400 and without the error stack', async () => {
            let exchange = await this.sendMalformedJson();
            assert.strictEqual(exchange.response.statusCode, 400);
            assert.strictEqual(String(exchange.response.body).includes('SyntaxError'), false);
        });
        await this.runner.test('should report the malformed JSON body through the onError callback', async () => {
            let exchange = await this.sendMalformedJson();
            assert.strictEqual([...exchange.recordedErrors].pop().key, 'request-error');
        });
    }

}

module.exports.FrontendRoutesTest = FrontendRoutesTest;
