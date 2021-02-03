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

Use @leafac/sqlite with [the es6-string-html Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) for syntax highlighting on the queries in the tagged template literals.

### Features, Usage, and Examples

@leafac/sqlite is a [thin wrapper (fewer than 100 lines of code)](src/index.ts) around better-sqlite3 which adds the following features.

#### Prepared Statements Management

To use better-sqlite3 you must create prepared statements and then call them with parameters, for example:

```typescript
import BetterSqlite3Database from "better-sqlite3";

const betterSqlite3Database = new BetterSqlite3Database(":memory:");

betterSqlite3Database.exec(
  `CREATE TABLE users (id INTEGER PRIMARY KEY  AUTOINCREMENT, name TEXT);`
);
const statement = betterSqlite3Database.prepare(
  `INSERT INTO users (name) VALUES (?)`
);
console.log(statement.run("Leandro Facchinetti")); // => { changes: 1, lastInsertRowid: 1 }
```

The benefit of this approach is that you may reuse the statements, which leads to better performance.

The problem with this approach is that you must manage statements in your application, and running simple queries becomes a two-step process.

@leafac/sqlite brings back the simplicity of issuing queries directly to the database object without losing the performance benefits of reuseable prepared statements (see [§ How It Works](#how-it-works)).

#### The `sql` Tagged Template Literal

Queries in @leafac/sqlite must be created with the `sql` tagged template literal; simple untagged strings don’t work. Internally @leafac/sqlite uses the tagged template literal to manage the prepared statements and to guarantee that the parameters are escaped safely (see [§ How It Works](#how-it-works)).

For example:

```typescript
import { Database, sql } from "@leafac/sqlite";

const database = new Database(":memory:");
database.execute(
  sql`CREATE TABLE users (id INTEGER PRIMARY KEY  AUTOINCREMENT, name TEXT);`
);
console.log(
  database.run(sql`INSERT INTO users (name) VALUES ($ {"Leandro Facchinetti"})`)
); // => { changes: 1, lastInsertRowid: 1 }
console.log(database.get<{ name: string }>(sql`SELECT * from  users`)); // => { id: 1, name: 'Leandro Facchinetti' }
```

You may interpolate raw SQL with the `$${...}` form, for example:

```typescript
sql`SELECT * FROM users WHERE name = ${"Leandro Facchinetti"} $${sql` AND age = ${30}`}`;
```

#### Native TypeScript Support

No need for `npm install --save-dev @types/...`.

### API

The `Database` class is subclass of a better-sqlite3 database, so all [better-sqlite3 database’s methods](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#class-database) are available in `Database`. If you need to use the traditional two-step workflow of explicitly preparing a statement as mentioned in [§ Prepared Statements Management](#prepared-statements-management), you can do that.

The `Database` class introduces the following methods:

- `.run(query)`, `.get<T>(query)`, `.all<T>(query)`, and `.iterate<T>(query)`: Equivalent to the corresponding methods in [better-sqlite3’s statements](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#runbindparameters---object). The differences are: 1. These methods must be called on the database instead of on prepared statements; and 2. These methods work with queries generated with the `sql` tagged template literal.

- `.execute<T>(query)`: Equivalent to [better-sqlite3’s `.exec()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#execstring---this), but adapted to work with the queries generated with the `sql` tagged template literal. You must not interpolate any parameters into queries issued with `.execute()`.

- `.executeTransaction<T>(fn)`: Equivalent to [better-sqlite3’s `.transaction()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#transactionfunction---function), but simply executes the function `fn`, which should receive no arguments, instead of returning a function that you then have to call. For example:

  ```typescript
  // better-sqlite3
  const transaction = database.transaction(() => {
    // Doesn’t execute immediately
  });
  // Execute the transaction
  transaction();

  // @leafac/sqlite
  database.executeTransaction(() => {
    // Executes immediately
  });
  ```

- `.executeTransactionImmediate<T>(fn)`: Equivalent to [better-sqlite3’s `.transaction().immediate()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#transactionfunction---function). See discussion above on `.executeTransaction<T>(fn)` for details.

- `.executeTransactionExclusive<T>(fn)`: Equivalent to [better-sqlite3’s `.transaction().exclusive()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#transactionfunction---function). See discussion above on `.executeTransaction<T>(fn)` for details.

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

The `Database` keeps a map from query sources to better-sqlite3 prepared statements (a **cache**; a technique called **memoization**). To run a query, `Database` picks up on the data structure produced by the `sql` tag and looks for the query source in the map; if it’s a hit, then `Database` reuses the prepared statement and only binds the new parameters; otherwise `Database` creates the prepared statement, uses it, and stores it for later.

There’s no cache eviction policy in @leafac/sqlite. The prepared statements for every query ever run hang around in memory for as long as the database object is alive (the statements aren’t eligible for garbage collection because they’re in the map). In most cases, that’s fine because there are only a limited number of queries; it’s the parameters that change. If that becomes a problem for you, you may access the cache under the `statements` property and implement your own cache eviction policy.

You may also use the low-level `.getStatement(source: string)` method to get a hold of the underlying prepared statement in the cache (for example, to use [`.pluck()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#plucktogglestate---this), [`.expand()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#expandtogglestate---this), [`.raw()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#rawtogglestate---this), [`.columns()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#columns---array-of-objects), and [`.bind()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#bindbindparameters---this)—though `.bind()` will probably render the prepared statement unusable by @leafac/sqlite).

### Related Projects

- <https://npm.im/@leafac/html>: Use tagged template literals as an HTML template engine.
- <https://npm.im/@leafac/sqlite-migration>: A bare-bones migration system for @leafac/sqlite.

### Prior Art

- <https://npm.im/better-sqlite3>: @leafac/sqlite is a thin wrapper around better-sqlite3. The main differences are the support for tagged template literals and the native TypeScript support.
- <https://npm.im/sql-template-strings>: This was the inspiration for using tagged template literals in this way. Unfortunately, sql-template-strings is incompatible with better-sqlite3, thus @leafac/sqlite.
- <https://npm.im/html-template-tag>: I love (and stole) the idea of using `$${...}` to mark safe interpolation from html-template-tag.
