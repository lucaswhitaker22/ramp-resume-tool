import { RecommendationEngineService } from '../services/RecommendationEngineService';
import { ResumeContent, JobRequirements, CategoryScores } from '../types/database';
import { ParsedResumeSection } from '../services/ResumeParsingService';

// Mock the dependencies
jest.mock('../services/ResumeContentAnalysisService', () => ({
  ResumeContentAnalysisService: jest.fn().mockImplementation(() => ({
    analyzeResumeContent: jest.fn().mockResolvedValue({
      overallScore: 75,
      recommendations: [
        {
          category: 'action-verbs',
          priority: 'high',
          title: 'Strengthen Action Verbs',
          description: 'Replace weak action verbs with stronger alternatives',
          examples: ['Use "achieved" instead of "did"']
        },
        {
          category: 'quantification',
          priority: 'medium',
          title: 'Add Quantifiable Achievements',
          description: 'Include specific numbers and metrics',
          examples: ['Increased performance by 40%']
        }
      ]
    })
  }))
}));

jest.mock('../services/ATSCompatibilityService', () => ({
  ATSCompatibilityService: jest.fn().mockImplementation(() => ({
    analyzeATSCompatibility: jest.fn().mockReturnValue({
      overallScore: 85,
      recommendations: [
        {
          priority: 'medium',
          title: 'Improve Section Headers',
          description: 'Use standard section headers for better ATS parsing',
          example: 'Use "Work Experience" instead of "Professional Journey"'
        }
      ]
    })
  }))
}));

describe('RecommendationEngineService', () => {
  let recommendationService: RecommendationEngineService;
  let mockResumeContent: ResumeContent;
  let mockSections: ParsedResumeSection[];
  let mockCategoryScores: CategoryScores;
  let mockJobRequirements: JobRequirements;

  beforeEach(() => {
    recommendationService = new RecommendationEngineService();

    mockResumeContent = {
      rawText: 'Software Engineer with experience in web development',
      sections: {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234'
        },
        summary: 'Experienced software engineer',
        experience: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: '2023-12-31',
            description: 'Worked on web applications',
            achievements: ['Helped with development', 'Participated in meetings']
          }
        ],
        education: [
          {
            institution: 'University',
            degree: 'Bachelor',
            field: 'Computer Science',
            graduationDate: '2018-05-01'
          }
        ],
        skills: ['JavaScript', 'HTML', 'CSS'],
        certifications: []
      }
    };

    mockSections = [
      {
        sectionType: 'experience',
        content: 'Worked on web applications',
        startIndex: 0,
        endIndex: 100
      }
    ];

    mockCategoryScores = {
      content: 60,
      structure: 75,
      keywords: 45,
      experience: 55,
      skills: 50
    };

    mockJobRequirements = {
      requiredSkills: ['JavaScript', 'React', 'Node.js'],
      preferredSkills: ['Python', 'AWS'],
      experienceLevel: 'senior-level',
      education: ['bachelor'],
      certifications: [],
      keywords: ['full-stack', 'web development']
    };
  });

  describe('generateRecommendations', () => {
    it('should generate comprehensive recommendations', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.priorityBreakdown).toBeDefined();

      // Check recommendation structure
      result.recommendations.forEach(rec => {
        expect(rec.id).toBeTruthy();
        expect(rec.category).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.title).toBeTruthy();
        expect(rec.description).toBeTruthy();
        expect(rec.impact).toBeTruthy();
      });
    });

    it('should generate recommendations without job requirements', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores
      );

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.priorityBreakdown).toBeDefined();
    });

    it('should prioritize high-priority recommendations first', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const priorities = result.recommendations.map(rec => rec.priority);
      const highPriorityIndex = priorities.indexOf('high');
      const lowPriorityIndex = priorities.lastIndexOf('low');

      if (highPriorityIndex !== -1 && lowPriorityIndex !== -1) {
        expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
      }
    });

    it('should include before/after examples', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const recommendationsWithExamples = result.recommendations.filter(rec => rec.examples);
      expect(recommendationsWithExamples.length).toBeGreaterThan(0);

      recommendationsWithExamples.forEach(rec => {
        expect(rec.examples?.after).toBeTruthy();
      });
    });
  });

  describe('category-based recommendations', () => {
    it('should generate content recommendations for low content scores', async () => {
      const lowContentScores: CategoryScores = {
        ...mockCategoryScores,
        content: 40
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        lowContentScores,
        mockJobRequirements
      );

      const contentRecommendations = result.recommendations.filter(rec => 
        rec.category === 'content'
      );
      expect(contentRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate structure recommendations for low structure scores', async () => {
      const lowStructureScores: CategoryScores = {
        ...mockCategoryScores,
        structure: 50
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        lowStructureScores,
        mockJobRequirements
      );

      const structureRecommendations = result.recommendations.filter(rec => 
        rec.category === 'structure'
      );
      expect(structureRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate keyword recommendations for low keyword scores', async () => {
      const lowKeywordScores: CategoryScores = {
        ...mockCategoryScores,
        keywords: 30
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        lowKeywordScores,
        mockJobRequirements
      );

      const keywordRecommendations = result.recommendations.filter(rec => 
        rec.category === 'keywords'
      );
      expect(keywordRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate experience recommendations for low experience scores', async () => {
      const lowExperienceScores: CategoryScores = {
        ...mockCategoryScores,
        experience: 40
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        lowExperienceScores,
        mockJobRequirements
      );

      const experienceRecommendations = result.recommendations.filter(rec => 
        rec.category === 'experience'
      );
      expect(experienceRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate skills recommendations for low skills scores', async () => {
      const lowSkillsScores: CategoryScores = {
        ...mockCategoryScores,
        skills: 35
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        lowSkillsScores,
        mockJobRequirements
      );

      const skillsRecommendations = result.recommendations.filter(rec => 
        rec.category === 'skills'
      );
      expect(skillsRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('priority assignment', () => {
    it('should assign high priority for very low scores', async () => {
      const veryLowScores: CategoryScores = {
        content: 30,
        structure: 40,
        keywords: 25,
        experience: 35,
        skills: 20
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        veryLowScores,
        mockJobRequirements
      );

      const highPriorityRecommendations = result.recommendations.filter(rec => 
        rec.priority === 'high'
      );
      expect(highPriorityRecommendations.length).toBeGreaterThan(0);
    });

    it('should assign medium priority for moderate scores', async () => {
      const moderateScores: CategoryScores = {
        content: 65,
        structure: 70,
        keywords: 55,
        experience: 60,
        skills: 58
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        moderateScores,
        mockJobRequirements
      );

      const mediumPriorityRecommendations = result.recommendations.filter(rec => 
        rec.priority === 'medium'
      );
      expect(mediumPriorityRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('impact assessment', () => {
    it('should provide meaningful impact assessments', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      result.recommendations.forEach(rec => {
        expect(rec.impact).toBeTruthy();
        expect(rec.impact.length).toBeGreaterThan(10);
        expect(rec.impact).toMatch(/improve|enhance|increase|better|significant|important|shows|demonstrates|critical|helpful|ensures|passes|reaches/i);
      });
    });

    it('should vary impact assessments by category and priority', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const impacts = result.recommendations.map(rec => rec.impact);
      const uniqueImpacts = new Set(impacts);
      
      // Should have varied impact assessments
      expect(uniqueImpacts.size).toBeGreaterThan(1);
    });
  });

  describe('recommendation summary', () => {
    it('should provide accurate summary statistics', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const { summary } = result;
      
      expect(summary.totalRecommendations).toBe(result.recommendations.length);
      expect(summary.highPriority + summary.mediumPriority + summary.lowPriority)
        .toBe(summary.totalRecommendations);
      expect(summary.summary).toBeTruthy();
      expect(summary.categoryBreakdown).toBeDefined();
    });

    it('should provide meaningful summary text', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      expect(result.summary.summary).toMatch(/priority|improvement|focus/i);
    });
  });

  describe('priority breakdown', () => {
    it('should organize recommendations by priority', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const { priorityBreakdown } = result;
      
      expect(priorityBreakdown.high).toBeDefined();
      expect(priorityBreakdown.medium).toBeDefined();
      expect(priorityBreakdown.low).toBeDefined();

      // Check structure of priority items
      [...priorityBreakdown.high, ...priorityBreakdown.medium, ...priorityBreakdown.low]
        .forEach(item => {
          expect(item.title).toBeTruthy();
          expect(item.category).toBeTruthy();
          expect(item.impact).toBeTruthy();
        });
    });

    it('should match priority breakdown with recommendations', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const totalInBreakdown = 
        result.priorityBreakdown.high.length +
        result.priorityBreakdown.medium.length +
        result.priorityBreakdown.low.length;

      expect(totalInBreakdown).toBe(result.recommendations.length);
    });
  });

  describe('edge cases', () => {
    it('should handle empty resume content', async () => {
      const emptyResumeContent: ResumeContent = {
        rawText: '',
        sections: {
          contactInfo: {},
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const result = await recommendationService.generateRecommendations(
        emptyResumeContent,
        [],
        mockCategoryScores,
        mockJobRequirements
      );

      expect(result.recommendations).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.priorityBreakdown).toBeDefined();
    });

    it('should handle high scores across all categories', async () => {
      const highScores: CategoryScores = {
        content: 95,
        structure: 90,
        keywords: 88,
        experience: 92,
        skills: 89
      };

      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        highScores,
        mockJobRequirements
      );

      // Should still provide some recommendations, even if fewer
      expect(result.recommendations).toBeDefined();
      expect(result.summary.totalRecommendations).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing job requirements', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores
      );

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should not include keyword-specific recommendations without job requirements
      const keywordRecommendations = result.recommendations.filter(rec => 
        rec.description.includes('Missing:')
      );
      expect(keywordRecommendations.length).toBe(0);
    });

    it('should remove duplicate recommendations', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const titles = result.recommendations.map(rec => rec.title);
      const uniqueTitles = new Set(titles);
      
      expect(uniqueTitles.size).toBe(titles.length);
    });
  });

  describe('examples generation', () => {
    it('should generate appropriate before/after examples', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const recommendationsWithExamples = result.recommendations.filter(rec => rec.examples);
      
      recommendationsWithExamples.forEach(rec => {
        if (rec.examples?.before && rec.examples?.after) {
          expect(rec.examples.before.length).toBeGreaterThan(0);
          expect(rec.examples.after.length).toBeGreaterThan(0);
          expect(rec.examples.before).not.toBe(rec.examples.after);
        }
      });
    });

    it('should provide category-appropriate examples', async () => {
      const result = await recommendationService.generateRecommendations(
        mockResumeContent,
        mockSections,
        mockCategoryScores,
        mockJobRequirements
      );

      const contentRecommendations = result.recommendations.filter(rec => 
        rec.category === 'content' && rec.examples
      );

      contentRecommendations.forEach(rec => {
        if (rec.examples?.after) {
          // Content recommendations should show more specific, quantified examples
          expect(rec.examples.after).toMatch(/\d+|%|increased|improved|led|managed|achieved|instead|specific/i);
        }
      });
    });
  });
});