/**
 *
 * Reldens - Search Test
 *
 */

const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { Search } = require('../../lib/search');
const { SearchFixtures } = require('../fixtures/search-fixtures');

class SearchTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.defaultSearch = new Search({});
        this.defaultEntityConfig = [...this.defaultSearch.searchSets.cmsPagesSearch.entities].shift();
        this.withoutAccessRules = () => ({});
        this.accessRules = {cmsPages: {publicConditions: {enabled: 1, locale: 'en'}}};
        this.getAccessRules = (entityName) => Object.assign({}, this.accessRules[entityName]);
    }

    async run()
    {
        this.runner.suite('Search');
        await this.testSearchTerms();
        await this.testSearchFilters();
        await this.testSearchLimit();
        return this.runner.getResults();
    }

    async testSearchTerms()
    {
        this.runner.group('search terms');
        let minimumLength = this.defaultSearch.minimumSearchTermLength;
        let maximumLength = this.defaultSearch.maximumSearchTermLength;
        await this.runner.test('should not search a term made only of LIKE wildcards', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: '%'}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.filters.length, 0);
        });
        await this.runner.test('should not search a term made only of underscores', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: '___'}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.filters.length, 0);
        });
        await this.runner.test('should not search a term shorter than the minimum length without wildcards', async () => {
            let shortTerm = 'a'.repeat(minimumLength - 1)+'%_ ';
            let recordedCalls = await SearchFixtures.runSearch({search: shortTerm}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.filters.length, 0);
        });
        await this.runner.test('should not search an entity term made only of LIKE wildcards', async () => {
            let recordedCalls = await SearchFixtures.runSearch({'search[cmsPages]': '%%%'}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.filters.length, 0);
        });
        await this.runner.test('should search a term with the minimum length', async () => {
            let minimumTerm = 'a'.repeat(minimumLength);
            let recordedCalls = await SearchFixtures.runSearch({search: minimumTerm}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.filters.length, 1);
        });
        await this.runner.test('should cut a term longer than the maximum length', async () => {
            let longTerm = 'a'.repeat(maximumLength + 50);
            let recordedCalls = await SearchFixtures.runSearch({search: longTerm}, this.withoutAccessRules);
            let firstField = [...this.defaultEntityConfig.fields].shift();
            assert.strictEqual(
                [...recordedCalls.filters.shift().OR].shift()[firstField].value,
                '%'+'a'.repeat(maximumLength)+'%'
            );
        });
    }

    async testSearchFilters()
    {
        this.runner.group('search filters');
        let publicLocale = this.accessRules.cmsPages.publicConditions.locale;
        await this.runner.test('should only search the enabled pages with the default search set', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: 'reldens'}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.filters.shift().enabled, 1);
        });
        await this.runner.test('should apply the entity public conditions to the search filters', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: 'reldens'}, this.getAccessRules);
            assert.strictEqual(recordedCalls.filters.shift().locale, publicLocale);
        });
        await this.runner.test('should keep the public conditions over the search set filters', async () => {
            let recordedCalls = await SearchFixtures.runSearch(
                {search: 'reldens'},
                this.getAccessRules,
                {searchSets: {cmsPagesSearch: {entities: [{name: 'cmsPages', fields: ['title'], filters: {locale: 'es'}}]}}}
            );
            assert.strictEqual(recordedCalls.filters.shift().locale, publicLocale);
        });
        await this.runner.test('should keep a search term condition per searchable field', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: 'reldens'}, this.getAccessRules);
            assert.strictEqual(recordedCalls.filters.shift().OR.length, this.defaultEntityConfig.fields.length);
        });
    }

    async testSearchLimit()
    {
        this.runner.group('search limit');
        let setLimit = this.defaultSearch.searchSets.cmsPagesSearch.pagination.limit;
        await this.runner.test('should cap the request limit to the search set limit without a public max limit', async () => {
            let recordedCalls = await SearchFixtures.runSearch({search: 'reldens', limit: '5000'}, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.queryOptions.shift().limit, setLimit);
        });
        await this.runner.test('should apply a request limit lower than the search set limit', async () => {
            let lowerLimit = setLimit - 1;
            let query = {search: 'reldens', limit: String(lowerLimit)};
            let recordedCalls = await SearchFixtures.runSearch(query, this.withoutAccessRules);
            assert.strictEqual(recordedCalls.queryOptions.shift().limit, lowerLimit);
        });
    }

}

module.exports.SearchTest = SearchTest;
