import sqlite3 from 'sqlite3';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import config from './environment';

const DB_PATH = config.database.path;
const DATA_DIR = dirname(DB_PATH);

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Enable verbose mode in development
const sqlite = config.env === 'development' 
  ? sqlite3.verbose() 
  : sqlite3;

class Database {
  private db: sqlite3.Database | null = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
            reject(err);
          } else {
            console.log('✅ Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Initialize database with migrations
   */
  async initialize(): Promise<void> {
    const { migrationManager } = await import('./migrations');
    await migrationManager.migrate();
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database error:', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database error:', err.message);
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database error:', err.message);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  getDb(): sqlite3.Database | null {
    return this.db;
  }
}

export const database = new Database();
export default database;