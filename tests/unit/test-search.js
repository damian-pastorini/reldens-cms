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
        this.publicFilterField = 'title';
        this.getPublicFiltersRules = () => ({publicFilters: [this.publicFilterField]});
        this.requestOptionsSearchSets = {
            searchSets: {
                cmsPagesSearch: {
                    entities: [Object.assign({}, this.defaultEntityConfig)],
                    requestOptions: {entities: true, relations: true}
                }
            }
        };
    }

    async run()
    {
        this.runner.suite('Search');
        await this.testSearchTerms();
        await this.testSearchFilters();
        await this.testSearchLimit();
        await this.testFlatQueryKeys();
        return this.runner.getResults();
    }

    async testFlatQueryKeys()
    {
        this.runner.group('flat query keys of the simple query parser');
        await this.runner.test('should search only the entity[name] fields allowed by the publicFilters', async () => {
            let recordedCalls = await SearchFixtures.runSearch(
                {search: 'reldens', 'entity[cmsPages]': this.publicFilterField+',password'},
                this.getPublicFiltersRules,
                this.requestOptionsSearchSets
            );
            let orConditions = recordedCalls.filters.shift().OR;
            assert.strictEqual(orConditions.length, 1);
            assert.deepStrictEqual(Object.keys([...orConditions].shift()), [this.publicFilterField]);
        });
        await this.runner.test('should keep the set fields when the entity[name] fields are not public', async () => {
            let recordedCalls = await SearchFixtures.runSearch(
                {search: 'reldens', 'entity[cmsPages]': this.publicFilterField},
                this.withoutAccessRules,
                this.requestOptionsSearchSets
            );
            assert.strictEqual(recordedCalls.filters.shift().OR.length, this.defaultEntityConfig.fields.length);
        });
        await this.runner.test('should drop the relations[name] values not configured in the set', async () => {
            let recordedCalls = await SearchFixtures.runSearch(
                {search: 'reldens', 'relations[cmsPages]': 'users'},
                this.withoutAccessRules,
                this.requestOptionsSearchSets
            );
            assert.strictEqual(recordedCalls.relations.shift(), '');
        });
        await this.runner.test('should read the templateData[name] keys when the set allows them', async () => {
            let columnsClass = 'col-md-4';
            let search = new Search({
                searchSets: {
                    cmsPagesSearch: {entities: [this.defaultEntityConfig], requestOptions: {templateData: true}}
                }
            });
            let config = search.parseSearchParameters({search: 'reldens', 'templateData[columnsClass]': columnsClass});
            assert.strictEqual(config.render.templateData.columnsClass, columnsClass);
        });
        await this.runner.test('should apply the search[name] term to the entity', async () => {
            let recordedCalls = await SearchFixtures.runSearch({'search[cmsPages]': 'reldens'}, this.withoutAccessRules);
            let firstField = [...this.defaultEntityConfig.fields].shift();
            assert.strictEqual([...recordedCalls.filters.shift().OR].shift()[firstField].value, '%reldens%');
        });
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
