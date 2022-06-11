import BetterSqlite3Database from "better-sqlite3";
import assert from "node:assert/strict";

export interface Options {
  safeIntegers?: boolean;
}

export interface Query {
  sourceParts: string[];
  parameters: any[];
}

// FIXME: Use BetterSqlite3Database generics: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794
// FIXME: In BetterSqlite3Database types, make ‘filename’ optional, in which case a temporary database is created (see https://www.sqlite.org/inmemorydb.html § Temporary Databases)
// FIXME: In BetterSqlite3Database types, make BindParameters more specific than ‘any’
export class Database extends BetterSqlite3Database {
  #statements: Map<string, BetterSqlite3Database.Statement> = new Map();

  execute(query: Query): this {
    let source = "";
    for (
      let parametersIndex = 0;
      parametersIndex < query.parameters.length;
      parametersIndex++
    )
      source +=
        query.sourceParts[parametersIndex] +
        this.get<{ parameter: string }>(
          sql`
            SELECT quote(${query.parameters[parametersIndex]}) AS "parameter"
          `
        )!.parameter;
    source += query.sourceParts[query.sourceParts.length - 1];
    return this.exec(source);
  }
  static {
    if (process.env.TEST === "leafac--sqlite") {
      const database = new Database(":memory:");
      database.execute(
        sql`
          CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);
          INSERT INTO "users" ("name") VALUES (${"Eliot Smith"});
        `
      );
      assert.equal(
        database.get<{ name: string }>(sql`SELECT * FROM "users"`)!.name,
        "Eliot Smith"
      );
      database.close();
    }
  }

  run(query: Query, options: Options = {}): BetterSqlite3Database.RunResult {
    return this.getStatement(query, options).run(query.parameters);
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
    return this.getStatement(query, options).get(query.parameters);
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
    return this.getStatement(query, options).all(query.parameters);
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
    return this.getStatement(query, options).iterate(query.parameters);
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
    query: Query,
    options: Options = {}
  ): BetterSqlite3Database.Statement {
    const source = query.sourceParts.join("?");
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
  const templateParts = [...template];
  const sourceParts: string[] = [];
  const parameters: any[] = [];
  for (
    let substitutionsIndex = 0;
    substitutionsIndex < substitutions.length;
    substitutionsIndex++
  ) {
    let templatePart = templateParts[substitutionsIndex];
    const substitution = substitutions[substitutionsIndex];
    if (templatePart.endsWith("$")) {
      templatePart = templatePart.slice(0, -1);
      if (
        !Array.isArray(substitution.sourceParts) ||
        substitution.sourceParts.some(
          (substitutionPart: any) => typeof substitutionPart !== "string"
        ) ||
        !Array.isArray(substitution.parameters)
      )
        throw new Error(
          `Failed to interpolate raw query ‘${substitution}’ because it wasn’t created with the sql\`\` tagged template literal`
        );
      const substitutionQuery = substitution as Query;
      sourceParts.push(
        `${templatePart}${substitutionQuery.sourceParts[0]}`,
        ...substitutionQuery.sourceParts.slice(1, -1)
      );
      templateParts[substitutionsIndex + 1] = `${
        substitutionQuery.sourceParts[substitutionQuery.sourceParts.length - 1]
      }${templateParts[substitutionsIndex + 1]}`;
      parameters.push(...substitutionQuery.parameters);
    } else if (Array.isArray(substitution)) {
      if (substitution.length === 0)
        templateParts[substitutionsIndex + 1] = `${templatePart}()${
          templateParts[substitutionsIndex + 1]
        }`;
      else {
        sourceParts.push(
          `${templatePart}(`,
          ...new Array(substitution.length - 1).fill(",")
        );
        templateParts[substitutionsIndex + 1] = `)${
          templateParts[substitutionsIndex + 1]
        }`;
        parameters.push(...substitution);
      }
    } else {
      sourceParts.push(templatePart);
      parameters.push(substitution);
    }
  }
  sourceParts.push(templateParts[templateParts.length - 1]);
  return { sourceParts, parameters };
}
if (process.env.TEST === "leafac--sqlite") {
  assert.deepEqual(
    sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
    {
      sourceParts: [
        `CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`,
      ],
      parameters: [],
    }
  );
  assert.deepEqual(
    sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`,
    {
      sourceParts: [`INSERT INTO "users" ("name") VALUES (`, `)`],
      parameters: ["Leandro Facchinetti"],
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[]}`,
    {
      sourceParts: [`SELECT "id", "name" FROM "users" WHERE "name" IN ()`],
      parameters: [],
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE "name" IN ${[
      "Leandro Facchinetti",
      "David Adler",
    ]}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE "name" IN (`,
        `,`,
        `)`,
      ],
      parameters: ["Leandro Facchinetti", "David Adler"],
    }
  );
  assert.deepEqual(
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" = ${31}`}`,
    {
      sourceParts: [
        `SELECT "id", "name" FROM "users" WHERE name = `,
        ` AND "age" = `,
        ``,
      ],
      parameters: ["Leandro Facchinetti", 31],
    }
  );
  assert.throws(() => {
    sql`SELECT "id", "name" FROM "users" WHERE name = ${"Leandro Facchinetti"}$${` AND "age" = ${31}`}`;
  });
}
