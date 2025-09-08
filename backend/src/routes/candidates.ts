import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { AnalysisResultModel } from '@/models/AnalysisResult';
import { ResumeModel } from '@/models/Resume';
import { candidateService } from '@/services/CandidateService';

const analysisResultModel = new AnalysisResultModel();
const resumeModel = new ResumeModel();

const router = Router();

/**
 * GET /api/v1/candidates
 * Get all candidates with filtering and pagination
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        search,
        status,
        minScore,
        maxScore,
        minSkillsScore,
        maxSkillsScore,
        minExperience,
        maxExperience,
        sortBy = 'overallScore',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Get all resumes with their latest analysis
      const resumes = await resumeModel.findAll();
      
      // Get analysis results for each resume
      const candidates = await Promise.all(
        resumes.map(async (resume) => {
          const latestAnalysis = await analysisResultModel.getLatestForResume(resume.id);
          
          return {
            id: resume.id,
            name: resume.candidate_name,
            fileName: resume.filename,
            uploadedAt: resume.uploaded_at,
            status: latestAnalysis?.status || resume.status,
            overallScore: latestAnalysis?.overallScore || 0,
            analysisResults: latestAnalysis ? {
              id: latestAnalysis.id,
              candidateId: resume.id,
              jobDescriptionId: latestAnalysis.jobDescriptionId || '',
              overallScore: latestAnalysis.overallScore,
              skillsMatch: {
                score: latestAnalysis.categoryScores?.skills || 0,
                matchedSkills: [], // Would need to be extracted from analysis
                missingSkills: [],
                additionalSkills: []
              },
              experienceMatch: {
                score: latestAnalysis.categoryScores?.experience || 0,
                yearsOfExperience: 0, // Would need to be extracted from analysis
                relevantExperience: 0,
                industryMatch: false
              },
              educationMatch: {
                score: latestAnalysis.categoryScores?.content || 0,
                degreeMatch: false,
                fieldOfStudyMatch: false,
                institutionPrestige: 0
              },
              atsCompatibility: {
                score: latestAnalysis.categoryScores?.structure || 0,
                issues: [],
                suggestions: []
              },
              recommendations: latestAnalysis.recommendations?.map(r => r.description) || [],
              createdAt: latestAnalysis.analyzedAt?.toISOString() || resume.uploaded_at
            } : undefined
          };
        })
      );

      // Apply filters
      let filteredCandidates = candidates.filter(candidate => {
        // Search filter
        if (search) {
          const searchLower = (search as string).toLowerCase();
          const matchesSearch = 
            candidate.name.toLowerCase().includes(searchLower) ||
            candidate.fileName.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Status filter
        if (status) {
          const statusArray = (status as string).split(',');
          if (!statusArray.includes(candidate.status)) return false;
        }

        // Score range filter
        if (minScore !== undefined || maxScore !== undefined) {
          const score = candidate.overallScore || 0;
          if (minScore !== undefined && score < parseInt(minScore as string)) return false;
          if (maxScore !== undefined && score > parseInt(maxScore as string)) return false;
        }

        // Skills score filter
        if (minSkillsScore !== undefined || maxSkillsScore !== undefined) {
          const skillsScore = candidate.analysisResults?.skillsMatch.score || 0;
          if (minSkillsScore !== undefined && skillsScore < parseInt(minSkillsScore as string)) return false;
          if (maxSkillsScore !== undefined && skillsScore > parseInt(maxSkillsScore as string)) return false;
        }

        // Experience filter
        if (minExperience !== undefined || maxExperience !== undefined) {
          const experience = candidate.analysisResults?.experienceMatch.yearsOfExperience || 0;
          if (minExperience !== undefined && experience < parseInt(minExperience as string)) return false;
          if (maxExperience !== undefined && experience > parseInt(maxExperience as string)) return false;
        }

        return true;
      });

      // Sort candidates
      filteredCandidates.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'uploadedAt':
            aValue = new Date(a.uploadedAt);
            bValue = new Date(b.uploadedAt);
            break;
          case 'skillsScore':
            aValue = a.analysisResults?.skillsMatch.score || 0;
            bValue = b.analysisResults?.skillsMatch.score || 0;
            break;
          case 'experienceScore':
            aValue = a.analysisResults?.experienceMatch.score || 0;
            bValue = b.analysisResults?.experienceMatch.score || 0;
            break;
          default:
            aValue = a.overallScore || 0;
            bValue = b.overallScore || 0;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          data: paginatedCandidates,
          total: filteredCandidates.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(filteredCandidates.length / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/candidates/stats
 * Get candidate statistics
 */
router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const resumes = await resumeModel.findAll();
      const analyses = await Promise.all(
        resumes.map(resume => analysisResultModel.getLatestForResume(resume.id))
      );

      const validAnalyses = analyses.filter(Boolean);
      
      const stats = {
        total: resumes.length,
        byStatus: resumes.reduce((acc, resume) => {
          acc[resume.status] = (acc[resume.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageScore: validAnalyses.length > 0 
          ? validAnalyses.reduce((sum, analysis) => sum + (analysis?.overallScore || 0), 0) / validAnalyses.length
          : 0,
        topSkills: [] // Would need more complex analysis to extract skills
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/candidates/:candidateId
 * Get a single candidate by ID
 */
router.get(
  '/:candidateId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { candidateId } = req.params;

      if (!candidateId) {
        throw createError('Candidate ID is required', 400);
      }

      const resume = await resumeModel.findById(candidateId);
      if (!resume) {
        throw createError('Candidate not found', 404);
      }

      const latestAnalysis = await analysisResultModel.getLatestForResume(candidateId);

      const candidate = {
        id: resume.id,
        name: resume.candidate_name,
        fileName: resume.filename,
        uploadedAt: resume.uploaded_at,
        status: latestAnalysis?.status || resume.status,
        overallScore: latestAnalysis?.overallScore || 0,
        analysisResults: latestAnalysis ? {
          id: latestAnalysis.id,
          candidateId: resume.id,
          jobDescriptionId: latestAnalysis.jobDescriptionId || '',
          overallScore: latestAnalysis.overallScore,
          skillsMatch: {
            score: latestAnalysis.categoryScores?.skills || 0,
            matchedSkills: [],
            missingSkills: [],
            additionalSkills: []
          },
          experienceMatch: {
            score: latestAnalysis.categoryScores?.experience || 0,
            yearsOfExperience: 0,
            relevantExperience: 0,
            industryMatch: false
          },
          educationMatch: {
            score: latestAnalysis.categoryScores?.content || 0,
            degreeMatch: false,
            fieldOfStudyMatch: false,
            institutionPrestige: 0
          },
          atsCompatibility: {
            score: latestAnalysis.categoryScores?.structure || 0,
            issues: [],
            suggestions: []
          },
          recommendations: latestAnalysis.recommendations?.map(r => r.description) || [],
          createdAt: latestAnalysis.analyzedAt?.toISOString() || resume.uploaded_at
        } : undefined
      };

      res.json({
        success: true,
        data: candidate
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/candidates/:candidateId/status
 * Update candidate status
 */
router.patch(
  '/:candidateId/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { candidateId } = req.params;
      const { status } = req.body;

      if (!candidateId) {
        throw createError('Candidate ID is required', 400);
      }

      if (!status) {
        throw createError('Status is required', 400);
      }

      const resume = await resumeModel.findById(candidateId);
      if (!resume) {
        throw createError('Candidate not found', 404);
      }

      await resumeModel.updateStatus(candidateId, status);

      res.json({
        success: true,
        message: 'Candidate status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/candidates/bulk/status
 * Bulk update candidate statuses
 */
router.patch(
  '/bulk/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { candidateIds, status } = req.body;

      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        throw createError('Candidate IDs array is required', 400);
      }

      if (!status) {
        throw createError('Status is required', 400);
      }

      // Update each candidate's status
      await Promise.all(
        candidateIds.map(id => resumeModel.updateStatus(id, status))
      );

      res.json({
        success: true,
        message: `Updated status for ${candidateIds.length} candidates`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/candidates/:candidateId
 * Delete a candidate
 */
router.delete(
  '/:candidateId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { candidateId } = req.params;

      if (!candidateId) {
        throw createError('Candidate ID is required', 400);
      }

      const resume = await resumeModel.findById(candidateId);
      if (!resume) {
        throw createError('Candidate not found', 404);
      }

      // Delete associated analysis results first
      const analyses = await analysisResultModel.findByResumeId(candidateId);
      await Promise.all(
        analyses.map(analysis => analysisResultModel.deleteById(analysis.id))
      );

      // Delete the resume
      await resumeModel.deleteById(candidateId);

      res.json({
        success: true,
        message: 'Candidate deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/candidates/bulk
 * Bulk delete candidates
 */
router.delete(
  '/bulk',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { candidateIds } = req.body;

      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        throw createError('Candidate IDs array is required', 400);
      }

      // Delete associated analysis results first
      await Promise.all(
        candidateIds.map(async (candidateId) => {
          const analyses = await analysisResultModel.findByResumeId(candidateId);
          await Promise.all(
            analyses.map(analysis => analysisResultModel.deleteById(analysis.id))
          );
        })
      );

      // Delete the resumes
      await Promise.all(
        candidateIds.map(id => resumeModel.deleteById(id))
      );

      res.json({
        success: true,
        message: `Deleted ${candidateIds.length} candidates`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/candidates/:candidateId/reanalyze
 * Re-analyze a candidate's resume
 */
router.post(
  '/:candidateId/reanalyze',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { candidateId } = req.params;
      const { jobDescriptionId } = req.body;

      if (!candidateId) {
        throw createError('Candidate ID is required', 400);
      }

      const analysisId = await candidateService.reanalyzeCandidate(candidateId, jobDescriptionId);

      res.json({
        success: true,
        data: {
          analysisId,
          candidateId,
        },
        message: 'Re-analysis started successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);



export default router;