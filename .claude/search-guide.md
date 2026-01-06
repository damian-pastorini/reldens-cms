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
            relations: 'authors'
        }],
        pagination: {active: true, limit: 15, sortBy: 'created_at', sortDirection: 'desc'}
    }
};

const cms = new Manager({
    searchSets: searchSets
});
```
