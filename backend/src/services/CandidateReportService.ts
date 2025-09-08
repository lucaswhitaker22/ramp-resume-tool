import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { ReportGenerationService, FeedbackReport } from './ReportGenerationService';
import { RankedCandidate } from './CandidateRankingService';
import { RecommendationResult } from './RecommendationEngineService';

/**
 * Service for generating candidate-specific reports and comparative analysis reports
 */
export class CandidateReportService {
  private readonly reportService: ReportGenerationService;
  
  constructor() {
    this.reportService = new ReportGenerationService();
  }

  /**
   * Generate comprehensive candidate analysis report
   */
  generateCandidateReport(
    candidate: RankedCandidate,
    jobTitle?: string
  ): CandidateReport {
    const baseReport = this.reportService.generateFeedbackReport(
      candidate.scoringResult,
      this.convertToRecommendationResult(candidate),
      candidate.metadata?.fileName || `${candidate.name}_resume.pdf`,
      jobTitle
    );

    return {
      ...baseReport,
      candidateProfile: this.generateCandidateProfile(candidate),
      rankingAnalysis: this.generateRankingAnalysis(candidate),
      hiringRecommendation: candidate.hiringRecommendation,
      comparativeInsights: this.generateComparativeInsights(candidate)
    };
  }

  /**
   * Generate comparative report for multiple candidates
   */
  generateComparativeReport(
    candidates: RankedCandidate[],
    jobTitle?: string
  ): ComparativeReport {
    const topCandidates = candidates.slice(0, 5); // Limit to top 5 for readability

    return {
      metadata: {
        generatedAt: new Date(),
        jobTitle: jobTitle || 'Position Analysis',
        candidateCount: candidates.length,
        reportVersion: '1.0'
      },
      executiveSummary: this.generateComparativeExecutiveSummary(candidates),
      candidateRankings: this.generateCandidateRankings(topCandidates),
      categoryComparison: this.generateCategoryComparison(candidates),
      hiringRecommendations: this.generateHiringRecommendations(topCandidates),
      diversityAnalysis: this.generateDiversityAnalysis(candidates)
    };
  }

  /**
   * Export candidate report to PDF
   */
  async exportCandidateReportToPDF(report: CandidateReport): Promise<Buffer> {
    // Use the base report service for PDF generation
    return this.reportService.exportToPDF(report);
  }

  /**
   * Generate PDF report for a single analysis result
   */
  async generatePDFReport(analysisResult: any, _options: {
    includeResumeContent?: boolean;
    template?: string;
    includeCharts?: boolean;
    includeRecommendations?: boolean;
  }): Promise<Buffer> {
    // Use the base report service for PDF generation
    return this.reportService.exportToPDF(analysisResult);
  }

  /**
   * Generate bulk PDF report for multiple analysis results
   */
  async generateBulkPDFReport(analyses: any[], _options: {
    includeComparison?: boolean;
    includeCharts?: boolean;
  }): Promise<Buffer> {
    // Create a combined PDF for multiple analyses
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Title page
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .text('Bulk Candidate Analysis Report', 50, 50);

        doc.font('Helvetica')
           .fontSize(14)
           .text(`Total Candidates: ${analyses.length}`, 50, 100)
           .text(`Generated: ${new Date().toLocaleDateString()}`, 50, 120);

        // Add each analysis
        analyses.forEach((analysis, index) => {
          if (index > 0) doc.addPage();
          
          doc.font('Helvetica-Bold')
             .fontSize(18)
             .text(`Candidate ${index + 1}: ${analysis.fileName || 'Unknown'}`, 50, 50);

          doc.font('Helvetica')
             .fontSize(12)
             .text(`Overall Score: ${analysis.overallScore || 'N/A'}`, 50, 80)
             .text(`Analysis Date: ${analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'N/A'}`, 50, 100);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate ZIP file containing multiple reports
   */
  async generateZipReports(analyses: any[], options: {
    format?: 'pdf' | 'json';
    includeResumeContent?: boolean;
  }): Promise<Buffer> {
    const zip = new JSZip();

    try {
      for (let i = 0; i < analyses.length; i++) {
        const analysis = analyses[i];
        const fileName = analysis.fileName || `candidate_${i + 1}`;
        
        if (options.format === 'pdf') {
          // Generate individual PDF for each analysis
          const pdfBuffer = await this.generatePDFReport(analysis, {
            includeResumeContent: options.includeResumeContent || false,
            includeCharts: true,
            includeRecommendations: true
          });
          zip.file(`${fileName}_report.pdf`, pdfBuffer);
        } else {
          // Generate JSON report
          const jsonReport = {
            fileName: analysis.fileName,
            overallScore: analysis.overallScore,
            categoryScores: analysis.categoryScores,
            createdAt: analysis.createdAt,
            ...(options.includeResumeContent && { resumeContent: analysis.resumeContent })
          };
          zip.file(`${fileName}_report.json`, JSON.stringify(jsonReport, null, 2));
        }
      }

      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      throw new Error(`Failed to generate ZIP reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export comparative report to PDF
   */
  async exportComparativeReportToPDF(report: ComparativeReport): Promise<Buffer> {
    // Create a simplified PDF for comparative reports
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Simple PDF content
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .text('Candidate Comparison Report', 50, 50);

        doc.font('Helvetica')
           .fontSize(14)
           .text(`Total Candidates: ${report.metadata.candidateCount}`, 50, 100)
           .text(`Average Score: ${report.executiveSummary.averageScore}`, 50, 120)
           .text(`Top Candidate: ${report.executiveSummary.topCandidateName}`, 50, 140);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate candidate profile section
   */
  private generateCandidateProfile(candidate: RankedCandidate): CandidateProfile {
    const contact = candidate.resumeContent.sections.contactInfo;
    const experience = candidate.resumeContent.sections.experience;
    const education = candidate.resumeContent.sections.education;
    const skills = candidate.resumeContent.sections.skills;

    return {
      name: candidate.name,
      contactInfo: {
        ...(contact?.email && { email: contact.email }),
        ...(contact?.phone && { phone: contact.phone })
      },
      summary: candidate.resumeContent.sections.summary || 'No summary provided',
      keyExperience: experience.slice(0, 3).map(exp => ({
        company: exp.company,
        position: exp.position,
        duration: this.calculateDuration(exp.startDate, exp.endDate || new Date().toISOString()),
        keyAchievements: exp.achievements.slice(0, 2)
      })),
      education: education.slice(0, 2).map(edu => ({
        institution: edu.institution,
        degree: `${edu.degree} in ${edu.field}`,
        year: edu.graduationDate ? new Date(edu.graduationDate).getFullYear().toString() : 'N/A'
      })),
      topSkills: skills.slice(0, 8),
      yearsOfExperience: this.calculateTotalExperience(experience)
    };
  }

  /**
   * Generate ranking analysis
   */
  private generateRankingAnalysis(candidate: RankedCandidate): RankingAnalysis {
    return {
      overallRank: candidate.rank,
      totalCandidates: candidate.comparativeAnalysis.totalCandidates,
      percentileRank: candidate.comparativeAnalysis.percentileRank,
      categoryRankings: candidate.comparativeAnalysis.categoryPercentiles,
      strengths: candidate.strengths.map(s => ({
        category: s.category,
        description: s.description,
        impact: s.impact
      })),
      improvementAreas: candidate.weaknesses.map(w => ({
        category: w.category,
        description: w.description,
        severity: w.severity,
        suggestions: w.improvementSuggestions.slice(0, 2)
      })),
      competitiveAdvantages: candidate.comparativeAnalysis.competitiveAdvantages,
      differentiatingFactors: candidate.comparativeAnalysis.differentiatingFactors
    };
  }

  /**
   * Generate comparative insights
   */
  private generateComparativeInsights(candidate: RankedCandidate): ComparativeInsights {
    return {
      standoutQualities: candidate.comparativeAnalysis.competitiveAdvantages,
      improvementOpportunities: candidate.comparativeAnalysis.improvementOpportunities,
      similarCandidatesCount: candidate.comparativeAnalysis.similarCandidatesCount,
      uniqueStrengths: candidate.strengths
        .filter(s => s.impact === 'high')
        .map(s => s.description),
      marketPosition: this.determineMarketPosition(candidate.comparativeAnalysis.percentileRank)
    };
  }

  /**
   * Generate comparative executive summary
   */
  private generateComparativeExecutiveSummary(candidates: RankedCandidate[]): ComparativeExecutiveSummary {
    const avgScore = candidates.reduce((sum, c) => sum + c.scoringResult.overallScore, 0) / candidates.length;
    const topCandidate = candidates[0];
    const strongCandidates = candidates.filter(c => c.scoringResult.overallScore >= 75).length;
    
    return {
      totalCandidates: candidates.length,
      averageScore: Math.round(avgScore),
      topCandidateName: topCandidate?.name || 'N/A',
      topCandidateScore: topCandidate?.scoringResult.overallScore || 0,
      strongCandidatesCount: strongCandidates,
      recommendedForInterview: candidates.filter(c => 
        ['strong_hire', 'hire'].includes(c.hiringRecommendation.recommendation)
      ).length,
      keyInsights: this.generateKeyInsights(candidates)
    };
  }

  /**
   * Generate candidate rankings table
   */
  private generateCandidateRankings(candidates: RankedCandidate[]): CandidateRanking[] {
    return candidates.map(candidate => ({
      rank: candidate.rank,
      name: candidate.name,
      overallScore: candidate.scoringResult.overallScore,
      categoryScores: candidate.scoringResult.categoryScores,
      recommendation: candidate.hiringRecommendation.recommendation,
      confidence: candidate.hiringRecommendation.confidence,
      keyStrengths: candidate.strengths.slice(0, 2).map(s => s.category),
      primaryWeakness: candidate.weaknesses[0]?.category || 'none'
    }));
  }

  /**
   * Generate category comparison across candidates
   */
  private generateCategoryComparison(candidates: RankedCandidate[]): CategoryComparison {
    const categories = ['content', 'structure', 'keywords', 'experience', 'skills'] as const;
    const comparison: CategoryComparison = {};

    categories.forEach(category => {
      const scores = candidates.map(c => c.scoringResult.categoryScores[category]);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const topPerformer = candidates.find(c => c.scoringResult.categoryScores[category] === maxScore);

      comparison[category] = {
        averageScore: Math.round(avgScore),
        highestScore: maxScore,
        lowestScore: minScore,
        topPerformer: topPerformer?.name || 'N/A',
        distribution: this.calculateScoreDistribution(scores)
      };
    });

    return comparison;
  }

  /**
   * Generate hiring recommendations summary
   */
  private generateHiringRecommendations(candidates: RankedCandidate[]): HiringRecommendationsSummary {
    // Group candidates by recommendation type
    
    return {
      strongHire: candidates.filter(c => c.hiringRecommendation.recommendation === 'strong_hire'),
      hire: candidates.filter(c => c.hiringRecommendation.recommendation === 'hire'),
      maybe: candidates.filter(c => c.hiringRecommendation.recommendation === 'maybe'),
      noHire: candidates.filter(c => c.hiringRecommendation.recommendation === 'no_hire'),
      strongNoHire: candidates.filter(c => c.hiringRecommendation.recommendation === 'strong_no_hire'),
      overallRecommendation: this.generateOverallRecommendation(candidates)
    };
  }

  /**
   * Generate diversity analysis
   */
  private generateDiversityAnalysis(_candidates: RankedCandidate[]): DiversityAnalysis {
    // Placeholder for diversity analysis - would implement based on available data
    return {
      summary: 'Diversity analysis requires additional candidate demographic data',
      recommendations: [
        'Ensure diverse candidate sourcing',
        'Review job descriptions for inclusive language',
        'Consider bias in evaluation criteria'
      ]
    };
  }

  // Helper methods
  private convertToRecommendationResult(candidate: RankedCandidate): RecommendationResult {
    // Convert candidate data to RecommendationResult format
    return {
      recommendations: [],
      summary: {
        totalRecommendations: candidate.weaknesses.length,
        highPriority: candidate.weaknesses.filter(w => w.severity === 'high').length,
        mediumPriority: candidate.weaknesses.filter(w => w.severity === 'medium').length,
        lowPriority: candidate.weaknesses.filter(w => w.severity === 'low').length,
        categoryBreakdown: {},
        summary: `${candidate.weaknesses.length} improvement areas identified`
      },
      priorityBreakdown: {
        high: candidate.weaknesses.filter(w => w.severity === 'high').map(w => ({
          title: w.description,
          category: w.category,
          impact: w.improvementSuggestions[0] || 'Improvement needed'
        })),
        medium: candidate.weaknesses.filter(w => w.severity === 'medium').map(w => ({
          title: w.description,
          category: w.category,
          impact: w.improvementSuggestions[0] || 'Improvement needed'
        })),
        low: candidate.weaknesses.filter(w => w.severity === 'low').map(w => ({
          title: w.description,
          category: w.category,
          impact: w.improvementSuggestions[0] || 'Improvement needed'
        }))
      }
    };
  }

  private calculateDuration(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }

  private calculateTotalExperience(experience: any[]): number {
    let totalMonths = 0;
    
    experience.forEach(exp => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += months;
    });

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
  }

  private determineMarketPosition(percentileRank: number): string {
    if (percentileRank >= 90) return 'Top tier candidate';
    if (percentileRank >= 75) return 'Strong candidate';
    if (percentileRank >= 50) return 'Average candidate';
    if (percentileRank >= 25) return 'Below average candidate';
    return 'Weak candidate';
  }

  private generateKeyInsights(candidates: RankedCandidate[]): string[] {
    const insights: string[] = [];
    
    const avgScore = candidates.reduce((sum, c) => sum + c.scoringResult.overallScore, 0) / candidates.length;
    const topScore = candidates[0]?.scoringResult.overallScore || 0;
    const scoreGap = topScore - avgScore;

    if (scoreGap > 20) {
      insights.push('Significant quality gap between top candidate and others');
    }

    const strongCandidates = candidates.filter(c => c.scoringResult.overallScore >= 75).length;
    if (strongCandidates === 0) {
      insights.push('No candidates meet the strong performance threshold (75+)');
    } else if (strongCandidates === 1) {
      insights.push('Only one candidate demonstrates strong performance');
    } else {
      insights.push(`${strongCandidates} candidates demonstrate strong performance`);
    }

    return insights;
  }

  private calculateScoreDistribution(scores: number[]): string {
    const high = scores.filter(s => s >= 80).length;
    const medium = scores.filter(s => s >= 60 && s < 80).length;
    const low = scores.filter(s => s < 60).length;
    
    return `High: ${high}, Medium: ${medium}, Low: ${low}`;
  }

  private generateOverallRecommendation(candidates: RankedCandidate[]): string {
    const strongHire = candidates.filter(c => c.hiringRecommendation.recommendation === 'strong_hire').length;
    const hire = candidates.filter(c => c.hiringRecommendation.recommendation === 'hire').length;
    
    if (strongHire > 0) {
      return `Proceed with ${strongHire} strong candidate${strongHire > 1 ? 's' : ''} immediately. ${hire > 0 ? `Consider ${hire} additional candidate${hire > 1 ? 's' : ''} as backup options.` : ''}`;
    } else if (hire > 0) {
      return `Interview ${hire} candidate${hire > 1 ? 's' : ''} to assess cultural fit and specific requirements.`;
    } else {
      return 'Consider expanding candidate search or reviewing job requirements.';
    }
  }
}

// Type definitions
export interface CandidateReport extends FeedbackReport {
  candidateProfile: CandidateProfile;
  rankingAnalysis: RankingAnalysis;
  hiringRecommendation: any;
  comparativeInsights: ComparativeInsights;
}

export interface CandidateProfile {
  name: string;
  contactInfo: {
    email?: string;
    phone?: string;
  };
  summary: string;
  keyExperience: Array<{
    company: string;
    position: string;
    duration: string;
    keyAchievements: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  topSkills: string[];
  yearsOfExperience: number;
}

export interface RankingAnalysis {
  overallRank: number;
  totalCandidates: number;
  percentileRank: number;
  categoryRankings: Record<string, number>;
  strengths: Array<{
    category: string;
    description: string;
    impact: string;
  }>;
  improvementAreas: Array<{
    category: string;
    description: string;
    severity: string;
    suggestions: string[];
  }>;
  competitiveAdvantages: string[];
  differentiatingFactors: string[];
}

export interface ComparativeInsights {
  standoutQualities: string[];
  improvementOpportunities: string[];
  similarCandidatesCount: number;
  uniqueStrengths: string[];
  marketPosition: string;
}

export interface ComparativeReport {
  metadata: {
    generatedAt: Date;
    jobTitle: string;
    candidateCount: number;
    reportVersion: string;
  };
  executiveSummary: ComparativeExecutiveSummary;
  candidateRankings: CandidateRanking[];
  categoryComparison: CategoryComparison;
  hiringRecommendations: HiringRecommendationsSummary;
  diversityAnalysis: DiversityAnalysis;
}

export interface ComparativeExecutiveSummary {
  totalCandidates: number;
  averageScore: number;
  topCandidateName: string;
  topCandidateScore: number;
  strongCandidatesCount: number;
  recommendedForInterview: number;
  keyInsights: string[];
}

export interface CandidateRanking {
  rank: number;
  name: string;
  overallScore: number;
  categoryScores: any;
  recommendation: string;
  confidence: string;
  keyStrengths: string[];
  primaryWeakness: string;
}

export interface CategoryComparison {
  [category: string]: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    topPerformer: string;
    distribution: string;
  };
}

export interface HiringRecommendationsSummary {
  strongHire: RankedCandidate[];
  hire: RankedCandidate[];
  maybe: RankedCandidate[];
  noHire: RankedCandidate[];
  strongNoHire: RankedCandidate[];
  overallRecommendation: string;
}

export interface DiversityAnalysis {
  summary: string;
  recommendations: string[];
}