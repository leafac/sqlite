<h1 align="center">@leafac/sqlite</h1>
<h3 align="center"><a href="https://npm.im/better-sqlite3">better-sqlite3</a> with <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals">tagged template literals</a></h3>
<p align="center">
<a href="https://github.com/leafac/sqlite"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/sqlite"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Fsqlite.svg"></a>
<a href="https://github.com/leafac/sqlite/actions"><img src="https://github.com/leafac/sqlite/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Installation

```console
$ npm install @leafac/sqlite
```

Use @leafac/sqlite with [the es6-string-html Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) for syntax highlighting the queries in the tagged template literals.

### Features, Usage, and Example

@leafac/sqlite is a [thin wrapper (< 100 lines of code)](src/index.ts) around better-sqlite3 which adds native TypeScript support (no need for `@types/...`) and the `sql` tagged template literal, for example:

```typescript
import { Database, sql } from "@leafac/sqlite";

const database = new Database(":memory:");
database.execute(
  sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
);
console.log(
  database.run(sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"})`)
); // => { changes: 1, lastInsertRowid: 1 }
console.log(database.get<{ name: string }>(sql`SELECT * from users`)); // => { id: 1, name: 'Leandro Facchinetti' }
```

The `Database` class is subclass of a better-sqlite3 database, so all [better-sqlite3 database’s methods](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#class-database) are available in `Database`.

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

The `Database` keeps a map from query sources to better-sqlite3 prepared statements (cache, memoization). To run a query, `Database` picks up on the data structure produced by the `sql` tag and looks for the query source in the map; if it’s a hit, then `Database` reuses the prepared statement and only binds the new parameters; otherwise `Database` creates the prepared statement, uses it, and stores it for later.

There’s no cache eviction policy in @leafac/sqlite. The prepared statements for every query ever ran hang around in memory for as long as the database object is alive (the statements aren’t eligible for garbage collection because they’re in the map). In most cases, that’s fine because there are only a limited number of queries; it’s the bound parameters that change. If that becomes a problem for you, you may access the cache under the `statements` property and implement your own cache eviction policy.

### Prior Art

- <https://npm.im/better-sqlite3>: @leafac/sqlite is a thin wrapper around better-sqlite3. The main differences are the support for tagged template literals and the native TypeScript support.
- <https://npm.im/sql-template-strings>: This was the inspiration for using tagged template literals in this way. Unfortunately, sql-template-strings is incompatible with better-sqlite3, thus @leafac/sqlite.
- <https://npm.im/html-template-tag>: I love (and stole) the idea of using `$${...}` to mark safe interpolation from html-template-tag.
