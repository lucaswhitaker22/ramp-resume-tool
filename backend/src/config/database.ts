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

  /**
   * Clear all application data (resumes, job descriptions, analysis results)
   * Keep the migrations table intact for schema tracking
   */
  async clearData(): Promise<void> {
    console.log('🧹 Clearing database data...');

    try {
      // Delete in reverse foreign key order to avoid constraint violations
      console.log('  🗑️  Deleting analysis results...');
      await database.run('DELETE FROM analysis_results');

      console.log('  🗑️  Deleting job descriptions...');
      await database.run('DELETE FROM job_descriptions');

      console.log('  🗑️  Deleting resumes...');
      await database.run('DELETE FROM resumes');

      console.log('✅ Database cleared successfully!');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Reset database completely (drop all tables and recreate)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting database completely...');

    try {
      // Drop application tables in reverse order
      const tables = ['analysis_results', 'job_descriptions', 'resumes', 'migrations'];
      for (const table of tables) {
        console.log(`  🗑️  Dropping table '${table}'...`);
        await database.run(`DROP TABLE IF EXISTS ${table}`);
      }

      console.log('✅ Database reset successfully!');
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    resumeCount: number;
    jobDescriptionCount: number;
    analysisResultCount: number;
    databaseSize: number;
  }> {
    const resumeResult = await this.get<{ count: number }>('SELECT COUNT(*) as count FROM resumes');
    const resumeCount = resumeResult?.count || 0;

    const jdResult = await this.get<{ count: number }>('SELECT COUNT(*) as count FROM job_descriptions');
    const jobDescriptionCount = jdResult?.count || 0;

    const analysisResult = await this.get<{ count: number }>('SELECT COUNT(*) as count FROM analysis_results');
    const analysisResultCount = analysisResult?.count || 0;

    // Get database file size
    const fs = await import('fs').then(m => m.promises);
    const stats = await fs.stat(DB_PATH);
    const databaseSize = stats.size;

    return {
      resumeCount,
      jobDescriptionCount,
      analysisResultCount,
      databaseSize
    };
  }

  getDb(): sqlite3.Database | null {
    return this.db;
  }
}

export const database = new Database();
export default database;