import PDFDocument from 'pdfkit';
import { Recommendation, CategoryScores } from '@/types/database';
import { ScoringResult } from './ScoringEngineService';
import { RecommendationResult } from './RecommendationEngineService';

/**
 * Service for generating comprehensive feedback reports with PDF export functionality
 */
export class ReportGenerationService {
  private readonly colors = {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    light: '#f8fafc',
    dark: '#1e293b'
  };

  private readonly fonts = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique'
  };

  /**
   * Generate comprehensive feedback report structure
   */
  generateFeedbackReport(
    scoringResult: ScoringResult,
    recommendationResult: RecommendationResult,
    resumeFileName: string,
    jobTitle?: string
  ): FeedbackReport {
    const metadata: ReportMetadata = {
      generatedAt: new Date(),
      resumeFileName,
      reportVersion: '1.0'
    };

    if (jobTitle) {
      metadata.jobTitle = jobTitle;
    }

    const report: FeedbackReport = {
      metadata,
      executiveSummary: this.generateExecutiveSummary(scoringResult, recommendationResult),
      scoreAnalysis: this.generateScoreAnalysis(scoringResult),
      recommendations: this.organizeRecommendations(recommendationResult),
      actionPlan: this.generateActionPlan(recommendationResult),
      appendix: this.generateAppendix(scoringResult)
    };

    return report;
  }

  /**
   * Export report to PDF using PDFKit
   */
  async exportToPDF(report: FeedbackReport): Promise<Buffer> {
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

        // Generate PDF content
        this.generatePDFContent(doc, report);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate PDF content with professional formatting and styling
   */
  private generatePDFContent(doc: PDFKit.PDFDocument, report: FeedbackReport): void {
    let yPosition = 50;

    // Header
    yPosition = this.addHeader(doc, report, yPosition);
    
    // Executive Summary
    yPosition = this.addExecutiveSummary(doc, report, yPosition);
    
    // Score Analysis with visual elements
    yPosition = this.addScoreAnalysis(doc, report, yPosition);
    
    // Recommendations
    yPosition = this.addRecommendations(doc, report, yPosition);
    
    // Action Plan
    yPosition = this.addActionPlan(doc, report, yPosition);
    
    // Footer
    this.addFooter(doc, report);
  }

  /**
   * Add header section to PDF
   */
  private addHeader(doc: PDFKit.PDFDocument, report: FeedbackReport, yPosition: number): number {
    // Title
    doc.font(this.fonts.bold)
       .fontSize(24)
       .fillColor(this.colors.primary)
       .text('Resume Analysis Report', 50, yPosition);

    yPosition += 40;

    // Subtitle
    doc.font(this.fonts.regular)
       .fontSize(14)
       .fillColor(this.colors.secondary)
       .text(`Analysis for: ${report.metadata.resumeFileName}`, 50, yPosition);

    yPosition += 20;

    if (report.metadata.jobTitle) {
      doc.text(`Job Position: ${report.metadata.jobTitle}`, 50, yPosition);
      yPosition += 20;
    }

    doc.text(`Generated: ${report.metadata.generatedAt.toLocaleDateString()}`, 50, yPosition);
    yPosition += 30;

    // Separator line
    doc.strokeColor(this.colors.light)
       .lineWidth(1)
       .moveTo(50, yPosition)
       .lineTo(545, yPosition)
       .stroke();

    return yPosition + 20;
  }

  /**
   * Add executive summary section
   */
  private addExecutiveSummary(doc: PDFKit.PDFDocument, report: FeedbackReport, yPosition: number): number {
    yPosition = this.addSectionHeader(doc, 'Executive Summary', yPosition);

    // Overall score with visual indicator
    const scoreColor = this.getScoreColor(report.executiveSummary.overallScore);
    
    doc.font(this.fonts.bold)
       .fontSize(16)
       .fillColor(scoreColor)
       .text(`Overall Score: ${report.executiveSummary.overallScore}/100`, 50, yPosition);

    yPosition += 25;

    // Score interpretation
    doc.font(this.fonts.regular)
       .fontSize(12)
       .fillColor(this.colors.dark)
       .text(report.executiveSummary.summary, 50, yPosition, { width: 495 });

    yPosition += this.getTextHeight(doc, report.executiveSummary.summary, 495) + 20;

    // Key highlights
    if (report.executiveSummary.keyHighlights.length > 0) {
      doc.font(this.fonts.bold)
         .fontSize(14)
         .text('Key Highlights:', 50, yPosition);
      
      yPosition += 20;

      report.executiveSummary.keyHighlights.forEach(highlight => {
        doc.font(this.fonts.regular)
           .fontSize(11)
           .text(`• ${highlight}`, 70, yPosition);
        yPosition += 15;
      });

      yPosition += 10;
    }

    return yPosition;
  }

  /**
   * Add score analysis with charts and progress bars
   */
  private addScoreAnalysis(doc: PDFKit.PDFDocument, report: FeedbackReport, yPosition: number): number {
    yPosition = this.addSectionHeader(doc, 'Score Breakdown', yPosition);

    // Category scores with progress bars
    const categories = Object.entries(report.scoreAnalysis.categoryScores);
    
    categories.forEach(([category, score]) => {
      // Category name
      doc.font(this.fonts.bold)
         .fontSize(12)
         .fillColor(this.colors.dark)
         .text(this.capitalizeFirst(category), 50, yPosition);

      // Score
      doc.font(this.fonts.regular)
         .text(`${score}/100`, 450, yPosition);

      yPosition += 20;

      // Progress bar
      this.drawProgressBar(doc, 50, yPosition, 400, 8, score, 100);
      yPosition += 25;
    });

    // Confidence level
    yPosition += 10;
    doc.font(this.fonts.bold)
       .fontSize(12)
       .text('Analysis Confidence:', 50, yPosition);
    
    doc.font(this.fonts.regular)
       .fillColor(this.getConfidenceColor(report.scoreAnalysis.confidenceLevel))
       .text(this.capitalizeFirst(report.scoreAnalysis.confidenceLevel), 180, yPosition);

    return yPosition + 30;
  }

  /**
   * Add recommendations section
   */
  private addRecommendations(doc: PDFKit.PDFDocument, report: FeedbackReport, yPosition: number): number {
    yPosition = this.addSectionHeader(doc, 'Recommendations', yPosition);

    // Summary
    doc.font(this.fonts.regular)
       .fontSize(11)
       .fillColor(this.colors.dark)
       .text(report.recommendations.summary.summary, 50, yPosition, { width: 495 });

    yPosition += this.getTextHeight(doc, report.recommendations.summary.summary, 495) + 20;

    // Priority breakdown
    const priorities: Array<{ level: keyof typeof report.recommendations.priorityBreakdown; color: string; label: string }> = [
      { level: 'high', color: this.colors.danger, label: 'High Priority' },
      { level: 'medium', color: this.colors.warning, label: 'Medium Priority' },
      { level: 'low', color: this.colors.secondary, label: 'Low Priority' }
    ];

    priorities.forEach(({ level, color, label }) => {
      const items = report.recommendations.priorityBreakdown[level];
      if (items.length === 0) return;

      // Priority header
      doc.font(this.fonts.bold)
         .fontSize(14)
         .fillColor(color)
         .text(`${label} (${items.length})`, 50, yPosition);

      yPosition += 20;

      // Items
      items.slice(0, 5).forEach((item: any) => { // Limit to top 5 per priority
        doc.font(this.fonts.bold)
           .fontSize(11)
           .fillColor(this.colors.dark)
           .text(`• ${item.title}`, 70, yPosition);

        yPosition += 15;

        doc.font(this.fonts.regular)
           .fontSize(10)
           .fillColor(this.colors.secondary)
           .text(item.impact, 85, yPosition, { width: 460 });

        yPosition += this.getTextHeight(doc, item.impact, 460) + 10;
      });

      yPosition += 10;
    });

    return yPosition;
  }

  /**
   * Add action plan section
   */
  private addActionPlan(doc: PDFKit.PDFDocument, report: FeedbackReport, yPosition: number): number {
    yPosition = this.addSectionHeader(doc, 'Action Plan', yPosition);

    report.actionPlan.steps.forEach((step, index) => {
      // Step number and title
      doc.font(this.fonts.bold)
         .fontSize(12)
         .fillColor(this.colors.primary)
         .text(`${index + 1}. ${step.title}`, 50, yPosition);

      yPosition += 18;

      // Description
      doc.font(this.fonts.regular)
         .fontSize(11)
         .fillColor(this.colors.dark)
         .text(step.description, 70, yPosition, { width: 475 });

      yPosition += this.getTextHeight(doc, step.description, 475) + 5;

      // Timeline
      doc.font(this.fonts.italic)
         .fontSize(10)
         .fillColor(this.colors.secondary)
         .text(`Timeline: ${step.timeline}`, 70, yPosition);

      yPosition += 20;
    });

    return yPosition;
  }

  /**
   * Add footer to PDF
   */
  private addFooter(doc: PDFKit.PDFDocument, report: FeedbackReport): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 30;

    doc.font(this.fonts.regular)
       .fontSize(8)
       .fillColor(this.colors.secondary)
       .text(`Generated by Resume Review Tool v${report.metadata.reportVersion}`, 50, footerY)
       .text(`Page 1`, 500, footerY);
  }

  /**
   * Add section header
   */
  private addSectionHeader(doc: PDFKit.PDFDocument, title: string, yPosition: number): number {
    doc.font(this.fonts.bold)
       .fontSize(16)
       .fillColor(this.colors.primary)
       .text(title, 50, yPosition);

    yPosition += 25;

    // Underline
    doc.strokeColor(this.colors.primary)
       .lineWidth(2)
       .moveTo(50, yPosition)
       .lineTo(200, yPosition)
       .stroke();

    return yPosition + 15;
  }

  /**
   * Draw progress bar
   */
  private drawProgressBar(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    maxValue: number
  ): void {
    const percentage = Math.min(value / maxValue, 1);
    const fillWidth = width * percentage;

    // Background
    doc.rect(x, y, width, height)
       .fillColor(this.colors.light)
       .fill();

    // Fill
    if (fillWidth > 0) {
      doc.rect(x, y, fillWidth, height)
         .fillColor(this.getScoreColor(value))
         .fill();
    }

    // Border
    doc.rect(x, y, width, height)
       .strokeColor(this.colors.secondary)
       .lineWidth(0.5)
       .stroke();
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    scoringResult: ScoringResult,
    recommendationResult: RecommendationResult
  ): ExecutiveSummary {
    const keyHighlights: string[] = [];

    // Add score-based highlights
    if (scoringResult.overallScore >= 80) {
      keyHighlights.push('Strong overall resume performance');
    } else if (scoringResult.overallScore >= 60) {
      keyHighlights.push('Good foundation with room for improvement');
    } else {
      keyHighlights.push('Significant improvements needed');
    }

    // Add category highlights
    const topCategory = Object.entries(scoringResult.categoryScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory && topCategory[1] >= 80) {
      keyHighlights.push(`Excellent ${topCategory[0]} performance (${topCategory[1]}/100)`);
    }

    // Add recommendation highlights
    if (recommendationResult.summary.highPriority > 0) {
      keyHighlights.push(`${recommendationResult.summary.highPriority} high-priority improvements identified`);
    }

    return {
      overallScore: scoringResult.overallScore,
      summary: scoringResult.explanation.summary,
      keyHighlights,
      confidenceLevel: scoringResult.confidenceLevel
    };
  }

  /**
   * Generate score analysis
   */
  private generateScoreAnalysis(scoringResult: ScoringResult): ScoreAnalysis {
    return {
      categoryScores: scoringResult.categoryScores,
      breakdown: scoringResult.breakdown,
      strengths: scoringResult.explanation.strengths,
      improvements: scoringResult.explanation.improvements,
      confidenceLevel: scoringResult.confidenceLevel
    };
  }

  /**
   * Organize recommendations
   */
  private organizeRecommendations(recommendationResult: RecommendationResult): RecommendationSection {
    return {
      summary: recommendationResult.summary,
      priorityBreakdown: recommendationResult.priorityBreakdown,
      detailedRecommendations: recommendationResult.recommendations
    };
  }

  /**
   * Generate action plan
   */
  private generateActionPlan(recommendationResult: RecommendationResult): ActionPlan {
    const steps: ActionStep[] = [];

    // High priority items first
    recommendationResult.priorityBreakdown.high.slice(0, 3).forEach((item) => {
      steps.push({
        title: item.title,
        description: item.impact,
        timeline: 'Immediate (1-2 days)',
        priority: 'high'
      });
    });

    // Medium priority items
    recommendationResult.priorityBreakdown.medium.slice(0, 2).forEach((item) => {
      steps.push({
        title: item.title,
        description: item.impact,
        timeline: 'Short-term (3-7 days)',
        priority: 'medium'
      });
    });

    // Low priority items
    recommendationResult.priorityBreakdown.low.slice(0, 1).forEach((item) => {
      steps.push({
        title: item.title,
        description: item.impact,
        timeline: 'Long-term (1-2 weeks)',
        priority: 'low'
      });
    });

    return {
      steps,
      estimatedTimeToComplete: this.calculateEstimatedTime(steps),
      priorityFocus: this.determinePriorityFocus(recommendationResult)
    };
  }

  /**
   * Generate appendix
   */
  private generateAppendix(_scoringResult: ScoringResult): Appendix {
    return {
      scoringMethodology: 'Scores are calculated using weighted algorithms based on industry best practices and ATS compatibility requirements.',
      categoryDefinitions: {
        content: 'Quality and impact of resume content, including action verbs and quantifiable achievements',
        structure: 'ATS compatibility, formatting, and organization',
        keywords: 'Alignment with job requirements and relevant industry terms',
        experience: 'Relevance and presentation of work experience',
        skills: 'Technical and soft skills matching job requirements'
      },
      confidenceLevels: {
        high: 'Analysis based on complete data with job requirements',
        medium: 'Analysis based on partial data or general best practices',
        low: 'Limited data available for comprehensive analysis'
      }
    };
  }

  /**
   * Helper methods
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return this.colors.success;
    if (score >= 60) return this.colors.warning;
    return this.colors.danger;
  }

  private getConfidenceColor(level: string): string {
    switch (level) {
      case 'high': return this.colors.success;
      case 'medium': return this.colors.warning;
      case 'low': return this.colors.danger;
      default: return this.colors.secondary;
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getTextHeight(doc: PDFKit.PDFDocument, text: string, width: number): number {
    return doc.heightOfString(text, { width });
  }

  private calculateEstimatedTime(steps: ActionStep[]): string {
    const highPriorityCount = steps.filter(s => s.priority === 'high').length;
    const mediumPriorityCount = steps.filter(s => s.priority === 'medium').length;
    const lowPriorityCount = steps.filter(s => s.priority === 'low').length;

    const totalDays = highPriorityCount * 1 + mediumPriorityCount * 3 + lowPriorityCount * 7;
    
    if (totalDays <= 7) return `${totalDays} days`;
    if (totalDays <= 14) return '1-2 weeks';
    return '2-3 weeks';
  }

  private determinePriorityFocus(recommendationResult: RecommendationResult): string {
    const { highPriority, mediumPriority } = recommendationResult.summary;
    
    if (highPriority > 0) return 'Focus on high-priority improvements first for maximum impact';
    if (mediumPriority > 0) return 'Address medium-priority items to enhance overall quality';
    return 'Fine-tune with low-priority improvements for polish';
  }
}

// Type definitions
export interface FeedbackReport {
  metadata: ReportMetadata;
  executiveSummary: ExecutiveSummary;
  scoreAnalysis: ScoreAnalysis;
  recommendations: RecommendationSection;
  actionPlan: ActionPlan;
  appendix: Appendix;
}

export interface ReportMetadata {
  generatedAt: Date;
  resumeFileName: string;
  jobTitle?: string;
  reportVersion: string;
}

export interface ExecutiveSummary {
  overallScore: number;
  summary: string;
  keyHighlights: string[];
  confidenceLevel: string;
}

export interface ScoreAnalysis {
  categoryScores: CategoryScores;
  breakdown: any;
  strengths: string[];
  improvements: string[];
  confidenceLevel: string;
}

export interface RecommendationSection {
  summary: any;
  priorityBreakdown: any;
  detailedRecommendations: Recommendation[];
}

export interface ActionPlan {
  steps: ActionStep[];
  estimatedTimeToComplete: string;
  priorityFocus: string;
}

export interface ActionStep {
  title: string;
  description: string;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Appendix {
  scoringMethodology: string;
  categoryDefinitions: Record<string, string>;
  confidenceLevels: Record<string, string>;
}