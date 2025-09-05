import { BaseModel } from './BaseModel';
import { JobDescriptionEntity, JobRequirements } from '@/types/database';
import database from '@/config/database';

export class JobDescriptionModel extends BaseModel<JobDescriptionEntity> {
  constructor() {
    super('job_descriptions');
  }

  /**
   * Create a new job description record
   */
  async createJobDescription(data: {
    content: string;
    extractedRequirements?: JobRequirements;
  }): Promise<string> {
    const jobDescriptionData: Omit<JobDescriptionEntity, 'id'> = {
      content: data.content,
      extracted_requirements: data.extractedRequirements 
        ? JSON.stringify(data.extractedRequirements)
        : null,
      created_at: new Date().toISOString(),
    };

    return await this.create(jobDescriptionData);
  }

  /**
   * Update extracted requirements for a job description
   */
  async updateRequirements(id: string, requirements: JobRequirements): Promise<void> {
    await this.updateById(id, {
      extracted_requirements: JSON.stringify(requirements),
    });
  }

  /**
   * Get job description with parsed requirements
   */
  async getWithRequirements(id: string): Promise<{
    jobDescription: JobDescriptionEntity;
    requirements?: JobRequirements;
  } | undefined> {
    const jobDescription = await this.findById(id);
    
    if (!jobDescription) {
      return undefined;
    }

    let requirements: JobRequirements | undefined = undefined;
    if (jobDescription.extracted_requirements) {
      try {
        requirements = JSON.parse(jobDescription.extracted_requirements);
      } catch (error) {
        console.error('Error parsing job requirements:', error);
      }
    }

    const result: {
      jobDescription: JobDescriptionEntity;
      requirements?: JobRequirements;
    } = {
      jobDescription,
    };

    if (requirements) {
      result.requirements = requirements;
    }

    return result;
  }

  /**
   * Find job descriptions by content similarity (basic text search)
   */
  async findSimilar(searchText: string, limit: number = 10): Promise<JobDescriptionEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE content LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    return await database.all<JobDescriptionEntity>(sql, [`%${searchText}%`, limit]);
  }

  /**
   * Find recent job descriptions
   */
  async findRecent(limit: number = 20): Promise<JobDescriptionEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    return await database.all<JobDescriptionEntity>(sql, [limit]);
  }

  /**
   * Get job description statistics
   */
  async getStatistics(): Promise<{
    total: number;
    withRequirements: number;
    avgContentLength: number;
    recentCount: number; // last 7 days
  }> {
    const total = await this.count();
    
    const withRequirementsResult = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE extracted_requirements IS NOT NULL`
    );

    const avgLengthResult = await database.get<{ avg_length: number }>(
      `SELECT AVG(LENGTH(content)) as avg_length FROM ${this.tableName}`
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCountResult = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE created_at >= ?`,
      [sevenDaysAgo.toISOString()]
    );

    return {
      total,
      withRequirements: withRequirementsResult?.count || 0,
      avgContentLength: avgLengthResult?.avg_length || 0,
      recentCount: recentCountResult?.count || 0,
    };
  }

  /**
   * Clean up old job descriptions (older than specified days)
   */
  async cleanupOldJobDescriptions(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const sql = `DELETE FROM ${this.tableName} WHERE created_at < ?`;
    
    // Get count before deletion
    const countSql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE created_at < ?`;
    const countResult = await database.get<{ count: number }>(countSql, [cutoffDate.toISOString()]);
    const deletedCount = countResult?.count || 0;

    await database.run(sql, [cutoffDate.toISOString()]);
    
    return deletedCount;
  }
}