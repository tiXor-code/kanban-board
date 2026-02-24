import { createClient, type Client, type InStatement, type ResultSet } from '@libsql/client';

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_TOKEN;
    if (!url) throw new Error('TURSO_DB_URL is not set');
    _db = createClient({ url, authToken });
  }
  return _db;
}

export const db = {
  execute: (stmt: InStatement): Promise<ResultSet> => getDb().execute(stmt),
  batch: (stmts: InStatement[]) => getDb().batch(stmts),
};
