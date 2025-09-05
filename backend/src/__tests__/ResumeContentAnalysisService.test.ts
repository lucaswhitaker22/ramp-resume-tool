import { ResumeContentAnalysisService } from '../services/ResumeContentAnalysisService';
import { ResumeContent, JobRequirements } from '@/types/database';

describe('ResumeContentAnalysisService', () => {
  let service: ResumeContentAnalysisService;

  beforeEach(() => {
    service = new ResumeContentAnalysisService();
  });

  const mockResumeContent: ResumeContent = {
    rawText: 'Sample resume text',
    sections: {
      contactInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890'
      },
      summary: 'Experienced software engineer with strong problem-solving skills',
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Developer',
          startDate: '2020-01-01',
          endDate: '2023-01-01',
          description: 'Developed web applications using React and Node.js',
          achievements: [
            'Increased application performance by 40%',
            'Led a team of 5 developers',
            'Reduced deployment time from 2 hours to 15 minutes'
          ]
        },
        {
          company: 'StartupCo',
          position: 'Junior Developer',
          startDate: '2018-01-01',
          endDate: '2020-01-01',
          description: 'Worked on various projects and helped with development tasks',
          achievements: [
            'Participated in code reviews',
            'Assisted with bug fixes'
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
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
      certifications: []
    }
  };

  const mockJobRequirements: JobRequirements = {
    requiredSkills: ['JavaScript', 'React', 'Python'],
    preferredSkills: ['Node.js', 'AWS', 'Docker'],
    experienceLevel: 'senior-level',
    education: ['bachelor'],
    certifications: [],
    keywords: ['web development', 'agile', 'team leadership']
  };

  describe('analyzeResumeContent', () => {
    it('should analyze resume content and return comprehensive analysis', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent, mockJobRequirements);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('actionVerbAnalysis');
      expect(result).toHaveProperty('quantifiableAchievements');
      expect(result).toHaveProperty('keywordMatching');
      expect(result).toHaveProperty('clarityAndImpact');
      expect(result).toHaveProperty('recommendations');

      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should work without job requirements', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent);

      expect(result).toHaveProperty('keywordMatching');
      expect(result.keywordMatching.score).toBe(0);
      expect(result.keywordMatching.totalJobKeywords).toBe(0);
    });
  });

  describe('action verb analysis', () => {
    it('should identify strong action verbs', async () => {
      const strongVerbResume: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: [
            {
              company: 'Tech Corp',
              position: 'Senior Developer',
              startDate: '2020-01-01',
              endDate: '2023-01-01',
              description: 'Architected scalable solutions and spearheaded development initiatives',
              achievements: [
                'Delivered high-performance applications',
                'Optimized system performance',
                'Transformed legacy codebase'
              ]
            }
          ]
        }
      };

      const result = await service.analyzeResumeContent(strongVerbResume);

      expect(result.actionVerbAnalysis.strongVerbs.length).toBeGreaterThan(0);
      expect(result.actionVerbAnalysis.score).toBeGreaterThan(50);
    });

    it('should identify weak action verbs and provide suggestions', async () => {
      const weakVerbResume: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: '2023-01-01',
              description: 'Worked on projects and helped with tasks',
              achievements: [
                'Did various programming tasks',
                'Made improvements to the system',
                'Used different technologies'
              ]
            }
          ]
        }
      };

      const result = await service.analyzeResumeContent(weakVerbResume);

      expect(result.actionVerbAnalysis.weakVerbs.length).toBeGreaterThan(0);
      expect(result.actionVerbAnalysis.suggestions.length).toBeGreaterThan(0);
      expect(result.actionVerbAnalysis.suggestions[0]).toHaveProperty('weakVerb');
      expect(result.actionVerbAnalysis.suggestions[0]).toHaveProperty('suggestions');
      expect(result.actionVerbAnalysis.suggestions[0]).toHaveProperty('example');
    });
  });

  describe('quantifiable achievements analysis', () => {
    it('should identify quantifiable achievements', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent);

      expect(result.quantifiableAchievements.quantifiedAchievements.length).toBeGreaterThan(0);
      expect(result.quantifiableAchievements.score).toBeGreaterThan(0);

      const firstAchievement = result.quantifiableAchievements.quantifiedAchievements[0];
      expect(firstAchievement).toBeDefined();
      expect(firstAchievement).toHaveProperty('section');
      expect(firstAchievement).toHaveProperty('company');
      expect(firstAchievement).toHaveProperty('achievements');
      expect(firstAchievement?.achievements.length).toBeGreaterThan(0);
    });

    it('should identify missing quantification opportunities', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent);

      expect(result.quantifiableAchievements.missingQuantification).toContain('StartupCo - Junior Developer');
      expect(result.quantifiableAchievements.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle resume with no quantifiable achievements', async () => {
      const noQuantificationResume: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: [
            {
              company: 'Tech Corp',
              position: 'Developer',
              startDate: '2020-01-01',
              endDate: '2023-01-01',
              description: 'Developed applications',
              achievements: ['Wrote code', 'Fixed bugs']
            }
          ]
        }
      };

      const result = await service.analyzeResumeContent(noQuantificationResume);

      expect(result.quantifiableAchievements.quantifiedAchievements.length).toBe(0);
      expect(result.quantifiableAchievements.missingQuantification.length).toBeGreaterThan(0);
    });
  });

  describe('keyword matching analysis', () => {
    it('should match keywords from job requirements', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent, mockJobRequirements);

      expect(result.keywordMatching.matchedKeywords).toContain('JavaScript');
      expect(result.keywordMatching.matchedKeywords).toContain('React');
      expect(result.keywordMatching.matchedKeywords).toContain('Node.js');
      expect(result.keywordMatching.matchedKeywords).toContain('Python');

      expect(result.keywordMatching.missingKeywords).toContain('AWS');
      expect(result.keywordMatching.missingKeywords).toContain('Docker');

      expect(result.keywordMatching.matchPercentage).toBeGreaterThan(0);
      expect(result.keywordMatching.matchPercentage).toBeLessThanOrEqual(100);
    });

    it('should calculate correct match percentage', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent, mockJobRequirements);

      const expectedPercentage = Math.round(
        (result.keywordMatching.matchedKeywords.length / result.keywordMatching.totalJobKeywords) * 100
      );

      expect(result.keywordMatching.matchPercentage).toBe(expectedPercentage);
    });
  });

  describe('clarity and impact analysis', () => {
    it('should analyze content clarity and impact', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent);

      expect(result.clarityAndImpact).toHaveProperty('score');
      expect(result.clarityAndImpact).toHaveProperty('clarityScore');
      expect(result.clarityAndImpact).toHaveProperty('impactScore');
      expect(result.clarityAndImpact).toHaveProperty('sentimentScore');
      expect(result.clarityAndImpact).toHaveProperty('wordCount');
      expect(result.clarityAndImpact).toHaveProperty('readabilityIssues');
      expect(result.clarityAndImpact).toHaveProperty('impactIndicators');

      expect(result.clarityAndImpact.wordCount).toBeGreaterThan(0);
      expect(Array.isArray(result.clarityAndImpact.readabilityIssues)).toBe(true);
      expect(Array.isArray(result.clarityAndImpact.impactIndicators)).toBe(true);
    });

    it('should identify impact indicators', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent);

      expect(result.clarityAndImpact.impactIndicators).toContain('increased');
      expect(result.clarityAndImpact.impactIndicators).toContain('reduced');
    });

    it('should identify readability issues with long sentences', async () => {
      const longSentenceResume: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          summary: 'This is an extremely long sentence that contains way too many words and should be flagged as a readability issue because it exceeds the recommended length for professional resume content and makes it difficult for recruiters to quickly scan and understand the key points being communicated.'
        }
      };

      const result = await service.analyzeResumeContent(longSentenceResume);

      expect(result.clarityAndImpact.readabilityIssues.some(issue => 
        issue.includes('too long')
      )).toBe(true);
    });
  });

  describe('recommendations generation', () => {
    it('should generate appropriate recommendations based on analysis', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent, mockJobRequirements);

      expect(Array.isArray(result.recommendations)).toBe(true);
      
      if (result.recommendations.length > 0) {
        const recommendation = result.recommendations[0];
        expect(recommendation).toBeDefined();
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('title');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('examples');
        expect(Array.isArray(recommendation?.examples)).toBe(true);
      }
    });

    it('should prioritize high-impact recommendations', async () => {
      const poorResume: ResumeContent = {
        ...mockResumeContent,
        sections: {
          ...mockResumeContent.sections,
          experience: [
            {
              company: 'Company',
              position: 'Worker',
              startDate: '2020-01-01',
              endDate: '2023-01-01',
              description: 'Did tasks and worked on stuff',
              achievements: ['Helped with things', 'Made some improvements']
            }
          ]
        }
      };

      const result = await service.analyzeResumeContent(poorResume, mockJobRequirements);

      const highPriorityRecommendations = result.recommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty resume content', async () => {
      const emptyResume: ResumeContent = {
        rawText: '',
        sections: {
          contactInfo: {},
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const result = await service.analyzeResumeContent(emptyResume);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.actionVerbAnalysis.totalVerbs).toBe(0);
      expect(result.quantifiableAchievements.quantifiedAchievements.length).toBe(0);
    });

    it('should handle resume with only summary', async () => {
      const summaryOnlyResume: ResumeContent = {
        rawText: 'Experienced developer',
        sections: {
          contactInfo: { name: 'John Doe' },
          summary: 'Experienced developer with strong technical skills',
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const result = await service.analyzeResumeContent(summaryOnlyResume);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.clarityAndImpact.wordCount).toBeGreaterThan(0);
    });
  });

  describe('scoring calculations', () => {
    it('should return scores within valid range (0-100)', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent, mockJobRequirements);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.actionVerbAnalysis.score).toBeGreaterThanOrEqual(0);
      expect(result.actionVerbAnalysis.score).toBeLessThanOrEqual(100);
      expect(result.quantifiableAchievements.score).toBeGreaterThanOrEqual(0);
      expect(result.quantifiableAchievements.score).toBeLessThanOrEqual(100);
      expect(result.keywordMatching.score).toBeGreaterThanOrEqual(0);
      expect(result.keywordMatching.score).toBeLessThanOrEqual(100);
      expect(result.clarityAndImpact.score).toBeGreaterThanOrEqual(0);
      expect(result.clarityAndImpact.score).toBeLessThanOrEqual(100);
    });

    it('should calculate overall score as weighted average', async () => {
      const result = await service.analyzeResumeContent(mockResumeContent, mockJobRequirements);

      const expectedScore = Math.round(
        (result.actionVerbAnalysis.score * 0.25) +
        (result.quantifiableAchievements.score * 0.25) +
        (result.keywordMatching.score * 0.25) +
        (result.clarityAndImpact.score * 0.25)
      );

      expect(result.overallScore).toBe(expectedScore);
    });
  });
});