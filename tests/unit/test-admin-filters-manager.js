/**
 *
 * Reldens - AdminFiltersManager Test
 *
 */

const querystring = require('querystring');
const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { AdminFiltersManager } = require('../../lib/admin-manager/admin-filters-manager');
const { AdminResourcesFixtures } = require('../fixtures/admin-resources-fixtures');

class AdminFiltersManagerTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.filtersManager = new AdminFiltersManager();
        this.properties = AdminResourcesFixtures.itemsItemResource().options.properties;
        this.filterValues = AdminResourcesFixtures.itemsItemRows().map((row) => row.label);
        this.filterValue = [...this.filterValues].pop();
    }

    async run()
    {
        this.runner.suite('AdminFiltersManager');
        await this.testFetchFiltersFromQuery();
        return this.runner.getResults();
    }

    async testFetchFiltersFromQuery()
    {
        this.runner.group('fetchFiltersFromQuery');
        await this.runner.test('should read the filters[key] keys of the pagination links', async () => {
            let query = querystring.parse('page=2&filters[label]='+encodeURIComponent(this.filterValue));
            assert.deepStrictEqual(
                this.filtersManager.fetchFiltersFromQuery(query, this.properties),
                {label: this.filterValue}
            );
        });
        await this.runner.test('should read the encoded filters[key] keys written by the admin client', async () => {
            let query = querystring.parse(
                new URLSearchParams({page: '2', 'filters[label]': this.filterValue}).toString()
            );
            assert.deepStrictEqual(
                this.filtersManager.fetchFiltersFromQuery(query, this.properties),
                {label: this.filterValue}
            );
        });
        await this.runner.test('should ignore the filter keys that are not resource properties', async () => {
            let query = querystring.parse('filters[constructor]=label&filters[missing]=label');
            assert.deepStrictEqual(this.filtersManager.fetchFiltersFromQuery(query, this.properties), {});
        });
        await this.runner.test('should ignore a repeated filter key', async () => {
            let query = querystring.parse(this.filterValues.map((value) => 'filters[label]='+value).join('&'));
            assert.deepStrictEqual(this.filtersManager.fetchFiltersFromQuery(query, this.properties), {});
        });
        await this.runner.test('should return no filters without a query', async () => {
            assert.deepStrictEqual(this.filtersManager.fetchFiltersFromQuery(null, this.properties), {});
        });
    }

}

module.exports.AdminFiltersManagerTest = AdminFiltersManagerTest;
