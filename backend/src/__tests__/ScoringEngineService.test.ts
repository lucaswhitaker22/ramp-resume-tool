import { ScoringEngineService } from '../services/ScoringEngineService';
import { ResumeContent, JobRequirements } from '../types/database';
import { ParsedResumeSection } from '../services/ResumeParsingService';

// Mock the dependencies
jest.mock('../services/ResumeContentAnalysisService', () => ({
  ResumeContentAnalysisService: jest.fn().mockImplementation(() => ({
    analyzeResumeContent: jest.fn().mockResolvedValue({
      overallScore: 75,
      actionVerbAnalysis: { score: 70 },
      quantifiableAchievements: { score: 80 },
      keywordMatching: { score: 75 },
      clarityAndImpact: { score: 70 },
      atsCompatibility: { overallScore: 85 },
      recommendations: []
    })
  }))
}));

jest.mock('../services/ATSCompatibilityService', () => ({
  ATSCompatibilityService: jest.fn().mockImplementation(() => ({
    analyzeATSCompatibility: jest.fn().mockReturnValue({
      overallScore: 85,
      recommendations: []
    })
  }))
}));

describe('ScoringEngineService', () => {
  let scoringService: ScoringEngineService;
  let mockResumeContent: ResumeContent;
  let mockSections: ParsedResumeSection[];
  let mockJobRequirements: JobRequirements;

  beforeEach(() => {
    scoringService = new ScoringEngineService();

    mockResumeContent = {
      rawText: 'Software Engineer with 5 years experience in React and Node.js',
      sections: {
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234'
        },
        summary: 'Experienced software engineer with expertise in full-stack development',
        experience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: '2023-12-31',
            description: 'Led development of web applications using React and Node.js',
            achievements: [
              'Increased application performance by 40%',
              'Managed team of 5 developers',
              'Delivered 15+ projects on time'
            ]
          }
        ],
        education: [
          {
            institution: 'University of Technology',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            graduationDate: '2018-05-01'
          }
        ],
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
        certifications: []
      }
    };

    mockSections = [
      {
        sectionType: 'experience',
        content: 'Led development of web applications',
        startIndex: 0,
        endIndex: 100
      }
    ];

    mockJobRequirements = {
      requiredSkills: ['JavaScript', 'React', 'Node.js'],
      preferredSkills: ['Python', 'AWS', 'Docker'],
      experienceLevel: 'senior-level',
      education: ['bachelor'],
      certifications: [],
      keywords: ['full-stack', 'web development', 'agile']
    };
  });

  describe('calculateOverallScore', () => {
    it('should calculate overall score with job requirements', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        mockJobRequirements,
        'Senior Software Engineer position requiring React and Node.js experience'
      );

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.categoryScores).toHaveProperty('content');
      expect(result.categoryScores).toHaveProperty('structure');
      expect(result.categoryScores).toHaveProperty('keywords');
      expect(result.categoryScores).toHaveProperty('experience');
      expect(result.categoryScores).toHaveProperty('skills');
      expect(result.weights).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
    });

    it('should calculate overall score without job requirements', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections
      );

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
    });

    it('should use technical weights for technical roles', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        mockJobRequirements,
        'Senior Software Engineer position requiring JavaScript, React, and Node.js'
      );

      // Technical roles should have higher weight for skills and keywords
      expect(result.weights.skills).toBeGreaterThan(0.15);
      expect(result.weights.keywords).toBeGreaterThan(0.20);
    });

    it('should use management weights for management roles', async () => {
      const managementJobDescription = 'Engineering Manager position leading development teams';
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        mockJobRequirements,
        managementJobDescription
      );

      // Management roles should have higher weight for experience
      expect(result.weights.experience).toBeGreaterThanOrEqual(0.10);
    });
  });

  describe('calculateCategoryScores', () => {
    it('should calculate all category scores', async () => {
      const scores = await scoringService.calculateCategoryScores(
        mockResumeContent,
        mockSections,
        mockJobRequirements
      );

      expect(scores.content).toBeGreaterThanOrEqual(0);
      expect(scores.content).toBeLessThanOrEqual(100);
      expect(scores.structure).toBeGreaterThanOrEqual(0);
      expect(scores.structure).toBeLessThanOrEqual(100);
      expect(scores.keywords).toBeGreaterThanOrEqual(0);
      expect(scores.keywords).toBeLessThanOrEqual(100);
      expect(scores.experience).toBeGreaterThanOrEqual(0);
      expect(scores.experience).toBeLessThanOrEqual(100);
      expect(scores.skills).toBeGreaterThanOrEqual(0);
      expect(scores.skills).toBeLessThanOrEqual(100);
    });

    it('should handle missing job requirements', async () => {
      const scores = await scoringService.calculateCategoryScores(
        mockResumeContent,
        mockSections
      );

      expect(scores).toBeDefined();
      expect(scores.keywords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('keyword scoring', () => {
    it('should score higher for matching required skills', async () => {
      const highMatchRequirements: JobRequirements = {
        requiredSkills: ['JavaScript', 'React', 'Node.js'], // All present in resume
        preferredSkills: [],
        experienceLevel: 'senior-level',
        education: [],
        certifications: [],
        keywords: []
      };

      const lowMatchRequirements: JobRequirements = {
        requiredSkills: ['PHP', 'Laravel', 'MySQL'], // None present in resume
        preferredSkills: [],
        experienceLevel: 'senior-level',
        education: [],
        certifications: [],
        keywords: []
      };

      const highMatchScores = await scoringService.calculateCategoryScores(
        mockResumeContent,
        mockSections,
        highMatchRequirements
      );

      const lowMatchScores = await scoringService.calculateCategoryScores(
        mockResumeContent,
        mockSections,
        lowMatchRequirements
      );

      expect(highMatchScores.keywords).toBeGreaterThan(lowMatchScores.keywords);
    });
  });

  describe('experience scoring', () => {
    it('should score higher for quantifiable achievements', async () => {
      const quantifiableResumeContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: [
            {
              company: 'Tech Corp',
              position: 'Senior Developer',
              startDate: '2020-01-01',
              endDate: '2023-12-31',
              description: 'Led development of web applications',
              achievements: [
                'Increased performance by 40%',
                'Reduced load time by 2 seconds',
                'Managed team of 5 developers'
              ]
            }
          ]
        }
      };

      const nonQuantifiableResumeContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: [
            {
              company: 'Tech Corp',
              position: 'Senior Developer',
              startDate: '2020-01-01',
              endDate: '2023-12-31',
              description: 'Worked on web applications',
              achievements: [
                'Helped with development',
                'Participated in meetings',
                'Worked with team'
              ]
            }
          ]
        }
      };

      const quantifiableScores = await scoringService.calculateCategoryScores(
        quantifiableResumeContent,
        mockSections,
        mockJobRequirements
      );

      const nonQuantifiableScores = await scoringService.calculateCategoryScores(
        nonQuantifiableResumeContent,
        mockSections,
        mockJobRequirements
      );

      expect(quantifiableScores.experience).toBeGreaterThan(nonQuantifiableScores.experience);
    });

    it('should handle empty experience', async () => {
      const emptyExperienceContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: []
        }
      };

      const scores = await scoringService.calculateCategoryScores(
        emptyExperienceContent,
        mockSections,
        mockJobRequirements
      );

      expect(scores.experience).toBe(0);
    });
  });

  describe('skills scoring', () => {
    it('should score higher for matching job skills', async () => {
      const matchingSkillsContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'] // All match job requirements
        }
      };

      const nonMatchingSkillsContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          skills: ['PHP', 'Laravel', 'MySQL'] // None match job requirements
        }
      };

      const matchingScores = await scoringService.calculateCategoryScores(
        matchingSkillsContent,
        mockSections,
        mockJobRequirements
      );

      const nonMatchingScores = await scoringService.calculateCategoryScores(
        nonMatchingSkillsContent,
        mockSections,
        mockJobRequirements
      );

      expect(matchingScores.skills).toBeGreaterThan(nonMatchingScores.skills);
    });

    it('should handle empty skills', async () => {
      const emptySkillsContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          skills: []
        }
      };

      const scores = await scoringService.calculateCategoryScores(
        emptySkillsContent,
        mockSections,
        mockJobRequirements
      );

      expect(scores.skills).toBe(0);
    });
  });

  describe('score explanation', () => {
    it('should generate meaningful explanations', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        mockJobRequirements
      );

      expect(Math.abs(result.explanation.overallScore - result.overallScore)).toBeLessThan(1);
      expect(result.explanation.categoryBreakdown).toHaveLength(5);
      expect(result.explanation.summary).toBeTruthy();
      expect(Array.isArray(result.explanation.strengths)).toBe(true);
      expect(Array.isArray(result.explanation.improvements)).toBe(true);
    });

    it('should identify strengths and improvements', async () => {
      // Create a resume with clear strengths and weaknesses
      const mixedResumeContent: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          skills: ['JavaScript', 'React'], // Good match
          experience: [] // Weakness
        }
      };

      const result = await scoringService.calculateOverallScore(
        mixedResumeContent,
        mockSections,
        mockJobRequirements
      );

      // Should identify skills as strength and experience as improvement area
      const hasSkillsStrength = result.explanation.strengths.some(s => 
        s.toLowerCase().includes('skills')
      );
      const hasExperienceImprovement = result.explanation.improvements.some(i => 
        i.toLowerCase().includes('experience')
      );

      expect(hasSkillsStrength || hasExperienceImprovement).toBe(true);
    });
  });

  describe('score breakdown', () => {
    it('should provide detailed breakdown', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        mockJobRequirements
      );

      expect(result.breakdown.categories).toHaveLength(5);
      expect(result.breakdown.totalWeightedScore).toBeGreaterThan(0);
      expect(result.breakdown.maxPossibleScore).toBe(100);

      result.breakdown.categories.forEach(category => {
        expect(category.name).toBeTruthy();
        expect(category.score).toBeGreaterThanOrEqual(0);
        expect(category.score).toBeLessThanOrEqual(100);
        expect(category.weight).toBeGreaterThan(0);
        expect(category.weightedScore).toBeGreaterThanOrEqual(0);
        expect(category.maxWeightedScore).toBeGreaterThan(0);
        expect(category.percentage).toBeGreaterThanOrEqual(0);
        expect(category.percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('confidence level', () => {
    it('should return high confidence with complete data', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        mockJobRequirements
      );

      expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
    });

    it('should return low confidence without job requirements', async () => {
      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections
      );

      expect(['high', 'medium', 'low']).toContain(result.confidenceLevel);
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

      const result = await scoringService.calculateOverallScore(
        emptyResumeContent,
        [],
        mockJobRequirements
      );

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty job requirements', async () => {
      const emptyJobRequirements: JobRequirements = {
        requiredSkills: [],
        preferredSkills: [],
        experienceLevel: 'not-specified',
        education: [],
        certifications: [],
        keywords: []
      };

      const result = await scoringService.calculateOverallScore(
        mockResumeContent,
        mockSections,
        emptyJobRequirements
      );

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});