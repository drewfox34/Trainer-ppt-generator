import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import { ensureProjectDirectories, projectRoot, storageRoot } from "./paths";

dotenv.config({ path: path.join(projectRoot, ".env") });
ensureProjectDirectories();

const configuredDbPath = process.env.DATABASE_FILE || (process.env.TRAINER_DATA_DIR ? "trainer.db" : "server/data/trainer.db");
const dbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.join(process.env.TRAINER_DATA_DIR ? storageRoot : projectRoot, configuredDbPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let sqlRuntime: SqlJsStatic | null = null;
let sqlDb: SqlJsDatabase | null = null;
let initialized = false;
let transactionDepth = 0;

type SqlParam = string | number | null | Uint8Array;
type Bindable = SqlParam | undefined;

function assertDb() {
  if (!initialized || !sqlDb) {
    throw new Error("SQLite database has not finished initializing.");
  }
  return sqlDb;
}

function normalizeValue(value: Bindable): SqlParam {
  return value === undefined ? null : value;
}

function persistDatabase() {
  if (!sqlDb || transactionDepth > 0) return;
  fs.writeFileSync(dbPath, Buffer.from(sqlDb.export()));
}

function bindSql(sql: string, params: unknown[]) {
  if (params.length === 1 && params[0] && typeof params[0] === "object" && !Array.isArray(params[0])) {
    const namedParams = params[0] as Record<string, Bindable>;
    const values: SqlParam[] = [];
    const normalizedSql = sql.replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key: string) => {
      values.push(normalizeValue(namedParams[key]));
      return "?";
    });
    return { sql: normalizedSql, values };
  }

  return { sql, values: params.map((value) => normalizeValue(value as Bindable)) };
}

class PreparedStatement {
  constructor(private readonly sql: string) {}

  all(...params: unknown[]) {
    const database = assertDb();
    const bound = bindSql(this.sql, params);
    const statement = database.prepare(bound.sql);
    try {
      statement.bind(bound.values);
      const rows: Record<string, unknown>[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  get(...params: unknown[]) {
    const database = assertDb();
    const bound = bindSql(this.sql, params);
    const statement = database.prepare(bound.sql);
    try {
      statement.bind(bound.values);
      return statement.step() ? statement.getAsObject() : undefined;
    } finally {
      statement.free();
    }
  }

  run(...params: unknown[]) {
    const database = assertDb();
    const bound = bindSql(this.sql, params);
    const statement = database.prepare(bound.sql);
    try {
      statement.run(bound.values);
      const changes = database.getRowsModified();
      const lastInsert = database.exec("SELECT last_insert_rowid() AS id")[0]?.values?.[0]?.[0] ?? 0;
      persistDatabase();
      return { changes, lastInsertRowid: Number(lastInsert) };
    } finally {
      statement.free();
    }
  }
}

export const db = {
  prepare(sql: string) {
    return new PreparedStatement(sql);
  },
  exec(sql: string) {
    assertDb().exec(sql);
    persistDatabase();
  },
  pragma(sql: string) {
    assertDb().run(`PRAGMA ${sql}`);
    persistDatabase();
  }
};

export async function initDatabase() {
  if (initialized) return;

  sqlRuntime = await initSqlJs({
    locateFile: (file) => path.join(process.env.SQLJS_WASM_DIR || path.join(projectRoot, "node_modules", "sql.js", "dist"), file)
  });

  const existing = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
  sqlDb = new sqlRuntime.Database(existing);
  initialized = true;

  db.pragma("foreign_keys = ON");
  const schemaPath = path.join(__dirname, "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
}

export function nowIso() {
  return new Date().toISOString();
}

export function runTransaction<T>(fn: () => T) {
  const database = assertDb();
  transactionDepth += 1;
  database.run("BEGIN TRANSACTION");
  try {
    const result = fn();
    database.run("COMMIT");
    transactionDepth -= 1;
    persistDatabase();
    return result;
  } catch (error) {
    database.run("ROLLBACK");
    transactionDepth -= 1;
    throw error;
  }
}
