/**
 *
 * Reldens - Search Fixtures
 *
 */

const { Search } = require('../../lib/search');

class SearchFixtures
{

    static createRecordingEntity()
    {
        return {
            recordedCalls: {filters: [], queryOptions: [], relations: []},
            count: async () => 1,
            async loadEntityData(filters, queryOptions, relationsString)
            {
                this.recordedCalls.filters.push(filters);
                this.recordedCalls.queryOptions.push(queryOptions);
                this.recordedCalls.relations.push(relationsString);
                return [];
            },
            preserveEntityState: () => ({}),
            restoreEntityState: () => true
        };
    }

    static async runSearch(query, getAccessRules, extraProps = {})
    {
        let entity = SearchFixtures.createRecordingEntity();
        let search = new Search(Object.assign({dataServer: {getEntity: () => entity}, getAccessRules}, extraProps));
        await search.executeSearch(search.parseSearchParameters(query));
        return entity.recordedCalls;
    }

}

module.exports.SearchFixtures = SearchFixtures;
