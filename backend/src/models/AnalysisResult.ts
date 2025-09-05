import { BaseModel } from './BaseModel';
import { AnalysisResultEntity, AnalysisResult, CategoryScores, Recommendation } from '@/types/database';
import database from '@/config/database';

export class AnalysisResultModel extends BaseModel<AnalysisResultEntity> {
  constructor() {
    super('analysis_results');
  }

  /**
   * Create a new analysis result record
   */
  async createAnalysisResult(data: {
    resumeId: string;
    jobDescriptionId?: string;
    overallScore: number;
    categoryScores: CategoryScores;
    recommendations: Recommendation[];
    strengths: string[];
    improvementAreas: string[];
  }): Promise<string> {
    const analysisData: Omit<AnalysisResultEntity, 'id'> = {
      resume_id: data.resumeId,
      job_description_id: data.jobDescriptionId || null,
      overall_score: data.overallScore,
      category_scores: JSON.stringify(data.categoryScores),
      recommendations: JSON.stringify(data.recommendations),
      strengths: JSON.stringify(data.strengths),
      improvement_areas: JSON.stringify(data.improvementAreas),
      analyzed_at: new Date().toISOString(),
    };

    return await this.create(analysisData);
  }

  /**
   * Get analysis result with parsed data
   */
  async getAnalysisResult(id: string): Promise<AnalysisResult | undefined> {
    const entity = await this.findById(id);
    
    if (!entity) {
      return undefined;
    }

    return this.parseAnalysisEntity(entity);
  }

  /**
   * Find analysis results by resume ID
   */
  async findByResumeId(resumeId: string): Promise<AnalysisResult[]> {
    const entities = await this.findAll({ resume_id: resumeId });
    return entities.map(entity => this.parseAnalysisEntity(entity));
  }

  /**
   * Find analysis results by job description ID
   */
  async findByJobDescriptionId(jobDescriptionId: string): Promise<AnalysisResult[]> {
    const entities = await this.findAll({ job_description_id: jobDescriptionId });
    return entities.map(entity => this.parseAnalysisEntity(entity));
  }

  /**
   * Get latest analysis for a resume
   */
  async getLatestForResume(resumeId: string): Promise<AnalysisResult | undefined> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE resume_id = ?
      ORDER BY analyzed_at DESC
      LIMIT 1
    `;
    
    const entity = await database.get<AnalysisResultEntity>(sql, [resumeId]);
    
    if (!entity) {
      return undefined;
    }

    return this.parseAnalysisEntity(entity);
  }

  /**
   * Get analysis results with score range
   */
  async findByScoreRange(minScore: number, maxScore: number): Promise<AnalysisResult[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE overall_score BETWEEN ? AND ?
      ORDER BY overall_score DESC
    `;
    
    const entities = await database.all<AnalysisResultEntity>(sql, [minScore, maxScore]);
    return entities.map(entity => this.parseAnalysisEntity(entity));
  }

  /**
   * Get analysis statistics
   */
  async getStatistics(): Promise<{
    total: number;
    avgOverallScore: number;
    avgCategoryScores: CategoryScores;
    scoreDistribution: { range: string; count: number }[];
    recentCount: number; // last 7 days
  }> {
    const total = await this.count();
    
    const avgScoreResult = await database.get<{ avg_score: number }>(
      `SELECT AVG(overall_score) as avg_score FROM ${this.tableName}`
    );

    // Get all category scores for averaging
    const allScores = await database.all<{ category_scores: string }>(
      `SELECT category_scores FROM ${this.tableName} WHERE category_scores IS NOT NULL`
    );

    let avgCategoryScores: CategoryScores = {
      content: 0,
      structure: 0,
      keywords: 0,
      experience: 0,
      skills: 0,
    };

    if (allScores.length > 0) {
      const parsedScores = allScores
        .map(row => {
          try {
            return JSON.parse(row.category_scores) as CategoryScores;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as CategoryScores[];

      if (parsedScores.length > 0) {
        avgCategoryScores = {
          content: parsedScores.reduce((sum, s) => sum + s.content, 0) / parsedScores.length,
          structure: parsedScores.reduce((sum, s) => sum + s.structure, 0) / parsedScores.length,
          keywords: parsedScores.reduce((sum, s) => sum + s.keywords, 0) / parsedScores.length,
          experience: parsedScores.reduce((sum, s) => sum + s.experience, 0) / parsedScores.length,
          skills: parsedScores.reduce((sum, s) => sum + s.skills, 0) / parsedScores.length,
        };
      }
    }

    // Score distribution
    const scoreRanges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];

    const scoreDistribution = await Promise.all(
      scoreRanges.map(async ({ range, min, max }) => {
        // const count = await this.count({});
        const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE overall_score BETWEEN ? AND ?`;
        const result = await database.get<{ count: number }>(sql, [min, max]);
        return { range, count: result?.count || 0 };
      })
    );

    // Recent count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCountResult = await database.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE analyzed_at >= ?`,
      [sevenDaysAgo.toISOString()]
    );

    return {
      total,
      avgOverallScore: avgScoreResult?.avg_score || 0,
      avgCategoryScores,
      scoreDistribution,
      recentCount: recentCountResult?.count || 0,
    };
  }

  /**
   * Clean up old analysis results (older than specified days)
   */
  async cleanupOldResults(daysOld: number = 180): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const sql = `DELETE FROM ${this.tableName} WHERE analyzed_at < ?`;
    
    // Get count before deletion
    const countSql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE analyzed_at < ?`;
    const countResult = await database.get<{ count: number }>(countSql, [cutoffDate.toISOString()]);
    const deletedCount = countResult?.count || 0;

    await database.run(sql, [cutoffDate.toISOString()]);
    
    return deletedCount;
  }

  /**
   * Parse database entity to application model
   */
  private parseAnalysisEntity(entity: AnalysisResultEntity): AnalysisResult {
    let categoryScores: CategoryScores = {
      content: 0,
      structure: 0,
      keywords: 0,
      experience: 0,
      skills: 0,
    };

    let recommendations: Recommendation[] = [];
    let strengths: string[] = [];
    let improvementAreas: string[] = [];

    try {
      if (entity.category_scores) {
        categoryScores = JSON.parse(entity.category_scores);
      }
      if (entity.recommendations) {
        recommendations = JSON.parse(entity.recommendations);
      }
      if (entity.strengths) {
        strengths = JSON.parse(entity.strengths);
      }
      if (entity.improvement_areas) {
        improvementAreas = JSON.parse(entity.improvement_areas);
      }
    } catch (error) {
      console.error('Error parsing analysis result data:', error);
    }

    const result: AnalysisResult = {
      id: entity.id,
      resumeId: entity.resume_id,
      overallScore: entity.overall_score || 0,
      categoryScores,
      recommendations,
      strengths,
      improvementAreas,
      analyzedAt: new Date(entity.analyzed_at),
    };

    if (entity.job_description_id) {
      result.jobDescriptionId = entity.job_description_id;
    }

    return result;
  }
}