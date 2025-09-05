import { Recommendation, ResumeContent, JobRequirements, CategoryScores } from '@/types/database';
import { ResumeContentAnalysisService, ContentRecommendation } from './ResumeContentAnalysisService';
import { ATSCompatibilityService, ATSCompatibilityResult } from './ATSCompatibilityService';
import { ParsedResumeSection } from './ResumeParsingService';

/**
 * Service for generating priority-based recommendations and actionable improvement suggestions
 */
export class RecommendationEngineService {
  private readonly contentAnalysisService: ResumeContentAnalysisService;
  private readonly atsCompatibilityService: ATSCompatibilityService;

  constructor() {
    this.contentAnalysisService = new ResumeContentAnalysisService();
    this.atsCompatibilityService = new ATSCompatibilityService();
  }

  /**
   * Generate comprehensive recommendations based on analysis results
   */
  async generateRecommendations(
    resumeContent: ResumeContent,
    sections: ParsedResumeSection[],
    categoryScores: CategoryScores,
    jobRequirements?: JobRequirements
  ): Promise<RecommendationResult> {
    // Get detailed analysis results
    const contentAnalysis = await this.contentAnalysisService.analyzeResumeContent(
      resumeContent,
      sections,
      jobRequirements
    );

    const atsAnalysis = this.atsCompatibilityService.analyzeATSCompatibility(
      resumeContent,
      sections
    );

    // Generate recommendations from different sources
    const contentRecommendations = this.processContentRecommendations(contentAnalysis.recommendations);
    const atsRecommendations = this.processATSRecommendations(atsAnalysis);
    const categoryRecommendations = this.generateCategoryBasedRecommendations(
      categoryScores,
      resumeContent,
      jobRequirements
    );

    // Combine and prioritize all recommendations
    const allRecommendations = [
      ...contentRecommendations,
      ...atsRecommendations,
      ...categoryRecommendations
    ];

    // Remove duplicates and prioritize
    const prioritizedRecommendations = this.prioritizeRecommendations(allRecommendations);

    // Add impact assessments
    const recommendationsWithImpact = this.addImpactAssessments(prioritizedRecommendations);

    // Generate before/after examples
    const finalRecommendations = this.addBeforeAfterExamples(recommendationsWithImpact);

    return {
      recommendations: finalRecommendations,
      summary: this.generateRecommendationSummary(finalRecommendations),
      priorityBreakdown: this.generatePriorityBreakdown(finalRecommendations)
    };
  }

  /**
   * Process content analysis recommendations
   */
  private processContentRecommendations(contentRecommendations: ContentRecommendation[]): Recommendation[] {
    return contentRecommendations.map((rec, index) => {
      const recommendation: Recommendation = {
        id: `content-${index}`,
        category: this.mapContentCategory(rec.category),
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        impact: this.calculateContentImpact(rec.category, rec.priority)
      };

      if (rec.examples.length > 0 && rec.examples[0]) {
        recommendation.examples = {
          after: rec.examples[0],
          before: this.generateBeforeExample(rec.category, rec.examples[0])
        };
      }

      return recommendation;
    });
  }

  /**
   * Process ATS compatibility recommendations
   */
  private processATSRecommendations(atsAnalysis: ATSCompatibilityResult): Recommendation[] {
    return atsAnalysis.recommendations.map((rec, index) => {
      const recommendation: Recommendation = {
        id: `ats-${index}`,
        category: 'structure',
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        impact: this.calculateATSImpact(rec.priority)
      };

      if (rec.example) {
        recommendation.examples = {
          after: rec.example,
          before: this.generateATSBeforeExample(rec.title)
        };
      }

      return recommendation;
    });
  }

  /**
   * Generate category-based recommendations
   */
  private generateCategoryBasedRecommendations(
    categoryScores: CategoryScores,
    resumeContent: ResumeContent,
    jobRequirements?: JobRequirements
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Content recommendations
    if (categoryScores.content < 70) {
      recommendations.push({
        id: 'category-content',
        category: 'content',
        priority: categoryScores.content < 50 ? 'high' : 'medium',
        title: 'Improve Content Quality',
        description: 'Enhance the overall quality and impact of your resume content',
        examples: {
          before: 'Worked on various projects and helped the team',
          after: 'Led development of 3 high-impact web applications, resulting in 40% improved user engagement'
        },
        impact: 'Significantly improves how recruiters perceive your experience and achievements'
      });
    }

    // Structure recommendations
    if (categoryScores.structure < 80) {
      recommendations.push({
        id: 'category-structure',
        category: 'structure',
        priority: categoryScores.structure < 60 ? 'high' : 'medium',
        title: 'Optimize Resume Structure',
        description: 'Improve formatting and organization for better ATS compatibility',
        examples: {
          before: 'Complex formatting with tables and graphics',
          after: 'Clean, simple formatting with clear section headers and bullet points'
        },
        impact: 'Ensures your resume passes through ATS systems and reaches human reviewers'
      });
    }

    // Keywords recommendations
    if (categoryScores.keywords < 60 && jobRequirements) {
      const missingSkills = this.findMissingKeywords(resumeContent, jobRequirements);
      recommendations.push({
        id: 'category-keywords',
        category: 'keywords',
        priority: categoryScores.keywords < 40 ? 'high' : 'medium',
        title: 'Add Relevant Keywords',
        description: `Include more job-relevant keywords. Missing: ${missingSkills.slice(0, 3).join(', ')}`,
        examples: {
          before: 'Developed web applications using various technologies',
          after: `Developed web applications using ${missingSkills.slice(0, 2).join(' and ')}, improving performance by 30%`
        },
        impact: 'Increases keyword matching score and improves ATS ranking'
      });
    }

    // Experience recommendations
    if (categoryScores.experience < 70) {
      recommendations.push({
        id: 'category-experience',
        category: 'experience',
        priority: categoryScores.experience < 50 ? 'high' : 'medium',
        title: 'Strengthen Experience Descriptions',
        description: 'Add quantifiable achievements and use stronger action verbs',
        examples: {
          before: 'Responsible for managing projects and working with team members',
          after: 'Led cross-functional team of 8 members to deliver 5 projects on time, reducing delivery time by 25%'
        },
        impact: 'Demonstrates concrete value and leadership capabilities to employers'
      });
    }

    // Skills recommendations
    if (categoryScores.skills < 60) {
      recommendations.push({
        id: 'category-skills',
        category: 'skills',
        priority: categoryScores.skills < 40 ? 'high' : 'medium',
        title: 'Enhance Skills Section',
        description: 'Add relevant technical and soft skills that match job requirements',
        examples: {
          before: 'Programming, databases, teamwork',
          after: 'JavaScript, React, Node.js, PostgreSQL, Agile methodology, Cross-functional collaboration'
        },
        impact: 'Better alignment with job requirements and improved keyword matching'
      });
    }

    return recommendations;
  }

  /**
   * Prioritize recommendations based on impact and urgency
   */
  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Remove duplicates based on title similarity
    const uniqueRecommendations = this.removeDuplicateRecommendations(recommendations);

    // Sort by priority and impact
    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If same priority, sort by category importance
      const categoryOrder = { 'content': 5, 'keywords': 4, 'structure': 3, 'experience': 2, 'skills': 1 };
      return categoryOrder[b.category] - categoryOrder[a.category];
    });
  }

  /**
   * Add impact assessments to recommendations
   */
  private addImpactAssessments(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.map(rec => ({
      ...rec,
      impact: rec.impact || this.generateImpactAssessment(rec.category, rec.priority)
    }));
  }

  /**
   * Add before/after examples to recommendations
   */
  private addBeforeAfterExamples(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.map(rec => {
      if (!rec.examples) {
        rec.examples = this.generateExamplesForRecommendation(rec);
      }
      return rec;
    });
  }

  /**
   * Generate recommendation summary
   */
  private generateRecommendationSummary(recommendations: Recommendation[]): RecommendationSummary {
    const highPriority = recommendations.filter(r => r.priority === 'high').length;
    const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
    const lowPriority = recommendations.filter(r => r.priority === 'low').length;

    const categoryBreakdown = recommendations.reduce((acc, rec) => {
      acc[rec.category] = (acc[rec.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let summaryText = '';
    if (highPriority > 0) {
      summaryText = `Focus on ${highPriority} high-priority improvements first. `;
    }
    if (mediumPriority > 0) {
      summaryText += `Then address ${mediumPriority} medium-priority items. `;
    }
    if (lowPriority > 0) {
      summaryText += `Finally, consider ${lowPriority} low-priority enhancements.`;
    }

    return {
      totalRecommendations: recommendations.length,
      highPriority,
      mediumPriority,
      lowPriority,
      categoryBreakdown,
      summary: summaryText.trim()
    };
  }

  /**
   * Generate priority breakdown
   */
  private generatePriorityBreakdown(recommendations: Recommendation[]): PriorityBreakdown {
    const breakdown: PriorityBreakdown = {
      high: [],
      medium: [],
      low: []
    };

    recommendations.forEach(rec => {
      breakdown[rec.priority].push({
        title: rec.title,
        category: rec.category,
        impact: rec.impact
      });
    });

    return breakdown;
  }

  /**
   * Map content category to recommendation category
   */
  private mapContentCategory(contentCategory: string): Recommendation['category'] {
    const mapping: Record<string, Recommendation['category']> = {
      'action-verbs': 'content',
      'quantification': 'content',
      'keywords': 'keywords',
      'clarity': 'content',
      'ats-compatibility': 'structure'
    };

    return mapping[contentCategory] || 'content';
  }

  /**
   * Calculate content impact
   */
  private calculateContentImpact(category: string, priority: string): string {
    const impacts: Record<string, Record<string, string>> = {
      'action-verbs': {
        'high': 'Significantly improves how recruiters perceive your achievements',
        'medium': 'Moderately enhances the impact of your experience descriptions',
        'low': 'Slightly improves the professional tone of your resume'
      },
      'quantification': {
        'high': 'Dramatically demonstrates your concrete value and results',
        'medium': 'Clearly shows measurable impact of your work',
        'low': 'Adds credibility to your achievements'
      },
      'keywords': {
        'high': 'Greatly improves ATS matching and recruiter search visibility',
        'medium': 'Enhances alignment with job requirements',
        'low': 'Slightly improves keyword relevance'
      }
    };

    return impacts[category]?.[priority] || 'Improves overall resume quality';
  }

  /**
   * Calculate ATS impact
   */
  private calculateATSImpact(priority: string): string {
    const impacts: Record<string, string> = {
      'high': 'Critical for passing ATS screening and reaching human reviewers',
      'medium': 'Important for optimal ATS parsing and formatting',
      'low': 'Helpful for consistent formatting and readability'
    };

    return impacts[priority] || 'Improves ATS compatibility';
  }

  /**
   * Generate before example for content recommendations
   */
  private generateBeforeExample(category: string, _afterExample: string): string {
    const beforeExamples: Record<string, string> = {
      'action-verbs': 'Worked on projects and helped team members',
      'quantification': 'Improved system performance and user experience',
      'keywords': 'Developed applications using various technologies',
      'clarity': 'Responsible for various tasks and duties',
      'ats-compatibility': 'Complex formatting with graphics and tables'
    };

    return beforeExamples[category] || 'Generic description without specific details';
  }

  /**
   * Generate ATS before example
   */
  private generateATSBeforeExample(title: string): string {
    if (title.toLowerCase().includes('format')) {
      return 'Complex formatting with tables, graphics, and unusual fonts';
    } else if (title.toLowerCase().includes('section')) {
      return 'Unclear section headers or missing standard sections';
    } else if (title.toLowerCase().includes('contact')) {
      return 'Contact information embedded in headers or graphics';
    }
    return 'Non-standard formatting that may confuse ATS systems';
  }

  /**
   * Find missing keywords from job requirements
   */
  private findMissingKeywords(resumeContent: ResumeContent, jobRequirements: JobRequirements): string[] {
    const resumeText = this.extractResumeText(resumeContent).toLowerCase();
    const allJobKeywords = [
      ...jobRequirements.requiredSkills,
      ...jobRequirements.preferredSkills,
      ...jobRequirements.keywords
    ];

    return allJobKeywords.filter(keyword => 
      !resumeText.includes(keyword.toLowerCase())
    ).slice(0, 10); // Return top 10 missing keywords
  }

  /**
   * Remove duplicate recommendations
   */
  private removeDuplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.category}-${rec.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate impact assessment
   */
  private generateImpactAssessment(category: string, priority: string): string {
    const assessments: Record<string, Record<string, string>> = {
      'content': {
        'high': 'Major improvement in how employers perceive your qualifications',
        'medium': 'Noticeable enhancement in resume effectiveness',
        'low': 'Minor improvement in overall presentation'
      },
      'structure': {
        'high': 'Critical for ATS compatibility and professional appearance',
        'medium': 'Important for readability and organization',
        'low': 'Helpful for consistent formatting'
      },
      'keywords': {
        'high': 'Significantly improves job matching and search visibility',
        'medium': 'Enhances relevance to job requirements',
        'low': 'Slightly improves keyword alignment'
      },
      'experience': {
        'high': 'Dramatically showcases your value and achievements',
        'medium': 'Clearly demonstrates your capabilities',
        'low': 'Adds credibility to your background'
      },
      'skills': {
        'high': 'Greatly improves technical qualification matching',
        'medium': 'Enhances skill relevance and completeness',
        'low': 'Slightly improves skill presentation'
      }
    };

    return assessments[category]?.[priority] || 'Improves overall resume quality';
  }

  /**
   * Generate examples for recommendation
   */
  private generateExamplesForRecommendation(recommendation: Recommendation): { before?: string; after: string } {
    const examples: Record<string, { before: string; after: string }> = {
      'content': {
        before: 'Worked on projects and helped team members with various tasks',
        after: 'Led development of 3 web applications, increasing user engagement by 40% and reducing load time by 2 seconds'
      },
      'structure': {
        before: 'Complex formatting with graphics, tables, and unusual fonts',
        after: 'Clean, simple formatting with clear section headers and consistent bullet points'
      },
      'keywords': {
        before: 'Developed applications using various programming languages',
        after: 'Developed React and Node.js applications using JavaScript, TypeScript, and PostgreSQL'
      },
      'experience': {
        before: 'Responsible for managing projects and working with team',
        after: 'Managed 5 cross-functional projects with teams of 6-8 members, delivering all projects on time and 15% under budget'
      },
      'skills': {
        before: 'Programming, databases, communication',
        after: 'JavaScript, React, Node.js, PostgreSQL, Agile methodology, Cross-functional team leadership'
      }
    };

    return examples[recommendation.category] || {
      before: 'Generic description without specific details',
      after: 'Specific, quantified achievement with clear impact'
    };
  }

  /**
   * Extract all text from resume content
   */
  private extractResumeText(resumeContent: ResumeContent): string {
    const textParts = [
      resumeContent.sections.summary || '',
      ...resumeContent.sections.experience.map(exp => 
        `${exp.description} ${exp.achievements.join(' ')}`
      ),
      ...resumeContent.sections.skills,
      ...resumeContent.sections.education.map(edu => 
        `${edu.degree} ${edu.field} ${edu.institution}`
      )
    ];

    return textParts.join(' ').trim();
  }
}

// Type definitions
export interface RecommendationResult {
  recommendations: Recommendation[];
  summary: RecommendationSummary;
  priorityBreakdown: PriorityBreakdown;
}

export interface RecommendationSummary {
  totalRecommendations: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  categoryBreakdown: Record<string, number>;
  summary: string;
}

export interface PriorityBreakdown {
  high: PriorityItem[];
  medium: PriorityItem[];
  low: PriorityItem[];
}

export interface PriorityItem {
  title: string;
  category: string;
  impact: string;
}