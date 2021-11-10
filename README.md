<!--
- [ ] Return a dump of the final schema
    - [ ] https://github.com/leafac/sqlite-migration/issues/1
    - [ ] https://github.com/trevyn/turbosql/blob/2e46e42a78f929cb2492a87e7124ba49d01178ca/turbosql-impl/src/lib.rs#L281
- [ ] One more reason why forward only migrations make sense: alter table is limited in sqlite3
I think the documentation should be more like a fork of the documentation of better-sqlite3 otherwise it’s a prerequisite to read the better-sqlite3 docs and understand what you’re wrapper does. I think the current docs should be more of a footnote. Otherwise I wouldn’t see people taking it seriously as they are quickly trying to evaluate a library and browse the API.

Also the migration stuff is awesome but it should be more transparent how it works. ie the “pragma how it works” section should be inline with the migration docs IMO. Also a few examples of how to check the current migration scheme version would be helpful.

Document the IN operator and how it may blow up the cache (https://github.com/leafac/sqlite/pull/2)
-->

<h1 align="center">@leafac/sqlite</h1>
<h3 align="center"><a href="https://npm.im/better-sqlite3">better-sqlite3</a> with <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals">tagged template literals</a></h3>
<p align="center">
<a href="https://github.com/leafac/sqlite"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/sqlite"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Fsqlite.svg"></a>
<a href="https://github.com/leafac/sqlite/actions"><img src="https://github.com/leafac/sqlite/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Videos

[<img src="https://img.youtube.com/vi/3PCpXOPcVlM/0.jpg" width="200" /><br />Demonstration](https://youtu.be/3PCpXOPcVlM)

[<img src="https://img.youtube.com/vi/ORdYNOwpcsY/0.jpg" width="200" /><br />Code Review](https://youtu.be/ORdYNOwpcsY)

### Installation

```console
$ npm install @leafac/sqlite
```

Use @leafac/sqlite with [the es6-string-html Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) for syntax highlighting on the queries in the tagged template literals.

### Features, Usage, and Examples

@leafac/sqlite is a [thin wrapper (approximately 100 lines of code)](src/index.ts) around better-sqlite3 which adds the following features:

#### Prepared Statements Management

To use better-sqlite3 you must create prepared statements and then call them with parameters, for example:

```typescript
import BetterSqlite3Database from "better-sqlite3";

const betterSqlite3Database = new BetterSqlite3Database(":memory:");

betterSqlite3Database.exec(
  `CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
);
const statement = betterSqlite3Database.prepare(
  `INSERT INTO "users" ("name") VALUES (?)`
);
console.log(statement.run("Leandro Facchinetti")); // => { changes: 1, lastInsertRowid: 1 }
```

The benefit of this approach is that you may reuse the statements, which leads to better performance.

The problem with this approach is that you must manage statements in your application, and running simple queries becomes a two-step process.

@leafac/sqlite brings back the simplicity of issuing queries directly to the database object without losing the performance benefits of reuseable prepared statements (see [§ How It Works](#how-it-works)).

#### The `sql` Tagged Template Literal

Queries in @leafac/sqlite must be created with the `sql` tagged template literal; simple untagged strings don’t work. @leafac/sqlite needs the tagged template literal to manage the prepared statements and to guarantee that the parameters are escaped safely (see [§ How It Works](#how-it-works)).

For example:

```typescript
import { Database, sql } from "@leafac/sqlite";

const database = new Database(":memory:");
database.execute(
  sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
);
console.log(
  database.run(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
  )
); // => { changes: 1, lastInsertRowid: 1 }
console.log(database.get<{ name: string }>(sql`SELECT * from "users"`)); // => { id: 1, name: 'Leandro Facchinetti' }
```

You may interpolate raw SQL with the `$${...}` form, for example:

```typescript
sql`SELECT * FROM "users" WHERE "name" = ${"Leandro Facchinetti"} $${sql` AND "age" = ${30}`}`;
```

#### Convenience Methods for Transactions

In better-sqlite3, transactions follow a preparation/execution two-step process similar to the one followed by statements, as described in [§ Prepared Statements Management](#prepared-statements-management), for example:

```typescript
const transaction = database.transaction(() => {
  // Doesn’t execute immediately
});
// Execute the transaction
transaction();
```

@leafac/sqlite introduces convenience methods to execute a transaction in one step, for example:

```typescript
database.executeTransaction(() => {
  // Executes immediately
});
```

The function passed to the better-sqlite3 `.transaction()` method may have parameters, which will correspond to the arguments passed when executing the transaction. The function passed to the @leafac/sqlite `.executeTransaction()` method must not have any parameters.

#### Native TypeScript Support

No need for `npm install --save-dev @types/...`.

#### A Lightweight Migration System

For example:

```typescript
// At an early point in the process of developing an application:
database.migrate(
  sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
);

// At a later point a new migration is added:
database.migrate(
  sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,

  (database) => {
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
    );
  }
);
```

The `.migrate()` method receives as parameters `` sql`...` `` queries and arbitrary functions. Only the parameters that have not been run before are executed to bring the database up to the most recent version, so you should call `.migrate()` at your application startup. Migrations are run on a transaction, so if one of them fails everything rolls back (if your arbitrary functions have side-effects you’ll have to manage them yourself).

##### No Down Migrations

Most migration systems provide a way to **undo** migrations; something called **down** migrations. `.migrate()` doesn’t provide a down migration mechanism.

I believe that down migrations are more trouble to maintain (they can be a lot of work!) than they’re worth, particularly in small applications. Why? Because down migrations have two main selling points:

1. You may go back and forward with the database schema in development (think of alternating back and forth while working on different feature branches that change the database schema).
2. You may rollback a deployment that goes wrong in production.

But I don’t think these selling points hold up:

1. You may recreate the database from scratch whenever you need in development.
2. You almost never want to run a down migration in production because that would make you lose data.

In case something goes wrong, `.migrate()` requires you to write a new migration that undoes the troublesome previous migration. The only way through is forward!

##### Don’t Change Migrations That Already Run

`.migrate()` doesn’t run migrations that it ran in the past, so if you change an existing migration, it won’t take effect. `.migrate()` has no mechanism to detect and warn about this kind of issue (it can’t, because arbitrary functions don’t lend themselves to this kind of inspection).

### API

The `Database` class is a subclass of the better-sqlite3 database, so all [better-sqlite3 database’s methods](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#class-database) are available in `Database`. If you need to use the traditional two-step workflow of explicitly preparing a statement as mentioned in [§ Prepared Statements Management](#prepared-statements-management), you can do that.

The `Database` class introduces the following new methods:

- `.run(query, options)`, `.get<T>(query, options)`, `.all<T>(query, options)`, and `.iterate<T>(query, options)`: Equivalent to the corresponding methods in [better-sqlite3’s statements](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#runbindparameters---object). The differences are:

  1. These methods must be called on the database instead of on a prepared statement.
  2. These methods work with queries generated with the `sql` tagged template literal.
  3. **Advanced:** These methods accept an optional `options` parameter which should be an object with the `safeIntegers` field to control [the use of BigInt in the result](https://github.com/JoshuaWise/better-sqlite3/blob/v7.1.4/docs/integer.md). This changes the underlying statement until another query with the same statement sets `safeIntegers` to a different value. For example:

     ```typescript
     console.log(
       database.get<{ name: string }>(sql`SELECT * from "users"`, {
         safeIntegers: true,
       })
     ); // => { id: 1n, name: 'Leandro Facchinetti' }
     console.log(database.get<{ name: string }>(sql`SELECT * from "users"`)); // => { id: 1n, name: 'Leandro Facchinetti' }
     console.log(
       database.get<{ name: string }>(sql`SELECT * from "users"`, {
         safeIntegers: false,
       })
     ); // => { id: 1, name: 'Leandro Facchinetti' }
     ```

- `.execute<T>(query)`: Equivalent to [better-sqlite3’s `.exec()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#execstring---this), but adapted to work with the queries generated with the `sql` tagged template literal.

  You must not interpolate any parameters into queries passed to `.execute()`; for example, the following throws an error:

  ```typescript
  database.execute(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
  ); // => Throws an error
  ```

- `.executeTransaction<T>(fn)`, `.executeTransactionImmediate<T>(fn)`, and `.executeTransactionExclusive<T>(fn)`: Equivalent to [better-sqlite3’s `.transaction()`, `.transaction().immediate()`, and `.transaction().exclusive()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#transactionfunction---function), but execute the transaction immediately (see [§ Convenience Methods for Transactions](#convenience-methods-for-transactions)).

### How It Works

#### Prepared Statements Management & The `sql` Tagged Template Literal

The `sql` tag produces a data structure with the source of the query along with the parameters, for example, the following query:

```javascript
sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`;
```

becomes the following data structure:

```json
{
  "source": "INSERT INTO \"users\" (\"name\") VALUES (?)",
  "parameters": ["Leandro Facchinetti"]
}
```

The `Database` keeps a map from query sources to better-sqlite3 prepared statements (a **cache**; a technique called **memoization**). To run a query, `Database` picks up on the data structure produced by the `sql` tag and looks for the query source in the map; if it’s a hit, then `Database` reuses the prepared statement and only binds the new parameters; otherwise `Database` creates the prepared statement, uses it, and stores it for later.

There’s no cache eviction policy in @leafac/sqlite. The prepared statements for every query ever run hang around in memory for as long as the database object is alive (the statements aren’t eligible for garbage collection because they’re in the map). In most cases, that’s fine because there are only a limited number of queries; it’s the parameters that change. If that becomes a problem for you, you may access the cache under the `statements` property and implement your own cache eviction policy.

You may also use the low-level `.getStatement(source: string, options: Options)` method to get a hold of the underlying prepared statement in the cache (for example, to use [`.pluck()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#plucktogglestate---this), [`.expand()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#expandtogglestate---this), [`.raw()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#rawtogglestate---this), [`.columns()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#columns---array-of-objects), and [`.bind()`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#bindbindparameters---this)—though `.bind()` will probably render the prepared statement unusable by @leafac/sqlite).

#### Migration System

`.migrate()` uses the [`user_version` SQLite PRAGMA](https://www.sqlite.org/pragma.html#pragma_user_version) to store the number of migrations it ran in the past, and consults this number to avoid re-running migrations.

### Related Projects

- <https://npm.im/@leafac/html>: Use tagged template literals as an HTML template engine.

### Prior Art

- <https://npm.im/better-sqlite3>: The basis for @leafac/sqlite. The rest of this document explains how they’re different.
- <https://npm.im/sql-template-strings>: This was the inspiration for using tagged template literals in this way. Unfortunately, sql-template-strings is incompatible with better-sqlite3, thus @leafac/sqlite.
- <https://npm.im/html-template-tag>: I love (and stole) the idea of using `$${...}` to mark safe interpolation from html-template-tag.
- <https://npm.im/package/pg-lit>, <https://npm.im/package/slonik>: These packages also feature tagged template literals for SQL, but they’re for [PostgreSQL](https://www.postgresql.org/) instead of SQLite.
- <https://npm.im/sqlite>, and <https://npm.im/better-sqlite3-helper>: These packages include lightweight migration systems. `.migrate()` is even more lightweight: It doesn’t support **down** migrations and it requires the migrations to be passed as an array, as opposed to, for example, being stored in SQL files. (But you can come up with this array in any way you want, including, for example, reading from a bunch of SQL files.)
- <https://github.com/trevyn/turbosql>: After having published `.migrate()` the author of Turbosql [reached out](https://github.com/leafac/sqlite-migration/issues/1) to say that they independently arrived at a similar design, but in the Rust ecosystem instead of Node.js. It’s great to have company!

### Changelog

#### 2.0.0

- [ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
- Add support for the `IN` operator (https://github.com/leafac/sqlite/pull/2, thanks @mfbx9da4).
