import { BaseModel } from './BaseModel';
import { ResumeEntity } from '@/types/database';
import database from '@/config/database';

export class ResumeModel extends BaseModel<ResumeEntity> {
  constructor() {
    super('resumes');
  }

  /**
   * Create a new resume record
   */
  async createResume(data: {
    filename: string;
    fileSize: number;
    contentText?: string;
    candidateName?: string;
    status?: ResumeEntity['status'];
  }): Promise<string> {
    const resumeData: Omit<ResumeEntity, 'id'> = {
      filename: data.filename,
      file_size: data.fileSize,
      content_text: data.contentText || null,
      candidate_name: data.candidateName || this.extractNameFromFilename(data.filename),
      uploaded_at: new Date().toISOString(),
      processed_at: null,
      status: data.status || 'uploaded' as const,
    };

    return await this.create(resumeData);
  }

  /**
   * Extract candidate name from filename
   */
  private extractNameFromFilename(filename: string): string {
    const baseName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Try to extract name patterns (e.g., "John_Doe_Resume.pdf" -> "John Doe")
    const nameMatch = baseName.match(/^([A-Za-z]+[_\s-]+[A-Za-z]+)/);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].replace(/[_-]/g, ' ').trim();
    }

    // Fallback to filename without extension and common resume words
    return baseName
      .replace(/[_-]/g, ' ')
      .replace(/\b(resume|cv|curriculum|vitae)\b/gi, '')
      .trim() || 'Unknown Candidate';
  }

  /**
   * Update resume processing status
   */
  async updateStatus(id: string, status: ResumeEntity['status']): Promise<void> {
    const updateData: Partial<ResumeEntity> = {
      status,
    };

    if (status === 'completed' || status === 'failed') {
      updateData.processed_at = new Date().toISOString();
    }

    await this.updateById(id, updateData);
  }

  /**
   * Update resume content after processing
   */
  async updateContent(id: string, contentText: string): Promise<void> {
    await this.updateById(id, {
      content_text: contentText,
      status: 'completed',
      processed_at: new Date().toISOString(),
    });
  }

  /**
   * Find resumes by status
   */
  async findByStatus(status: ResumeEntity['status']): Promise<ResumeEntity[]> {
    return await this.findAll({ status });
  }

  /**
   * Find resumes uploaded within a time range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<ResumeEntity[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE uploaded_at BETWEEN ? AND ?
      ORDER BY uploaded_at DESC
    `;
    
    return await database.all<ResumeEntity>(sql, [
      startDate.toISOString(),
      endDate.toISOString(),
    ]);
  }

  /**
   * Get resume statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ResumeEntity['status'], number>;
    avgFileSize: number;
  }> {
    const total = await this.count();
    
    const statusCounts = await database.all<{ status: ResumeEntity['status']; count: number }>(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    );

    const avgSizeResult = await database.get<{ avg_size: number }>(
      `SELECT AVG(file_size) as avg_size FROM ${this.tableName}`
    );

    const byStatus: Record<ResumeEntity['status'], number> = {
      uploaded: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    statusCounts.forEach(({ status, count }) => {
      byStatus[status] = count;
    });

    return {
      total,
      byStatus,
      avgFileSize: avgSizeResult?.avg_size || 0,
    };
  }

  /**
   * Clean up old resumes (older than specified days)
   */
  async cleanupOldResumes(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const sql = `DELETE FROM ${this.tableName} WHERE uploaded_at < ?`;
    
    // Get count before deletion
    const countSql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE uploaded_at < ?`;
    const countResult = await database.get<{ count: number }>(countSql, [cutoffDate.toISOString()]);
    const deletedCount = countResult?.count || 0;

    await database.run(sql, [cutoffDate.toISOString()]);
    
    return deletedCount;
  }
}