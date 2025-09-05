import { randomUUID } from 'crypto';
import database from '@/config/database';

/**
 * Base model class with common CRUD operations
 */
export abstract class BaseModel<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Generate a new UUID for entity ID
   */
  protected generateId(): string {
    return randomUUID();
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    const id = this.generateId();
    const fields = Object.keys(data as object);
    const values = Object.values(data as object);
    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (id, ${fields.join(', ')}) VALUES (?, ${placeholders})`;
    
    await database.run(sql, [id, ...values]);
    return id;
  }

  /**
   * Find record by ID
   */
  async findById(id: string): Promise<T | undefined> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await database.get<T>(sql, [id]);
  }

  /**
   * Find all records with optional conditions
   */
  async findAll(conditions?: Record<string, any>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    return await database.all<T>(sql, params);
  }

  /**
   * Update record by ID
   */
  async updateById(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    const fields = Object.keys(data as object);
    const values = Object.values(data as object);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    
    await database.run(sql, [...values, id]);
  }

  /**
   * Delete record by ID
   */
  async deleteById(id: string): Promise<void> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await database.run(sql, [id]);
  }

  /**
   * Count records with optional conditions
   */
  async count(conditions?: Record<string, any>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    const result = await database.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Check if record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.count({ id });
    return count > 0;
  }
}