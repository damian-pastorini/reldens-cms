/**
 *
 * Reldens - Path Traversal Test
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { CacheManager } = require('../../lib/cache/cache-manager');
const { TemplateResolver } = require('../../lib/frontend/template-resolver');
const { DynamicFormRenderer } = require('../../lib/dynamic-form-renderer');
const { EventsManagerSingleton } = require('@reldens/utils');

class PathTraversalTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.projectRoot = process.cwd();
        this.templatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        this.domain = 'site.example.com';
        this.outsideTemplatePath = '/../package';
    }

    async run()
    {
        this.runner.suite('PathTraversal');
        await this.testCacheKeys();
        await this.testTemplatePaths();
        return this.runner.getResults();
    }

    async testCacheKeys()
    {
        this.runner.group('cache keys built from the request domain and path');
        let cacheManager = new CacheManager({projectRoot: this.projectRoot});
        await this.runner.test('should build the cache file inside the domain folder', async () => {
            assert.strictEqual(
                cacheManager.generateCacheKey(this.domain, '/blog/post').fullPath,
                FileHandler.joinPaths(cacheManager.cacheBasePath, this.domain, 'blog', 'post.html')
            );
        });
        await this.runner.test('should reject a domain that leaves the cache folder', async () => {
            assert.strictEqual(cacheManager.generateCacheKey('..', '/'), false);
        });
        await this.runner.test('should reject a path that leaves the domain folder', async () => {
            assert.strictEqual(cacheManager.generateCacheKey(this.domain, '/../../package'), false);
        });
    }

    async testTemplatePaths()
    {
        this.runner.group('templates resolved from the request path');
        let templateResolver = new TemplateResolver({templatesPath: this.templatesPath});
        await this.runner.test('should find a template inside the templates folder', async () => {
            assert.strictEqual(
                templateResolver.findTemplateByPath('/404', ''),
                FileHandler.joinPaths(this.templatesPath, '404.html')
            );
        });
        await this.runner.test('should not resolve an existing file outside the templates folder', async () => {
            assert.strictEqual(
                FileHandler.exists(FileHandler.joinPaths(this.templatesPath, this.outsideTemplatePath+'.json')),
                true
            );
            assert.strictEqual(templateResolver.findTemplateByPath(this.outsideTemplatePath, ''), false);
        });
        await this.runner.test('should not resolve a form template folder outside the templates from the domain', async () => {
            let outsideDomain = ['..', '..', 'tests', 'fixtures'].join('/');
            assert.strictEqual(
                FileHandler.exists(FileHandler.joinPaths(this.templatesPath, 'domains', outsideDomain, 'cms_forms', 'form.html')),
                true
            );
            assert.strictEqual(
                new DynamicFormRenderer({projectRoot: this.projectRoot, events: EventsManagerSingleton})
                    .findFormTemplate('form', outsideDomain),
                FileHandler.joinPaths(this.templatesPath, 'cms_forms', 'form.html')
            );
        });
    }

}

module.exports.PathTraversalTest = PathTraversalTest;
