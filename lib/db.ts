import { createClient, type Client } from '@libsql/client';

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_TOKEN;
    if (!url) throw new Error('TURSO_DB_URL is not set');
    _db = createClient({ url, authToken });
  }
  return _db;
}

// Convenience alias — same interface as before
export const db = {
  execute: (...args: Parameters<Client['execute']>) => getDb().execute(...args),
};
