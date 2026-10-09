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
            recordedCalls: {filters: [], queryOptions: []},
            count: async () => 1,
            async loadEntityData(filters, queryOptions)
            {
                this.recordedCalls.filters.push(filters);
                this.recordedCalls.queryOptions.push(queryOptions);
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
