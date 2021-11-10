import BetterSqlite3Database from "better-sqlite3";

export interface Query {
  source: string;
  parameters: any[];
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

export interface Options {
  safeIntegers?: boolean;
}

// FIXME: Use BetterSqlite3Database generics: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794
export class Database extends BetterSqlite3Database {
  statements: Map<string, BetterSqlite3Database.Statement> = new Map();

  run(query: Query, options: Options = {}): BetterSqlite3Database.RunResult {
    return this.getStatement(query.source, options).run(query.parameters);
  }

  get<T>(query: Query, options: Options = {}): T | undefined {
    return this.getStatement(query.source, options).get(query.parameters);
  }

  all<T>(query: Query, options: Options = {}): T[] {
    return this.getStatement(query.source, options).all(query.parameters);
  }

  iterate<T>(query: Query, options: Options = {}): IterableIterator<T> {
    return this.getStatement(query.source, options).iterate(query.parameters);
  }

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

  executeTransaction<T>(fn: () => T): T {
    return this.transaction(fn)();
  }

  executeTransactionImmediate<T>(fn: () => T): T {
    return this.transaction(fn).immediate();
  }

  executeTransactionExclusive<T>(fn: () => T): T {
    return this.transaction(fn).exclusive();
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

  getStatement(
    source: string,
    options: Options = {}
  ): BetterSqlite3Database.Statement {
    let statement = this.statements.get(source);
    if (statement === undefined) {
      statement = this.prepare(source);
      this.statements.set(source, statement);
    }
    if (typeof options.safeIntegers === "boolean")
      statement.safeIntegers(options.safeIntegers);
    return statement;
  }
}
