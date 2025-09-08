import { CandidateReportService } from '../services/CandidateReportService';
import { RankedCandidate } from '../services/CandidateRankingService';

describe('CandidateReportService', () => {
  let reportService: CandidateReportService;
  let mockRankedCandidate: RankedCandidate;
  let mockCandidates: RankedCandidate[];

  beforeEach(() => {
    reportService = new CandidateReportService();

    mockRankedCandidate = {
      id: '1',
      name: 'John Doe',
      resumeContent: {
        rawText: 'Senior Software Engineer with 5 years experience',
        sections: {
          contactInfo: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '555-1234'
          },
          summary: 'Experienced software engineer with expertise in full-stack development',
          experience: [
            {
              company: 'Tech Corp',
              position: 'Senior Developer',
              startDate: '2020-01-01',
              endDate: '2023-12-31',
              description: 'Led development of web applications',
              achievements: ['Increased performance by 40%', 'Led team of 5 developers']
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
      },
      sections: [],
      scoringResult: {
        overallScore: 85,
        categoryScores: {
          content: 80,
          structure: 85,
          keywords: 90,
          experience: 85,
          skills: 88
        },
        weights: {
          content: 0.25,
          structure: 0.20,
          keywords: 0.25,
          experience: 0.15,
          skills: 0.15
        },
        explanation: {
          overallScore: 85,
          categoryBreakdown: ['Content: 80/100', 'Structure: 85/100'],
          strengths: ['Strong technical skills', 'Excellent keyword matching'],
          improvements: ['Add more quantifiable achievements'],
          summary: 'Strong match! Your resume shows good alignment with most requirements.'
        },
        breakdown: {
          categories: [
            { name: 'content', score: 80, weight: 25, weightedScore: 20, maxWeightedScore: 25, percentage: 80 }
          ],
          totalWeightedScore: 85,
          maxPossibleScore: 100
        },
        confidenceLevel: 'high'
      },
      strengths: [
        {
          category: 'skills',
          score: 88,
          description: 'Comprehensive technical skill set',
          impact: 'high'
        }
      ],
      weaknesses: [
        {
          category: 'content',
          score: 80,
          description: 'Could improve quantifiable achievements',
          severity: 'medium',
          improvementSuggestions: ['Add specific metrics', 'Include percentage improvements']
        }
      ],
      rank: 1,
      hiringRecommendation: {
        recommendation: 'strong_hire',
        confidence: 'high',
        reasoning: ['Excellent overall score', 'Strong technical skills', 'Good cultural fit'],
        biasWarnings: [],
        nextSteps: ['Schedule interview immediately', 'Prepare competitive offer']
      },
      comparativeAnalysis: {
        overallRank: 1,
        totalCandidates: 5,
        percentileRank: 100,
        categoryPercentiles: {
          content: 90,
          structure: 85,
          keywords: 95,
          experience: 80,
          skills: 92
        },
        similarCandidatesCount: 1,
        differentiatingFactors: ['Superior technical skills', 'Strong leadership experience'],
        competitiveAdvantages: ['Top 5% in technical skills', 'Proven leadership'],
        improvementOpportunities: ['Minor content improvements']
      },
      metadata: {
        uploadedAt: new Date(),
        fileName: 'john_doe_resume.pdf'
      }
    };

    mockCandidates = [
      mockRankedCandidate,
      {
        ...mockRankedCandidate,
        id: '2',
        name: 'Jane Smith',
        rank: 2,
        scoringResult: { ...mockRankedCandidate.scoringResult, overallScore: 75 },
        hiringRecommendation: { ...mockRankedCandidate.hiringRecommendation, recommendation: 'hire' },
        comparativeAnalysis: { ...mockRankedCandidate.comparativeAnalysis, overallRank: 2, percentileRank: 80 }
      },
      {
        ...mockRankedCandidate,
        id: '3',
        name: 'Bob Johnson',
        rank: 3,
        scoringResult: { ...mockRankedCandidate.scoringResult, overallScore: 65 },
        hiringRecommendation: { ...mockRankedCandidate.hiringRecommendation, recommendation: 'maybe' },
        comparativeAnalysis: { ...mockRankedCandidate.comparativeAnalysis, overallRank: 3, percentileRank: 60 }
      }
    ];
  });

  describe('generateCandidateReport', () => {
    it('should generate comprehensive candidate report', () => {
      const report = reportService.generateCandidateReport(
        mockRankedCandidate,
        'Senior Software Engineer'
      );

      expect(report).toBeDefined();
      expect(report.candidateProfile).toBeDefined();
      expect(report.rankingAnalysis).toBeDefined();
      expect(report.hiringRecommendation).toBeDefined();
      expect(report.comparativeInsights).toBeDefined();
      expect(report.metadata.jobTitle).toBe('Senior Software Engineer');
    });

    it('should generate candidate profile correctly', () => {
      const report = reportService.generateCandidateReport(mockRankedCandidate);

      const profile = report.candidateProfile;
      expect(profile.name).toBe('John Doe');
      expect(profile.contactInfo.email).toBe('john.doe@example.com');
      expect(profile.contactInfo.phone).toBe('555-1234');
      expect(profile.summary).toBe('Experienced software engineer with expertise in full-stack development');
      expect(profile.topSkills).toEqual(['JavaScript', 'React', 'Node.js', 'Python', 'AWS']);
      expect(profile.yearsOfExperience).toBeGreaterThan(0);
    });

    it('should generate ranking analysis correctly', () => {
      const report = reportService.generateCandidateReport(mockRankedCandidate);

      const ranking = report.rankingAnalysis;
      expect(ranking.overallRank).toBe(1);
      expect(ranking.totalCandidates).toBe(5);
      expect(ranking.percentileRank).toBe(100);
      expect(ranking.strengths).toHaveLength(1);
      expect(ranking.improvementAreas).toHaveLength(1);
      expect(ranking.competitiveAdvantages).toContain('Top 5% in technical skills');
    });

    it('should generate comparative insights correctly', () => {
      const report = reportService.generateCandidateReport(mockRankedCandidate);

      const insights = report.comparativeInsights;
      expect(insights.standoutQualities).toEqual(mockRankedCandidate.comparativeAnalysis.competitiveAdvantages);
      expect(insights.similarCandidatesCount).toBe(1);
      expect(insights.marketPosition).toBe('Top tier candidate');
    });
  });

  describe('generateComparativeReport', () => {
    it('should generate comprehensive comparative report', () => {
      const report = reportService.generateComparativeReport(
        mockCandidates,
        'Software Engineer Position'
      );

      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
      expect(report.candidateRankings).toBeDefined();
      expect(report.categoryComparison).toBeDefined();
      expect(report.hiringRecommendations).toBeDefined();
      expect(report.diversityAnalysis).toBeDefined();
    });

    it('should generate executive summary correctly', () => {
      const report = reportService.generateComparativeReport(mockCandidates);

      const summary = report.executiveSummary;
      expect(summary.totalCandidates).toBe(3);
      expect(summary.averageScore).toBeGreaterThan(0);
      expect(summary.topCandidateName).toBe('John Doe');
      expect(summary.topCandidateScore).toBe(85);
      expect(summary.keyInsights).toBeInstanceOf(Array);
    });

    it('should generate candidate rankings correctly', () => {
      const report = reportService.generateComparativeReport(mockCandidates);

      const rankings = report.candidateRankings;
      expect(rankings).toHaveLength(3);
      expect(rankings[0]?.rank).toBe(1);
      expect(rankings[0]?.name).toBe('John Doe');
      expect(rankings[0]?.overallScore).toBe(85);
      expect(rankings[0]?.recommendation).toBe('strong_hire');
    });

    it('should generate category comparison correctly', () => {
      const report = reportService.generateComparativeReport(mockCandidates);

      const comparison = report.categoryComparison;
      expect(comparison['content']).toBeDefined();
      expect(comparison['structure']).toBeDefined();
      expect(comparison['keywords']).toBeDefined();
      expect(comparison['experience']).toBeDefined();
      expect(comparison['skills']).toBeDefined();

      Object.values(comparison).forEach(categoryData => {
        expect(categoryData.averageScore).toBeGreaterThanOrEqual(0);
        expect(categoryData.highestScore).toBeGreaterThanOrEqual(categoryData.averageScore);
        expect(categoryData.lowestScore).toBeLessThanOrEqual(categoryData.averageScore);
        expect(categoryData.topPerformer).toBeTruthy();
        expect(categoryData.distribution).toBeTruthy();
      });
    });

    it('should generate hiring recommendations summary correctly', () => {
      const report = reportService.generateComparativeReport(mockCandidates);

      const recommendations = report.hiringRecommendations;
      expect(recommendations.strongHire).toHaveLength(1);
      expect(recommendations.hire).toHaveLength(1);
      expect(recommendations.maybe).toHaveLength(1);
      expect(recommendations.noHire).toHaveLength(0);
      expect(recommendations.strongNoHire).toHaveLength(0);
      expect(recommendations.overallRecommendation).toBeTruthy();
    });
  });

  describe('PDF export', () => {
    it('should export candidate report to PDF', async () => {
      const report = reportService.generateCandidateReport(mockRankedCandidate);
      const pdfBuffer = await reportService.exportCandidateReportToPDF(report);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should export comparative report to PDF', async () => {
      const report = reportService.generateComparativeReport(mockCandidates);
      const pdfBuffer = await reportService.exportComparativeReportToPDF(report);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle PDF export errors gracefully', async () => {
      const malformedReport = {} as any;

      await expect(reportService.exportCandidateReportToPDF(malformedReport)).rejects.toThrow();
      await expect(reportService.exportComparativeReportToPDF(malformedReport)).rejects.toThrow();
    });
  });

  describe('helper methods', () => {
    it('should calculate experience duration correctly', () => {
      const report = reportService.generateCandidateReport(mockRankedCandidate);
      const experience = report.candidateProfile.keyExperience[0];
      
      expect(experience?.duration).toBeTruthy();
      expect(experience?.duration).toMatch(/years?|months?/);
    });

    it('should calculate total experience correctly', () => {
      const report = reportService.generateCandidateReport(mockRankedCandidate);
      
      expect(report.candidateProfile.yearsOfExperience).toBeGreaterThan(0);
      expect(typeof report.candidateProfile.yearsOfExperience).toBe('number');
    });

    it('should determine market position correctly', () => {
      const topCandidate = { ...mockRankedCandidate, comparativeAnalysis: { ...mockRankedCandidate.comparativeAnalysis, percentileRank: 95 } };
      const averageCandidate = { ...mockRankedCandidate, comparativeAnalysis: { ...mockRankedCandidate.comparativeAnalysis, percentileRank: 50 } };
      const weakCandidate = { ...mockRankedCandidate, comparativeAnalysis: { ...mockRankedCandidate.comparativeAnalysis, percentileRank: 20 } };

      const topReport = reportService.generateCandidateReport(topCandidate);
      const averageReport = reportService.generateCandidateReport(averageCandidate);
      const weakReport = reportService.generateCandidateReport(weakCandidate);

      expect(topReport.comparativeInsights.marketPosition).toBe('Top tier candidate');
      expect(averageReport.comparativeInsights.marketPosition).toBe('Average candidate');
      expect(weakReport.comparativeInsights.marketPosition).toBe('Weak candidate');
    });
  });

  describe('edge cases', () => {
    it('should handle candidate with no experience', () => {
      const noExperienceCandidate = {
        ...mockRankedCandidate,
        resumeContent: {
          ...mockRankedCandidate.resumeContent,
          sections: {
            ...mockRankedCandidate.resumeContent.sections,
            experience: []
          }
        }
      };

      const report = reportService.generateCandidateReport(noExperienceCandidate);
      
      expect(report.candidateProfile.keyExperience).toHaveLength(0);
      expect(report.candidateProfile.yearsOfExperience).toBe(0);
    });

    it('should handle candidate with no education', () => {
      const noEducationCandidate = {
        ...mockRankedCandidate,
        resumeContent: {
          ...mockRankedCandidate.resumeContent,
          sections: {
            ...mockRankedCandidate.resumeContent.sections,
            education: []
          }
        }
      };

      const report = reportService.generateCandidateReport(noEducationCandidate);
      
      expect(report.candidateProfile.education).toHaveLength(0);
    });

    it('should handle candidate with no skills', () => {
      const noSkillsCandidate = {
        ...mockRankedCandidate,
        resumeContent: {
          ...mockRankedCandidate.resumeContent,
          sections: {
            ...mockRankedCandidate.resumeContent.sections,
            skills: []
          }
        }
      };

      const report = reportService.generateCandidateReport(noSkillsCandidate);
      
      expect(report.candidateProfile.topSkills).toHaveLength(0);
    });

    it('should handle single candidate comparative report', () => {
      const singleCandidateList = [mockRankedCandidate];
      const report = reportService.generateComparativeReport(singleCandidateList);

      expect(report.executiveSummary.totalCandidates).toBe(1);
      expect(report.candidateRankings).toHaveLength(1);
      expect(report.hiringRecommendations.overallRecommendation).toBeTruthy();
    });

    it('should handle empty candidate list', () => {
      const report = reportService.generateComparativeReport([]);

      expect(report.executiveSummary.totalCandidates).toBe(0);
      expect(report.candidateRankings).toHaveLength(0);
      expect(report.executiveSummary.topCandidateName).toBe('N/A');
    });
  });
});