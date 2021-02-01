import BetterSqlite3Database from "better-sqlite3";

export interface Query {
  source: string;
  parameters: any[];
}

export function sql(
  template: TemplateStringsArray,
  ...substitutions: any[]
): Query {
  const sourceParts = new Array<string>();
  const parameters = new Array<any>();

  for (
    let templateIndex = 0;
    templateIndex < template.length - 1;
    templateIndex++
  ) {
    const templatePart = template[templateIndex];
    const parameter = substitutions[templateIndex];

    if (templatePart.endsWith("$")) {
      // sourceParts.push(templatePart.slice(0, -1));
    } else {
      sourceParts.push(templatePart);
      parameters.push(parameter);
    }
  }
  sourceParts.push(template[template.length - 1]);

  return { source: sourceParts.join("?"), parameters };
}

export class Database {
  betterSqlite3Database: BetterSqlite3Database.Database;
  statements: Map<string, BetterSqlite3Database.Statement>;

  constructor(path: string, options?: BetterSqlite3Database.Options) {
    this.betterSqlite3Database = new BetterSqlite3Database(path, options);
    this.statements = new Map<string, BetterSqlite3Database.Statement>();
  }

  exec({ source, parameters }: Query) {
    if (parameters.length > 0)
      throw new Error(`Failed to exec() query with parameters`);
    this.betterSqlite3Database.exec(source);
  }

  transaction<T>(fn: () => T): T {
    return this.betterSqlite3Database.transaction(fn)();
  }

  pragma<T>(source: string, options?: BetterSqlite3Database.PragmaOptions): T {
    return this.betterSqlite3Database.pragma(source, options);
  }

  async backup(
    destination: string,
    options?: BetterSqlite3Database.BackupOptions
  ): Promise<BetterSqlite3Database.BackupMetadata> {
    return await this.betterSqlite3Database.backup(destination, options);
  }

  close(): this {
    this.betterSqlite3Database.close();
    return this;
  }

  run({ source, parameters }: Query): BetterSqlite3Database.RunResult {
    return this.getStatement(source).run(parameters);
  }

  get<T>({ source, parameters }: Query): T {
    return this.getStatement(source).get(parameters);
  }

  all<T>({ source, parameters }: Query): T[] {
    return this.getStatement(source).all(parameters);
  }

  iterate<T>({ source, parameters }: Query): IterableIterator<T> {
    return this.getStatement(source).iterate(parameters);
  }

  getStatement(source: string): BetterSqlite3Database.Statement {
    let statement = this.statements.get(source);
    if (statement === undefined) {
      statement = this.betterSqlite3Database.prepare(source);
      this.statements.set(source, statement);
    }
    return statement;
  }
}
