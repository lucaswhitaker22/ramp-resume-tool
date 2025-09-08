import { resumeModel, analysisResultModel, jobDescriptionModel } from '@/models';
import { ScoringEngineService } from './ScoringEngineService';
import { RecommendationEngineService } from './RecommendationEngineService';
import { ResumeParsingService } from './ResumeParsingService';
import { createError } from '@/middleware/errorHandler';
import { CategoryScores, Recommendation } from '@/types/database';

export interface CandidateAnalysisOptions {
  jobDescriptionId?: string;
  autoAnalyze?: boolean;
}

/**
 * Service for managing candidate lifecycle and analysis
 */
export class CandidateService {
  private scoringService: ScoringEngineService;
  private recommendationService: RecommendationEngineService;
  private resumeParsingService: ResumeParsingService;

  constructor() {
    this.scoringService = new ScoringEngineService();
    this.recommendationService = new RecommendationEngineService();
    this.resumeParsingService = new ResumeParsingService();
  }

  /**
   * Process a newly uploaded resume and create candidate
   */
  async processNewCandidate(
    resumeId: string, 
    options: CandidateAnalysisOptions = {}
  ): Promise<{
    candidateId: string;
    analysisId?: string;
    status: 'created' | 'analyzing' | 'completed';
  }> {
    const resume = await resumeModel.findById(resumeId);
    if (!resume) {
      throw createError('Resume not found', 404);
    }

    // If auto-analyze is enabled (default), start analysis
    if (options.autoAnalyze !== false) {
      try {
        const analysisId = await this.startAnalysis(resumeId, options.jobDescriptionId);
        return {
          candidateId: resumeId,
          analysisId,
          status: 'analyzing'
        };
      } catch (error) {
        console.error('Failed to start automatic analysis:', error);
        return {
          candidateId: resumeId,
          status: 'created'
        };
      }
    }

    return {
      candidateId: resumeId,
      status: 'created'
    };
  }

  /**
   * Start analysis for a candidate
   */
  async startAnalysis(resumeId: string, jobDescriptionId?: string): Promise<string> {
    const resume = await resumeModel.findById(resumeId);
    if (!resume) {
      throw createError('Resume not found', 404);
    }

    if (!resume.content_text) {
      throw createError('Resume content not available for analysis', 400);
    }

    // Create analysis record
    const analysisId = await analysisResultModel.createAnalysisResult({
      resumeId,
      ...(jobDescriptionId && { jobDescriptionId }),
      overallScore: 0,
      categoryScores: {
        content: 0,
        structure: 0,
        keywords: 0,
        experience: 0,
        skills: 0,
      },
      recommendations: [],
      strengths: [],
      improvementAreas: [],
      status: 'processing',
    });

    // Start analysis in background
    this.performAnalysis(analysisId, resume.content_text, jobDescriptionId)
      .catch(error => {
        console.error('Analysis failed:', error);
        analysisResultModel.updateStatus(analysisId, 'failed', error.message);
      });

    return analysisId;
  }

  /**
    * Perform the actual analysis
    */
   private async performAnalysis(
     analysisId: string,
     resumeContent: string,
     jobDescriptionId?: string
   ): Promise<void> {
     try {
       // Update status to processing
       await analysisResultModel.updateStatus(analysisId, 'processing');

       // Parse resume content
       const { content: parsedResume, sections } = this.resumeParsingService.parseResumeWithSections(resumeContent);

       // Get job requirements if provided
       let jobRequirements = undefined;
       let jobDescription = undefined;
       if (jobDescriptionId) {
         const jobDetails = await jobDescriptionModel.getWithRequirements(jobDescriptionId);
         if (jobDetails) {
           jobRequirements = jobDetails.requirements;
           jobDescription = jobDetails.jobDescription.content;
         }
       }

       // Calculate overall scores using scoring service
       const scoringResult = await this.scoringService.calculateOverallScore(
         parsedResume,
         sections,
         jobRequirements,
         jobDescription
       );

       // Generate recommendations
       const recommendationResult = await this.recommendationService.generateRecommendations(
         parsedResume,
         sections,
         scoringResult.categoryScores,
         jobRequirements
       );

       // Extract strengths and improvement areas using analysis results
       const strengths = this.extractStrengths(parsedResume, scoringResult.categoryScores);
       const improvementAreas = this.extractImprovementAreas(scoringResult.categoryScores, recommendationResult.recommendations);

       // Update analysis results
       await analysisResultModel.updateResults(analysisId, {
         overallScore: scoringResult.overallScore,
         categoryScores: scoringResult.categoryScores,
         recommendations: recommendationResult.recommendations,
         strengths,
         improvementAreas,
       });

       console.log(`✅ Analysis completed for analysis ID: ${analysisId}`);
     } catch (error) {
       console.error('Analysis failed:', error);
       await analysisResultModel.updateStatus(
         analysisId,
         'failed',
         error instanceof Error ? error.message : 'Unknown error'
       );
       throw error;
     }
   }

  /**
   * Re-analyze a candidate with optional new job description
   */
  async reanalyzeCandidate(candidateId: string, jobDescriptionId?: string): Promise<string> {
    const resume = await resumeModel.findById(candidateId);
    if (!resume) {
      throw createError('Candidate not found', 404);
    }

    if (!resume.content_text) {
      throw createError('Resume content not available for re-analysis', 400);
    }

    return await this.startAnalysis(candidateId, jobDescriptionId);
  }

  /**
   * Get candidate with latest analysis
   */
  async getCandidateWithAnalysis(candidateId: string) {
    const resume = await resumeModel.findById(candidateId);
    if (!resume) {
      throw createError('Candidate not found', 404);
    }

    const latestAnalysis = await analysisResultModel.getLatestForResume(candidateId);

    return {
      id: resume.id,
      name: resume.candidate_name,
      fileName: resume.filename,
      uploadedAt: resume.uploaded_at,
      status: latestAnalysis?.status || resume.status,
      overallScore: latestAnalysis?.overallScore || 0,
      analysisResults: latestAnalysis,
    };
  }

  /**
    * Extract strengths from analysis
    */
   private extractStrengths(parsedResume: any, categoryScores: CategoryScores): string[] {
     const strengths: string[] = [];

     if (categoryScores.content >= 80) {
       strengths.push('Strong resume content and presentation');
     }
     if (categoryScores.structure >= 80) {
       strengths.push('Well-structured and organized resume');
     }
     if (categoryScores.keywords >= 80) {
       strengths.push('Good keyword optimization');
     }
     if (categoryScores.experience >= 80) {
       strengths.push('Relevant work experience');
     }
     if (categoryScores.skills >= 80) {
       strengths.push('Strong skill set alignment');
     }

     // Add specific strengths from parsed resume if available
     if (parsedResume?.sections?.experience?.some((exp: any) => exp.achievements?.length > 0)) {
       strengths.push('Quantifiable achievements highlighted');
     }
     if (parsedResume?.sections?.skills?.length >= 10) {
       strengths.push('Comprehensive skill set');
     }
     if (parsedResume?.sections?.experience?.length >= 3) {
       strengths.push('Diverse work experience');
     }

     return strengths.length > 0 ? strengths : ['Resume uploaded and processed successfully'];
   }

  /**
   * Extract improvement areas from scores and recommendations
   */
  private extractImprovementAreas(categoryScores: CategoryScores, recommendations: Recommendation[]): string[] {
    const improvements: string[] = [];

    if (categoryScores.content < 60) {
      improvements.push('Improve resume content quality and clarity');
    }
    if (categoryScores.structure < 60) {
      improvements.push('Better organize resume structure and formatting');
    }
    if (categoryScores.keywords < 60) {
      improvements.push('Include more relevant keywords');
    }
    if (categoryScores.experience < 60) {
      improvements.push('Highlight more relevant work experience');
    }
    if (categoryScores.skills < 60) {
      improvements.push('Better showcase relevant skills');
    }

    // Add high-priority recommendations
    const highPriorityRecs = recommendations
      .filter(rec => rec.priority === 'high')
      .slice(0, 3)
      .map(rec => rec.title);

    improvements.push(...highPriorityRecs);

    return improvements;
  }
}

export const candidateService = new CandidateService();