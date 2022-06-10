import BetterSqlite3Database from "better-sqlite3";
import assert from "node:assert/strict";

export interface Options {
  safeIntegers?: boolean;
}

export interface Query {
  source: string;
  parameters: any[];
}

// FIXME: Use BetterSqlite3Database generics: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794
// FIXME: In BetterSqlite3Database types, make ‘filename’ optional, in which case a temporary database is created (see https://www.sqlite.org/inmemorydb.html § Temporary Databases)
// FIXME: In BetterSqlite3Database types, make BindParameters more specific than ‘any’
export class Database extends BetterSqlite3Database {
  #statements: Map<string, BetterSqlite3Database.Statement> = new Map();

  execute(query: Query): this {
    if (query.parameters.length > 0)
      throw new Error(
        `Failed to execute(${JSON.stringify(
          query,
          undefined,
          2
        )}) because execute() doesn’t support queries with parameters`
      );
    return this.exec(query.source);
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.execute(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
      });
      database.close();
    }
  }

  run(query: Query, options: Options = {}): BetterSqlite3Database.RunResult {
    return this.getStatement(query.source, options).run(query.parameters);
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        ),
        { changes: 1, lastInsertRowid: 1 }
      );
      database.close();
    }
  }

  get<T>(query: Query, options: Options = {}): T | undefined {
    return this.getStatement(query.source, options).get(query.parameters);
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.deepEqual(
        database.get<{ id: number; name: string }>(
          sql`
            INSERT INTO "users" ("name")
            VALUES (${"Leandro Facchinetti"})
            RETURNING *
          `
        ),
        { id: 1, name: "Leandro Facchinetti" }
      );
      assert.deepEqual(
        database.get<{ id: number; name: string }>(
          sql`SELECT "id", "name" FROM "users"`
        ),
        {
          id: 1,
          name: "Leandro Facchinetti",
        }
      );
      database.close();
    }
  }

  all<T>(query: Query, options: Options = {}): T[] {
    return this.getStatement(query.source, options).all(query.parameters);
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`
      );
      database.run(
        sql`
          INSERT INTO "users" ("name") VALUES (${"David Adler"})
        `
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
          {
            id: 2,
            name: "Linda Renner",
          },
          {
            id: 3,
            name: "David Adler",
          },
        ]
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}`
        ),
        []
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
            "Leandro Facchinetti",
            "David Adler",
          ]}`
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
          {
            id: 3,
            name: "David Adler",
          },
        ]
      );
      database.close();
    }
  }

  iterate<T>(query: Query, options: Options = {}): IterableIterator<T> {
    return this.getStatement(query.source, options).iterate(query.parameters);
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      );
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`
      );
      assert.deepEqual(
        [
          ...database.iterate<{ name: string }>(
            sql`SELECT "id", "name" FROM "users"`
          ),
        ],
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
          {
            id: 2,
            name: "Linda Renner",
          },
        ]
      );
      database.close();
    }
  }

  executeTransaction<T>(fn: () => T): T {
    return this.transaction(fn)();
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.executeTransaction(() => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
          throw new Error("Rollback");
        });
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      assert.deepEqual(
        database.executeTransaction(() => {
          return database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  executeTransactionImmediate<T>(fn: () => T): T {
    return this.transaction(fn).immediate();
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.executeTransactionImmediate(() => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
          throw new Error("Rollback");
        });
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      assert.deepEqual(
        database.executeTransactionImmediate(() => {
          return database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  executeTransactionExclusive<T>(fn: () => T): T {
    return this.transaction(fn).exclusive();
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.throws(() => {
        database.executeTransactionExclusive(() => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
          throw new Error("Rollback");
        });
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      assert.deepEqual(
        database.executeTransactionExclusive(() => {
          return database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  migrate(...migrations: (Query | ((database: this) => void))[]): void {
    this.executeTransaction(() => {
      for (const migration of migrations.slice(
        this.pragma("user_version", { simple: true })
      ))
        if (typeof migration === "function") migration(this);
        else this.execute(migration);
      this.pragma(`user_version = ${migrations.length}`);
    });
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      let counter = 0;
      database.migrate(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
        () => {
          counter++;
        }
      );
      assert.equal(counter, 1);
      database.migrate(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
        () => {
          counter++;
        }
      );
      assert.equal(counter, 1);
      database.migrate(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
        () => {
          counter++;
        },
        () => {
          counter++;
        }
      );
      assert.equal(counter, 2);
      assert.throws(() => {
        database.migrate(
          sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
          () => {
            counter++;
          },
          () => {
            counter++;
          },
          (database) => {
            database.run(
              sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
            );
          },
          () => {
            throw new Error("Should rollback");
          }
        );
      });
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        []
      );
      database.migrate(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`,
        () => {
          counter++;
        },
        () => {
          counter++;
        },
        (database) => {
          database.run(
            sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
          );
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `
        ),
        [
          {
            id: 1,
            name: "Leandro Facchinetti",
          },
        ]
      );
      database.close();
    }
  }

  getStatement(
    source: string,
    options: Options = {}
  ): BetterSqlite3Database.Statement {
    let statement = this.#statements.get(source);
    if (statement === undefined) {
      statement = this.prepare(source);
      this.#statements.set(source, statement);
    }
    if (typeof options.safeIntegers === "boolean")
      statement.safeIntegers(options.safeIntegers);
    return statement;
  }

  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        ),
        {
          changes: 1,
          lastInsertRowid: 1,
        }
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`,
          { safeIntegers: true }
        ),
        {
          changes: 1,
          lastInsertRowid: 2n,
        }
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Louie Renner"})`
        ),
        {
          changes: 1,
          lastInsertRowid: 3n,
        }
      );
      assert.deepEqual(
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Cadeau Renner"})`,
          { safeIntegers: false }
        ),
        {
          changes: 1,
          lastInsertRowid: 4,
        }
      );
      assert.deepEqual(
        database.get<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `,
          {
            safeIntegers: true,
          }
        ),
        {
          id: 1n,
          name: "Leandro Facchinetti",
        }
      );
      assert.deepEqual(
        database.all<{ name: string }>(
          sql`
            SELECT "id", "name" FROM "users"
          `,
          {
            safeIntegers: true,
          }
        ),
        [
          {
            id: 1n,
            name: "Leandro Facchinetti",
          },
          {
            id: 2n,
            name: "Linda Renner",
          },
          {
            id: 3n,
            name: "Louie Renner",
          },
          {
            id: 4n,
            name: "Cadeau Renner",
          },
        ]
      );
      assert.deepEqual(
        [
          ...database.iterate<{ name: string }>(
            sql`SELECT "id", "name" FROM "users"`,
            {
              safeIntegers: true,
            }
          ),
        ],
        [
          {
            id: 1n,
            name: "Leandro Facchinetti",
          },
          {
            id: 2n,
            name: "Linda Renner",
          },
          {
            id: 3n,
            name: "Louie Renner",
          },
          {
            id: 4n,
            name: "Cadeau Renner",
          },
        ]
      );
      database.close();
    }
  }
}

export function sql(
  template: TemplateStringsArray,
  ...substitutions: any[]
): Query {
  const sourceParts: string[] = [];
  const parameters: any[] = [];

  for (
    let templateIndex = 0;
    templateIndex < template.length - 1;
    templateIndex++
  ) {
    const templatePart = template[templateIndex];
    const parameter = substitutions[templateIndex];

    if (templatePart.endsWith("$")) {
      if (
        typeof parameter.source !== "string" ||
        !Array.isArray(parameter.parameters)
      )
        throw new Error(
          `Failed to interpolate raw query ‘${parameter}’ because it wasn’t created with the sql tagged template literal`
        );
      sourceParts.push(templatePart.slice(0, -1), parameter.source);
      parameters.push(...parameter.parameters);
    } else if (Array.isArray(parameter)) {
      sourceParts.push(
        templatePart,
        "(",
        parameter.map(() => "?").join(","),
        ")"
      );
      parameters.push(...parameter);
    } else {
      sourceParts.push(templatePart, "?");
      parameters.push(parameter);
    }
  }
  sourceParts.push(template[template.length - 1]);

  return { source: sourceParts.join(""), parameters };
}
if (process.env.TEST === "leafac--sqlite") {
  assert.deepEqual(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
    {
      parameters: [],
      source: `CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
    }
  );
  assert.deepEqual(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
    {
      parameters: ["Leandro Facchinetti"],
      source: `INSERT INTO "users" ("name") VALUES (?)`,
    }
  );
  assert.deepEqual(
    sql`
      SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}
    `,
    {
      parameters: [],
      source: `
      SELECT "id", "name" FROM "users" WHERE "name" IN ()
    `,
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
      "Leandro Facchinetti",
      "David Adler",
    ]}`,
    {
      parameters: ["Leandro Facchinetti", "David Adler"],
      source: `SELECT "id", "name" FROM "users" WHERE "name" IN (?,?)`,
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" = ${30}`}`,
    {
      parameters: ["Leandro Facchinetti", 30],
      source: `SELECT "id", "name" FROM "users" WHERE name = ? AND "age" = ?`,
    }
  );
  assert.throws(() => {
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${` AND "age" = ${30}`}`;
  });
}
