# Search Functionality Guide

## Basic Search

```bash
/search?search=technology
/search?search=javascript&limit=20
/search?search=news&renderPartial=newsListView&renderLayout=minimal
```

## Advanced Search with Template Data

Pass custom template variables through URL parameters:

```bash
/search?search=articles&templateData[columnsClass]=col-md-4&templateData[showExcerpt]=true
/search?search=technology&templateData[columnsClass]=col-lg-6&templateData[cardClass]=shadow-sm&templateData[showAuthor]=false
```

## Search Template Variables

Templates receive dynamic data through URL parameters.

**URL Example:**
```
/search?search=tech&templateData[columnsClass]=col-md-6&templateData[showDate]=true
```

**Template (entriesListView.html):**
```html
<div class="{{columnsClass}}">
    <div class="card">
        <h3>{{row.title}}</h3>
        <p>{{row.content}}</p>
        {{#showDate}}
        <span class="date">{{row.created_at}}</span>
        {{/showDate}}
    </div>
</div>
```

**Default Values:**

- `columnsClass` defaults to `col-lg-6` if not provided or empty
- Custom variables can be added via `templateData[variableName]=value`

## Search Configuration

Custom search sets in Manager configuration:

```javascript
const searchSets = {
    articlesSearch: {
        entities: [{
            name: 'articles',
            fields: ['title', 'content', 'summary'],
            relations: 'related_authors'
        }],
        pagination: {active: true, limit: 15, sortBy: 'created_at', sortDirection: 'desc'},
        render: {partial: 'articlesListView', templateData: {columnsClass: 'col-md-4'}},
        requestOptions: {entities: false, relations: false, pagination: true, render: false, templateData: false}
    }
};

const cms = new Manager({
    searchEnabled: true,
    searchSets: searchSets
});
```

## Search Set Selection

- `set-key` (the set name with the `-key` suffix) selects the search set: `/search?search=news&set-key=articlesSearch`.
- Without `set-key` the `cmsPagesSearch` set is used, an unknown set redirects to `/?error-message=searchInvalidParameters`.
- The search cache key uses every query parameter of the search, so each search term and set has its own cached file (up to `cacheMaxVariantsPerPath`).

## Search Security Options

- `searchEnabled` (Manager, default `true`) - `false` does not register the search route.
- `entities_access` row with `entity_name` `cmsSearch` (`searchAccessKey`), when present: `is_public` replaces `searchEnabled` and `access_rules.searchSets` replaces the sets with the same key, loaded on start. The same entry can be passed in the Manager `entityAccess` argument (`entityAccess.cmsSearch.accessRules.searchSets`), its `public` value is written to `is_public` when the row is created.
- `render` (search set) - Default page, layout, paginationContainer, partial and templateData for the set.
- `requestOptions` (search set) - What the URL can change, every option is `false` by default except `pagination`:
  - `entities` - `entity[name]=fields`, only the fields in the entity access rules `publicFilters` are kept.
  - `relations` - `relations[name]=...`, only the relations already defined in the set are kept.
  - `pagination` - `limit`, `pageNumber`, `sortBy`, `sortDirection`, the limit is capped by the entity access rules `publicMaxLimit` and the sort only applies on the `publicSort` properties.
  - `render` - `renderPage`, `renderLayout`, `renderPaginationContainer`, `renderPartial`.
  - `templateData` - `templateData[name]=value`.
- The URL examples with `renderPartial`, `renderLayout` and `templateData[...]` above require their `requestOptions` enabled.
