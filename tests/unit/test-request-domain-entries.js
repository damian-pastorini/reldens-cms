/**
 *
 * Reldens - Request Domain Entries Test
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { EventsManagerSingleton } = require('@reldens/utils');
const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const os = require('os');
const { CacheManager } = require('../../lib/cache/cache-manager');
const { DynamicFormRenderer } = require('../../lib/dynamic-form-renderer');
const { RequestProcessor } = require('../../lib/frontend/request-processor');

class RequestDomainEntriesTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.projectRoot = process.cwd();
        this.configuredDomains = [
            'www.site.example.com',
            'site.example.com',
            'default.example.com',
            'public.example.com',
            'vhost.example.com',
            'alias.example.com',
            'app.example.com'
        ];
        this.unknownDomain = 'unknown.example.com';
    }

    async run()
    {
        this.runner.suite('RequestDomainEntries');
        await this.testCacheDomains();
        await this.testFormTemplateEntries();
        await this.testCacheKeys();
        await this.testCacheVariantsLimit();
        return this.runner.getResults();
    }

    async testCacheKeys()
    {
        this.runner.group('cache keys for the request query');
        let requestProcessor = new RequestProcessor({});
        let pageTwoQuery = {'news-key': '{"page":2}'};
        await this.runner.test('should not cache a form result page', async () => {
            assert.strictEqual(requestProcessor.buildCacheKey('/contact', {query: {'form-key': 'contact'}}), false);
        });
        await this.runner.test('should ignore the query parameters that are not collection keys', async () => {
            assert.strictEqual(
                requestProcessor.buildCacheKey('/news', {query: Object.assign({other: 'value'}, pageTwoQuery)}),
                requestProcessor.buildCacheKey('/news', {query: pageTwoQuery})
            );
        });
        await this.runner.test('should build a different key for a different collection page', async () => {
            assert.notStrictEqual(
                requestProcessor.buildCacheKey('/news', {query: {'news-key': '{"page":3}'}}),
                requestProcessor.buildCacheKey('/news', {query: pageTwoQuery})
            );
        });
    }

    async testCacheVariantsLimit()
    {
        this.runner.group('cache variants per path');
        let cacheManager = new CacheManager({
            projectRoot: FileHandler.joinPaths(os.tmpdir(), 'reldens-cms-cache-test-'+Date.now()),
            enabled: true,
            maxVariantsPerPath: 2,
            defaultDomain: this.configuredDomains[1]
        });
        let domain = this.configuredDomains[1];
        await cacheManager.set(domain, '/news', 'page');
        let writtenVariant = await cacheManager.set(domain, '/news_first', 'variant', '/news');
        let refusedVariant = await cacheManager.set(domain, '/news_second', 'variant', '/news');
        await cacheManager.clear();
        await this.runner.test('should write a query variant below the limit', async () => {
            assert.strictEqual(writtenVariant, true);
        });
        await this.runner.test('should not write a query variant over the limit', async () => {
            assert.strictEqual(refusedVariant, false);
        });
    }

    createCacheManager()
    {
        return new CacheManager({
            projectRoot: this.projectRoot,
            enabled: true,
            domainMapping: {'www.site.example.com': 'site.example.com'},
            defaultDomain: 'default.example.com',
            domainPublicUrlMapping: {'public.example.com': 'https://public.example.com'},
            domains: [{hostname: 'vhost.example.com', aliases: ['alias.example.com']}],
            publicUrls: ['https://app.example.com:8443', '']
        });
    }

    async testCacheDomains()
    {
        this.runner.group('cache entries for the request domain');
        let cacheManager = this.createCacheManager();
        await this.runner.test('should cache every configured domain', async () => {
            assert.deepStrictEqual(
                this.configuredDomains.filter((domain) => !cacheManager.generateEnabledCacheKey(domain, '/')),
                []
            );
        });
        await this.runner.test('should not cache a domain that is not configured', async () => {
            assert.strictEqual(cacheManager.generateEnabledCacheKey(this.unknownDomain, '/'), false);
        });
        await this.runner.test('should cache a request without domain in the default folder', async () => {
            assert.strictEqual(
                cacheManager.generateEnabledCacheKey('', '/').fullPath,
                FileHandler.joinPaths(cacheManager.cacheBasePath, 'default', 'index.html')
            );
        });
    }

    async testFormTemplateEntries()
    {
        this.runner.group('form templates loaded for the request domain');
        await this.runner.test('should keep a single entry for the domains resolved to the same template', async () => {
            let dynamicFormRenderer = new DynamicFormRenderer({
                projectRoot: this.projectRoot,
                events: EventsManagerSingleton
            });
            await dynamicFormRenderer.loadFormTemplate('form', this.configuredDomains[0]);
            await dynamicFormRenderer.loadFormTemplate('form', this.unknownDomain);
            assert.deepStrictEqual(
                Object.keys(dynamicFormRenderer.loadedTemplates),
                [FileHandler.joinPaths(this.projectRoot, 'templates', 'cms_forms', 'form.html')]
            );
        });
    }

}

module.exports.RequestDomainEntriesTest = RequestDomainEntriesTest;
