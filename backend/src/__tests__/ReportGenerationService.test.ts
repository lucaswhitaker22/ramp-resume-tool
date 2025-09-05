import { ReportGenerationService, FeedbackReport } from '../services/ReportGenerationService';
import { ScoringResult } from '../services/ScoringEngineService';
import { RecommendationResult } from '../services/RecommendationEngineService';

describe('ReportGenerationService', () => {
  let reportService: ReportGenerationService;
  let mockScoringResult: ScoringResult;
  let mockRecommendationResult: RecommendationResult;

  beforeEach(() => {
    reportService = new ReportGenerationService();

    mockScoringResult = {
      overallScore: 75,
      categoryScores: {
        content: 70,
        structure: 80,
        keywords: 65,
        experience: 75,
        skills: 85
      },
      weights: {
        content: 0.25,
        structure: 0.20,
        keywords: 0.25,
        experience: 0.15,
        skills: 0.15
      },
      explanation: {
        overallScore: 75,
        categoryBreakdown: [
          'Content: 70/100 (25% weight, contributes 18 points)',
          'Structure: 80/100 (20% weight, contributes 16 points)'
        ],
        strengths: ['Strong technical skills', 'Good ATS compatibility'],
        improvements: ['Add more quantifiable achievements', 'Improve keyword matching'],
        summary: 'Good match! Some improvements could strengthen your application.'
      },
      breakdown: {
        categories: [
          {
            name: 'content',
            score: 70,
            weight: 25,
            weightedScore: 18,
            maxWeightedScore: 25,
            percentage: 70
          }
        ],
        totalWeightedScore: 75,
        maxPossibleScore: 100
      },
      confidenceLevel: 'high'
    };

    mockRecommendationResult = {
      recommendations: [
        {
          id: 'rec-1',
          category: 'content',
          priority: 'high',
          title: 'Add Quantifiable Achievements',
          description: 'Include specific numbers and metrics in your experience descriptions',
          examples: {
            before: 'Improved system performance',
            after: 'Improved system performance by 40%, reducing load time from 5s to 3s'
          },
          impact: 'Significantly demonstrates your concrete value and results'
        },
        {
          id: 'rec-2',
          category: 'keywords',
          priority: 'medium',
          title: 'Enhance Keyword Matching',
          description: 'Include more relevant keywords from the job description',
          impact: 'Improves ATS matching and recruiter search visibility'
        }
      ],
      summary: {
        totalRecommendations: 2,
        highPriority: 1,
        mediumPriority: 1,
        lowPriority: 0,
        categoryBreakdown: { content: 1, keywords: 1 },
        summary: 'Focus on 1 high-priority improvement first. Then address 1 medium-priority item.'
      },
      priorityBreakdown: {
        high: [
          {
            title: 'Add Quantifiable Achievements',
            category: 'content',
            impact: 'Significantly demonstrates your concrete value and results'
          }
        ],
        medium: [
          {
            title: 'Enhance Keyword Matching',
            category: 'keywords',
            impact: 'Improves ATS matching and recruiter search visibility'
          }
        ],
        low: []
      }
    };
  });

  describe('generateFeedbackReport', () => {
    it('should generate comprehensive feedback report structure', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'john_doe_resume.pdf',
        'Senior Software Engineer'
      );

      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
      expect(report.scoreAnalysis).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.actionPlan).toBeDefined();
      expect(report.appendix).toBeDefined();
    });

    it('should include correct metadata', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'test_resume.pdf',
        'Software Developer'
      );

      expect(report.metadata.resumeFileName).toBe('test_resume.pdf');
      expect(report.metadata.jobTitle).toBe('Software Developer');
      expect(report.metadata.reportVersion).toBe('1.0');
      expect(report.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should handle missing job title', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      expect(report.metadata.resumeFileName).toBe('resume.pdf');
      expect(report.metadata.jobTitle).toBeUndefined();
    });
  });

  describe('executive summary', () => {
    it('should generate meaningful executive summary', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const { executiveSummary } = report;
      
      expect(executiveSummary.overallScore).toBe(75);
      expect(executiveSummary.summary).toBeTruthy();
      expect(executiveSummary.keyHighlights).toBeInstanceOf(Array);
      expect(executiveSummary.keyHighlights.length).toBeGreaterThan(0);
      expect(executiveSummary.confidenceLevel).toBe('high');
    });

    it('should provide appropriate highlights for different score ranges', () => {
      // High score test
      const highScoreResult = {
        ...mockScoringResult,
        overallScore: 90,
        categoryScores: { ...mockScoringResult.categoryScores, content: 95 }
      };

      const highScoreReport = reportService.generateFeedbackReport(
        highScoreResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      expect(highScoreReport.executiveSummary.keyHighlights).toContain('Strong overall resume performance');
      expect(highScoreReport.executiveSummary.keyHighlights.some(h => h.includes('Excellent content'))).toBe(true);

      // Low score test
      const lowScoreResult = {
        ...mockScoringResult,
        overallScore: 45
      };

      const lowScoreReport = reportService.generateFeedbackReport(
        lowScoreResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      expect(lowScoreReport.executiveSummary.keyHighlights).toContain('Significant improvements needed');
    });
  });

  describe('score analysis', () => {
    it('should include all category scores', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const { scoreAnalysis } = report;
      
      expect(scoreAnalysis.categoryScores).toEqual(mockScoringResult.categoryScores);
      expect(scoreAnalysis.breakdown).toEqual(mockScoringResult.breakdown);
      expect(scoreAnalysis.strengths).toEqual(mockScoringResult.explanation.strengths);
      expect(scoreAnalysis.improvements).toEqual(mockScoringResult.explanation.improvements);
      expect(scoreAnalysis.confidenceLevel).toBe('high');
    });
  });

  describe('recommendations section', () => {
    it('should organize recommendations properly', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const { recommendations } = report;
      
      expect(recommendations.summary).toEqual(mockRecommendationResult.summary);
      expect(recommendations.priorityBreakdown).toEqual(mockRecommendationResult.priorityBreakdown);
      expect(recommendations.detailedRecommendations).toEqual(mockRecommendationResult.recommendations);
    });
  });

  describe('action plan', () => {
    it('should generate actionable steps', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const { actionPlan } = report;
      
      expect(actionPlan.steps).toBeInstanceOf(Array);
      expect(actionPlan.steps.length).toBeGreaterThan(0);
      expect(actionPlan.estimatedTimeToComplete).toBeTruthy();
      expect(actionPlan.priorityFocus).toBeTruthy();

      // Check step structure
      actionPlan.steps.forEach(step => {
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.timeline).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(step.priority);
      });
    });

    it('should prioritize high-priority items first', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const highPrioritySteps = report.actionPlan.steps.filter(step => step.priority === 'high');
      const mediumPrioritySteps = report.actionPlan.steps.filter(step => step.priority === 'medium');

      if (highPrioritySteps.length > 0 && mediumPrioritySteps.length > 0) {
        const firstHighIndex = report.actionPlan.steps.findIndex(step => step.priority === 'high');
        const firstMediumIndex = report.actionPlan.steps.findIndex(step => step.priority === 'medium');
        
        expect(firstHighIndex).toBeLessThan(firstMediumIndex);
      }
    });

    it('should provide appropriate timelines', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const highPrioritySteps = report.actionPlan.steps.filter(step => step.priority === 'high');
      const mediumPrioritySteps = report.actionPlan.steps.filter(step => step.priority === 'medium');
      const lowPrioritySteps = report.actionPlan.steps.filter(step => step.priority === 'low');

      highPrioritySteps.forEach(step => {
        expect(step.timeline).toContain('Immediate');
      });

      mediumPrioritySteps.forEach(step => {
        expect(step.timeline).toContain('Short-term');
      });

      lowPrioritySteps.forEach(step => {
        expect(step.timeline).toContain('Long-term');
      });
    });
  });

  describe('appendix', () => {
    it('should include comprehensive appendix information', () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      const { appendix } = report;
      
      expect(appendix.scoringMethodology).toBeTruthy();
      expect(appendix.categoryDefinitions).toBeDefined();
      expect(appendix.confidenceLevels).toBeDefined();

      // Check category definitions
      expect(appendix.categoryDefinitions['content']).toBeTruthy();
      expect(appendix.categoryDefinitions['structure']).toBeTruthy();
      expect(appendix.categoryDefinitions['keywords']).toBeTruthy();
      expect(appendix.categoryDefinitions['experience']).toBeTruthy();
      expect(appendix.categoryDefinitions['skills']).toBeTruthy();

      // Check confidence level definitions
      expect(appendix.confidenceLevels['high']).toBeTruthy();
      expect(appendix.confidenceLevels['medium']).toBeTruthy();
      expect(appendix.confidenceLevels['low']).toBeTruthy();
    });
  });

  describe('exportToPDF', () => {
    it('should export report to PDF buffer', async () => {
      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        mockRecommendationResult,
        'resume.pdf',
        'Software Engineer'
      );

      const pdfBuffer = await reportService.exportToPDF(report);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle PDF generation errors gracefully', async () => {
      // Create a malformed report to trigger an error
      const malformedReport = {} as FeedbackReport;

      await expect(reportService.exportToPDF(malformedReport)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty recommendations', () => {
      const emptyRecommendationResult: RecommendationResult = {
        recommendations: [],
        summary: {
          totalRecommendations: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
          categoryBreakdown: {},
          summary: 'No recommendations needed'
        },
        priorityBreakdown: {
          high: [],
          medium: [],
          low: []
        }
      };

      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        emptyRecommendationResult,
        'resume.pdf'
      );

      expect(report).toBeDefined();
      expect(report.actionPlan.steps).toHaveLength(0);
      expect(report.actionPlan.priorityFocus).toContain('Fine-tune');
    });

    it('should handle very low scores', () => {
      const lowScoreResult: ScoringResult = {
        ...mockScoringResult,
        overallScore: 25,
        categoryScores: {
          content: 20,
          structure: 30,
          keywords: 15,
          experience: 25,
          skills: 35
        },
        explanation: {
          ...mockScoringResult.explanation,
          overallScore: 25,
          summary: 'Poor match. Major revisions needed to align with job requirements.'
        }
      };

      const report = reportService.generateFeedbackReport(
        lowScoreResult,
        mockRecommendationResult,
        'resume.pdf'
      );

      expect(report.executiveSummary.keyHighlights).toContain('Significant improvements needed');
      expect(report.actionPlan.priorityFocus).toContain('high-priority');
    });

    it('should handle very high scores', () => {
      const highScoreResult: ScoringResult = {
        ...mockScoringResult,
        overallScore: 95,
        categoryScores: {
          content: 95,
          structure: 90,
          keywords: 98,
          experience: 92,
          skills: 96
        },
        explanation: {
          ...mockScoringResult.explanation,
          overallScore: 95,
          summary: 'Excellent match! Your resume aligns very well with the job requirements.'
        }
      };

      const emptyRecommendations: RecommendationResult = {
        recommendations: [],
        summary: {
          totalRecommendations: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
          categoryBreakdown: {},
          summary: 'Excellent performance across all areas'
        },
        priorityBreakdown: { high: [], medium: [], low: [] }
      };

      const report = reportService.generateFeedbackReport(
        highScoreResult,
        emptyRecommendations,
        'resume.pdf'
      );

      expect(report.executiveSummary.keyHighlights).toContain('Strong overall resume performance');
      expect(report.actionPlan.steps).toHaveLength(0);
    });
  });

  describe('time estimation', () => {
    it('should provide realistic time estimates', () => {
      const manyRecommendations: RecommendationResult = {
        ...mockRecommendationResult,
        priorityBreakdown: {
          high: Array(3).fill(mockRecommendationResult.priorityBreakdown.high[0]),
          medium: Array(2).fill(mockRecommendationResult.priorityBreakdown.medium[0]),
          low: Array(1).fill({ title: 'Low priority item', category: 'skills', impact: 'Minor improvement' })
        }
      };

      const report = reportService.generateFeedbackReport(
        mockScoringResult,
        manyRecommendations,
        'resume.pdf'
      );

      expect(report.actionPlan.estimatedTimeToComplete).toMatch(/days?|weeks?/);
    });
  });
});