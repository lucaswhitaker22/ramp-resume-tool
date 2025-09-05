import database from './database';

export interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Database migration system
 */
class MigrationManager {
  private migrations: Migration[] = [];

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await database.run(sql);
  }

  /**
   * Get applied migrations
   */
  private async getAppliedMigrations(): Promise<number[]> {
    await this.initializeMigrationTable();
    
    const results = await database.all<{ version: number }>(
      'SELECT version FROM migrations ORDER BY version'
    );
    
    return results.map(row => row.version);
  }

  /**
   * Mark migration as applied
   */
  private async markMigrationApplied(migration: Migration): Promise<void> {
    await database.run(
      'INSERT INTO migrations (version, name) VALUES (?, ?)',
      [migration.version, migration.name]
    );
  }

  /**
   * Remove migration record
   */
  private async removeMigrationRecord(version: number): Promise<void> {
    await database.run('DELETE FROM migrations WHERE version = ?', [version]);
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<void> {
    const appliedVersions = await this.getAppliedMigrations();
    const pendingMigrations = this.migrations.filter(
      migration => !appliedVersions.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📦 Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`  ⬆️  Applying migration ${migration.version}: ${migration.name}`);
        await migration.up();
        await this.markMigrationApplied(migration);
        console.log(`  ✅ Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`  ❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  /**
   * Rollback migrations to a specific version
   */
  async rollback(targetVersion: number): Promise<void> {
    const appliedVersions = await this.getAppliedMigrations();
    const migrationsToRollback = this.migrations
      .filter(migration => 
        appliedVersions.includes(migration.version) && 
        migration.version > targetVersion
      )
      .sort((a, b) => b.version - a.version); // Rollback in reverse order

    if (migrationsToRollback.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    console.log(`📦 Rolling back ${migrationsToRollback.length} migrations...`);

    for (const migration of migrationsToRollback) {
      try {
        console.log(`  ⬇️  Rolling back migration ${migration.version}: ${migration.name}`);
        await migration.down();
        await this.removeMigrationRecord(migration.version);
        console.log(`  ✅ Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        console.error(`  ❌ Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('✅ All rollbacks completed successfully');
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: { version: number; name: string }[];
    pending: { version: number; name: string }[];
  }> {
    const appliedVersions = await this.getAppliedMigrations();
    
    const applied = this.migrations
      .filter(migration => appliedVersions.includes(migration.version))
      .map(migration => ({ version: migration.version, name: migration.name }));

    const pending = this.migrations
      .filter(migration => !appliedVersions.includes(migration.version))
      .map(migration => ({ version: migration.version, name: migration.name }));

    return { applied, pending };
  }
}

export const migrationManager = new MigrationManager();

// Register initial migrations
migrationManager.register({
  version: 1,
  name: 'create_initial_tables',
  up: async () => {
    // Create resumes table
    await database.run(`
      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        content_text TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed'))
      )
    `);

    // Create job_descriptions table
    await database.run(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        extracted_requirements TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create analysis_results table
    await database.run(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id TEXT PRIMARY KEY,
        resume_id TEXT NOT NULL,
        job_description_id TEXT,
        overall_score INTEGER,
        category_scores TEXT,
        recommendations TEXT,
        strengths TEXT,
        improvement_areas TEXT,
        analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE,
        FOREIGN KEY (job_description_id) REFERENCES job_descriptions (id) ON DELETE SET NULL
      )
    `);

    // Create indexes for better performance
    await database.run('CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes (status)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_resumes_uploaded_at ON resumes (uploaded_at)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON job_descriptions (created_at)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_analysis_results_resume_id ON analysis_results (resume_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_analysis_results_job_description_id ON analysis_results (job_description_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_analysis_results_analyzed_at ON analysis_results (analyzed_at)');
  },
  down: async () => {
    await database.run('DROP TABLE IF EXISTS analysis_results');
    await database.run('DROP TABLE IF EXISTS job_descriptions');
    await database.run('DROP TABLE IF EXISTS resumes');
  },
});

export default migrationManager;