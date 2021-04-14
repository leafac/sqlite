import { describe, test, expect } from "@jest/globals";
import { Database, sql } from ".";

describe("sql", () => {
  test("No interpolation", () => {
    expect(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT)`
    ).toMatchInlineSnapshot(`
      Object {
        "parameters": Array [],
        "source": "CREATE TABLE \\"users\\" (\\"id\\" INTEGER PRIMARY KEY AUTOINCREMENT, \\"name\\" TEXT)",
      }
    `);
  });

  test("Interpolation", () => {
    expect(sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`)
      .toMatchInlineSnapshot(`
      Object {
        "parameters": Array [
          "Leandro Facchinetti",
        ],
        "source": "INSERT INTO \\"users\\" (\\"name\\") VALUES (?)",
      }
    `);
  });

  test("Raw interpolation", () => {
    expect(
      sql`SELECT * FROM "users" WHERE name = ${"Leandro Facchinetti"}$${sql` AND "age" = ${30}`}`
    ).toMatchInlineSnapshot(`
      Object {
        "parameters": Array [
          "Leandro Facchinetti",
          30,
        ],
        "source": "SELECT * FROM \\"users\\" WHERE name = ? AND \\"age\\" = ?",
      }
    `);
    expect(() => {
      sql`SELECT * FROM "users" WHERE name = ${"Leandro Facchinetti"}$${` AND "age" = ${30}`}`;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed to interpolate raw query ‘ AND \\"age\\" = 30’ because it wasn’t created with the sql tagged template literal"`
    );
  });
});

describe("Database", () => {
  test("run()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    expect(
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      )
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 1,
      }
    `);
    database.close();
  });

  test("get()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
    );
    expect(database.get<{ name: string }>(sql`SELECT * from "users"`))
      .toMatchInlineSnapshot(`
      Object {
        "id": 1,
        "name": "Leandro Facchinetti",
      }
    `);
    database.close();
  });

  test("all()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"}), (${"Linda Renner"})`
    );
    expect(database.all<{ name: string }>(sql`SELECT * from "users"`))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1,
          "name": "Leandro Facchinetti",
        },
        Object {
          "id": 2,
          "name": "Linda Renner",
        },
      ]
    `);
    database.close();
  });

  test("iterate()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    database.run(
      sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"}), (${"Linda Renner"})`
    );
    expect([...database.iterate<{ name: string }>(sql`SELECT * from "users"`)])
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1,
          "name": "Leandro Facchinetti",
        },
        Object {
          "id": 2,
          "name": "Linda Renner",
        },
      ]
    `);
    database.close();
  });

  test("execute()", () => {
    const database = new Database(":memory:");
    expect(() => {
      database.execute(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      );
    }).toThrowErrorMatchingInlineSnapshot(`
      "Failed to execute({
        \\"source\\": \\"INSERT INTO \\\\\\"users\\\\\\" (\\\\\\"name\\\\\\") VALUES (?)\\",
        \\"parameters\\": [
          \\"Leandro Facchinetti\\"
        ]
      }) because execute() doesn’t support queries with parameters"
    `);
    database.close();
  });

  test("executeTransaction()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    expect(() => {
      database.executeTransaction(() => {
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
        throw new Error("Rollback");
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Rollback"`);
    expect(
      database.all<{ name: string }>(sql`SELECT * from "users"`)
    ).toMatchInlineSnapshot(`Array []`);
    expect(
      database.executeTransaction(() => {
        return database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
      })
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 1,
      }
    `);
    expect(database.all<{ name: string }>(sql`SELECT * from "users"`))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1,
          "name": "Leandro Facchinetti",
        },
      ]
    `);
    database.close();
  });

  test("executeTransactionImmediate()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    expect(() => {
      database.executeTransactionImmediate(() => {
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
        throw new Error("Rollback");
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Rollback"`);
    expect(
      database.all<{ name: string }>(sql`SELECT * from "users"`)
    ).toMatchInlineSnapshot(`Array []`);
    expect(
      database.executeTransactionImmediate(() => {
        return database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
      })
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 1,
      }
    `);
    expect(database.all<{ name: string }>(sql`SELECT * from "users"`))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1,
          "name": "Leandro Facchinetti",
        },
      ]
    `);
    database.close();
  });

  test("executeTransactionExclusive()", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    expect(() => {
      database.executeTransactionExclusive(() => {
        database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
        throw new Error("Rollback");
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Rollback"`);
    expect(
      database.all<{ name: string }>(sql`SELECT * from "users"`)
    ).toMatchInlineSnapshot(`Array []`);
    expect(
      database.executeTransactionExclusive(() => {
        return database.run(
          sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
        );
      })
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 1,
      }
    `);
    expect(database.all<{ name: string }>(sql`SELECT * from "users"`))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1,
          "name": "Leandro Facchinetti",
        },
      ]
    `);
    database.close();
  });

  test("safeIntegers", () => {
    const database = new Database(":memory:");
    database.execute(
      sql`CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT);`
    );
    expect(
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Leandro Facchinetti"})`
      )
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 1,
      }
    `);
    expect(
      database.run(
        sql`INSERT INTO "users" ("name") VALUES (${"Linda Renner"})`,
        { safeIntegers: true }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 2n,
      }
    `);
    expect(
      database.run(sql`INSERT INTO "users" ("name") VALUES (${"Louie Renner"})`)
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 3,
      }
    `);
    expect(
      database.get<{ name: string }>(sql`SELECT * from "users"`, {
        safeIntegers: true,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": 1n,
        "name": "Leandro Facchinetti",
      }
    `);
    expect(
      database.all<{ name: string }>(sql`SELECT * from "users"`, {
        safeIntegers: true,
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1n,
          "name": "Leandro Facchinetti",
        },
        Object {
          "id": 2n,
          "name": "Linda Renner",
        },
        Object {
          "id": 3n,
          "name": "Louie Renner",
        },
      ]
    `);
    expect([
      ...database.iterate<{ name: string }>(sql`SELECT * from "users"`, {
        safeIntegers: true,
      }),
    ]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": 1n,
          "name": "Leandro Facchinetti",
        },
        Object {
          "id": 2n,
          "name": "Linda Renner",
        },
        Object {
          "id": 3n,
          "name": "Louie Renner",
        },
      ]
    `);
    database.close();
  });
});
