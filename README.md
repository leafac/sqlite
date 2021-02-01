<h1 align="center">@leafac/sqlite</h1>
<h3 align="center"><a href="https://npm.im/better-sqlite3">better-sqlite3</a> with tagged template literals</h3>
<p align="center">
<a href="https://github.com/leafac/sqlite"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/sqlite"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Fsqlite.svg"></a>
<a href="https://github.com/leafac/sqlite/actions"><img src="https://github.com/leafac/sqlite/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Installation

```console
$ npm install @leafac/sqlite
```

### Features, Usage, and Examples

See [`src/index.test.ts`](src/index.test.ts).

**Bonus feature:** [The implementation](src/index.ts) is so short and straightforward that you can inspect it yourself.

### How It Works

The `sql` tag produces a data structure with the source of the query along with the parameters, for example, the following query:

```javascript
sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"})`;
```

becomes the following data structure:

```json
{
  "source": "INSERT INTO users (name) VALUES (?)",
  "parameters": ["Leandro Facchinetti"]
}
```

The `Database` class maintains a better-sqlite3 database as well as a map from query sources to better-sqlite3 prepared statements (cache, memoization). To run a query, the `Database` class picks up on the data structure produced by the `sql` tag. First, the `Database` class looks for the query source in the map; if it’s there, then the `Database` class reuses the prepared statement and only binds the new parameters; otherwise the `Database` class creates the prepared statement, uses it, and stores it for later.

There’s no cache eviction policy in @leafac/sqlite. The prepared statements for every query ever ran hang around in memory as long as the database object is alive (the statements aren’t eligible for garbage collection because they’re in the map). In most cases, that’s fine because there only a limited number of queries; it’s the bound parameters that changes. If that becomes a problem for you, you may access the cache under the `statements` property of the database object and implement your own cache eviction policy.

### Recommendation

Use @leafac/sqlite with [the es6-string-html Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) for syntax highlighting of the queries in the tagged template literals.

### Prior Art

- <https://npm.im/better-sqlite3>: @leafac/sqlite is a thin wrapper around better-sqlite3. The main differences are the support for tagged template literals and native TypeScript support.
- <https://npm.im/sql-template-strings>: Inspired the idea of using tagged template literals in this way. Unfortunately, sql-template-strings is incompatible with better-sqlite3, thus @leafac/sqlite.
- <https://npm.im/html-template-tag>: I love (and stole) the idea of using `$${...}` to mark safe interpolation from html-template-tag.
