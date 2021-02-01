import { describe, test, expect } from "@jest/globals";
import { Database, sql } from ".";

describe("sql", () => {
  test("No interpolation", () => {
    expect(
      sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`
    ).toMatchInlineSnapshot(`
      Object {
        "parameters": Array [],
        "source": "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)",
      }
    `);
  });

  test("Interpolation", () => {
    expect(sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"})`)
      .toMatchInlineSnapshot(`
      Object {
        "parameters": Array [
          "Leandro Facchinetti",
        ],
        "source": "INSERT INTO users (name) VALUES (?)",
      }
    `);
  });
});

describe("Database", () => {
  test("run()", async () => {
    const database = new Database(":memory:");
    database.exec(
      sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
    );
    expect(
      database.run(
        sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"})`
      )
    ).toMatchInlineSnapshot(`
      Object {
        "changes": 1,
        "lastInsertRowid": 1,
      }
    `);
    database.close();
  });

  test("get()", async () => {
    const database = new Database(":memory:");
    database.exec(
      sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
    );
    database.run(
      sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"})`
    );
    expect(database.get<{ name: string }>(sql`SELECT * from users`))
      .toMatchInlineSnapshot(`
      Object {
        "id": 1,
        "name": "Leandro Facchinetti",
      }
    `);
    database.close();
  });

  test("all()", async () => {
    const database = new Database(":memory:");
    database.exec(
      sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
    );
    database.run(
      sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"}), (${"Linda Renner"})`
    );
    expect(database.all<{ name: string }>(sql`SELECT * from users`))
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

  test("iterate()", async () => {
    const database = new Database(":memory:");
    database.exec(
      sql`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
    );
    database.run(
      sql`INSERT INTO users (name) VALUES (${"Leandro Facchinetti"}), (${"Linda Renner"})`
    );
    expect([...database.iterate<{ name: string }>(sql`SELECT * from users`)])
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
});
