/**
 *
 * Reldens - Pagination Handler Test
 *
 */

const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { PaginationHandler } = require('../../lib/pagination-handler');
const { Search } = require('../../lib/search');
const { SearchFixtures } = require('../fixtures/search-fixtures');

class PaginationHandlerTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.accessRules = {
            cmsPages: {publicFilters: ['category_id'], publicSort: ['publish_date'], publicMaxLimit: 50},
            routes: {publicMaxLimit: 0},
            cmsBlocks: {}
        };
        this.getAccessRules = (entityName) => Object.assign({}, this.accessRules[entityName]);
        this.paginationHandler = new PaginationHandler({getAccessRules: this.getAccessRules});
        this.templateParams = {filters: {enabled: true}, limit: 20, sortBy: 'id', sortDirection: 'asc'};
    }

    async run()
    {
        this.runner.suite('PaginationHandler');
        await this.testRequestFilters();
        await this.testRequestLimits();
        await this.testRequestSort();
        await this.testSearchRequestParameters();
        return this.runner.getResults();
    }

    async testRequestFilters()
    {
        this.runner.group('mergeCollectionParameters filters');
        let handler = this.paginationHandler;
        await this.runner.test('should apply a request filter on a public filter property', async () => {
            assert.deepStrictEqual(
                handler.mergeCollectionParameters(this.templateParams, {filters: {category_id: 3}}, 'cmsPages').filters,
                {category_id: 3, enabled: true}
            );
        });
        await this.runner.test('should drop a request filter on a property that is not a public filter', async () => {
            assert.deepStrictEqual(
                handler.mergeCollectionParameters(this.templateParams, {filters: {title: 'any'}}, 'cmsPages').filters,
                {enabled: true}
            );
        });
        await this.runner.test('should keep the template filter over the request filter', async () => {
            assert.deepStrictEqual(
                handler.mergeCollectionParameters(this.templateParams, {filters: {enabled: false}}, 'cmsPages').filters,
                {enabled: true}
            );
        });
        await this.runner.test('should drop a public filter with a value that is not a scalar', async () => {
            assert.deepStrictEqual(
                handler.mergeCollectionParameters(
                    this.templateParams,
                    {filters: {category_id: {operator: 'LIKE'}}},
                    'cmsPages'
                ).filters,
                {enabled: true}
            );
        });
    }

    async testRequestLimits()
    {
        this.runner.group('mergeCollectionParameters limit');
        let handler = this.paginationHandler;
        await this.runner.test('should use the template limit without a request limit', async () => {
            assert.strictEqual(
                handler.mergeCollectionParameters(this.templateParams, {}, 'cmsPages').limit,
                this.templateParams.limit
            );
        });
        await this.runner.test('should cap the request limit to the entity public max limit', async () => {
            assert.strictEqual(handler.mergeCollectionParameters(this.templateParams, {limit: 5000}, 'cmsPages').limit, 50);
        });
        await this.runner.test('should cap the request limit to the template limit without a public max limit', async () => {
            assert.strictEqual(
                handler.mergeCollectionParameters(this.templateParams, {limit: 5000}, 'cmsBlocks').limit,
                this.templateParams.limit
            );
        });
        await this.runner.test('should apply a request limit lower than the template limit', async () => {
            assert.strictEqual(handler.mergeCollectionParameters(this.templateParams, {limit: 5}, 'cmsBlocks').limit, 5);
        });
        await this.runner.test('should allow any request limit when the entity public max limit is 0', async () => {
            assert.strictEqual(handler.mergeCollectionParameters(this.templateParams, {limit: 5000}, 'routes').limit, 5000);
        });
    }

    async testRequestSort()
    {
        this.runner.group('mergeCollectionParameters sort');
        let handler = this.paginationHandler;
        await this.runner.test('should apply a request sort on a public sort property', async () => {
            assert.strictEqual(
                handler.mergeCollectionParameters(this.templateParams, {sortBy: 'publish_date'}, 'cmsPages').sortBy,
                'publish_date'
            );
        });
        await this.runner.test('should keep the template sort for a property that is not a public sort', async () => {
            assert.strictEqual(
                handler.mergeCollectionParameters(this.templateParams, {sortBy: 'category_id'}, 'cmsPages').sortBy,
                this.templateParams.sortBy
            );
        });
    }

    async testSearchRequestParameters()
    {
        this.runner.group('search request parameters');
        await this.runner.test('should cap the search request limit to the entity public max limit', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: 'reldens', limit: '5000'}, this.getAccessRules);
            assert.strictEqual(recordedCalls.queryOptions.shift().limit, 50);
        });
        await this.runner.test('should keep the search set sort for a property that is not a public sort', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: 'reldens', sortBy: 'category_id'}, this.getAccessRules);
            assert.strictEqual(
                recordedCalls.queryOptions.shift().sortBy,
                new Search({}).searchSets.cmsPagesSearch.pagination.sortBy
            );
        });
        await this.testSearchRequestOptions();
    }

    createOptionsSearch(requestOptions)
    {
        return new Search({
            getAccessRules: this.getAccessRules,
            searchSets: {
                cmsPagesSearch: {
                    entities: [{name: 'cmsPages', fields: ['title'], relations: 'related_routes'}],
                    pagination: {active: true, limit: 20, sortBy: 'id', sortDirection: 'asc'},
                    requestOptions
                }
            }
        });
    }

    async testSearchRequestOptions()
    {
        this.runner.group('search request options');
        let defaultQuery = {
            search: 'reldens',
            'entity[cmsPages]': 'content,category_id',
            'relations[cmsPages]': 'related_routes,related_users',
            renderPartial: 'otherPartial',
            'templateData[columnsClass]': 'col-12'
        };
        await this.runner.test('should ignore the request entities, relations and render values by default', async () => {
            let config = this.createOptionsSearch({}).parseSearchParameters(defaultQuery);
            assert.deepStrictEqual(
                [config.entities[0].fields, config.entities[0].relations, config.render.partial, config.render.templateData],
                [['title'], 'related_routes', 'entriesListView', {}]
            );
        });
        await this.runner.test('should keep only the public filter fields and the set relations when enabled', async () => {
            let config = this.createOptionsSearch({entities: true, relations: true}).parseSearchParameters(defaultQuery);
            assert.deepStrictEqual(
                [config.entities[0].fields, config.entities[0].relations],
                [['category_id'], 'related_routes']
            );
        });
        await this.runner.test('should not keep the template data of a previous search', async () => {
            let search = this.createOptionsSearch({templateData: true});
            search.parseSearchParameters(defaultQuery);
            assert.deepStrictEqual(search.parseSearchParameters({search: 'reldens'}).render.templateData, {});
        });
        await this.runner.test('should replace a search set with the search access rules set', async () => {
            let search = this.createOptionsSearch({});
            search.applySearchAccessRules({searchSets: {cmsPagesSearch: {entities: [{name: 'cmsPages', fields: ['summary']}]}}});
            assert.deepStrictEqual(search.parseSearchParameters({search: 'reldens'}).entities[0].fields, ['summary']);
        });
    }

}

module.exports.PaginationHandlerTest = PaginationHandlerTest;
