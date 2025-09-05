import { CategoryScores, ResumeContent, JobRequirements } from '@/types/database';
import { ResumeContentAnalysisService } from './ResumeContentAnalysisService';
import { ATSCompatibilityService } from './ATSCompatibilityService';
import { ParsedResumeSection } from './ResumeParsingService';

/**
 * Service for calculating overall compatibility scores and category-based scoring
 */
export class ScoringEngineService {
  private readonly contentAnalysisService: ResumeContentAnalysisService;
  private readonly atsCompatibilityService: ATSCompatibilityService;

  // Scoring weights for different categories
  private readonly defaultWeights: CategoryWeights = {
    content: 0.25,
    structure: 0.20,
    keywords: 0.25,
    experience: 0.15,
    skills: 0.15
  };

  // Job-specific weight adjustments
  private readonly jobSpecificWeights: Record<string, Partial<CategoryWeights>> = {
    'technical': {
      skills: 0.30,
      keywords: 0.25,
      content: 0.20,
      structure: 0.15,
      experience: 0.10
    },
    'management': {
      experience: 0.30,
      content: 0.25,
      keywords: 0.20,
      structure: 0.15,
      skills: 0.10
    },
    'creative': {
      content: 0.35,
      structure: 0.25,
      skills: 0.20,
      keywords: 0.10,
      experience: 0.10
    }
  };

  constructor() {
    this.contentAnalysisService = new ResumeContentAnalysisService();
    this.atsCompatibilityService = new ATSCompatibilityService();
  }

  /**
   * Calculate overall compatibility score (0-100 scale)
   */
  async calculateOverallScore(
    resumeContent: ResumeContent,
    sections: ParsedResumeSection[],
    jobRequirements?: JobRequirements,
    jobDescription?: string
  ): Promise<ScoringResult> {
    // Get category scores
    const categoryScores = await this.calculateCategoryScores(
      resumeContent,
      sections,
      jobRequirements
    );

    // Determine appropriate weights based on job type
    const weights = this.determineWeights(jobDescription, jobRequirements);

    // Calculate weighted overall score
    const overallScore = this.calculateWeightedScore(categoryScores, weights);

    // Generate score explanation
    const explanation = this.generateScoreExplanation(categoryScores, weights, overallScore);

    // Calculate score breakdown
    const breakdown = this.generateScoreBreakdown(categoryScores, weights);

    return {
      overallScore: Math.round(overallScore),
      categoryScores,
      weights,
      explanation,
      breakdown,
      confidenceLevel: this.calculateConfidenceLevel(categoryScores, jobRequirements)
    };
  }

  /**
   * Calculate category-based scores
   */
  async calculateCategoryScores(
    resumeContent: ResumeContent,
    sections: ParsedResumeSection[],
    jobRequirements?: JobRequirements
  ): Promise<CategoryScores> {
    // Content analysis
    const contentAnalysis = await this.contentAnalysisService.analyzeResumeContent(
      resumeContent,
      sections,
      jobRequirements
    );

    // Structure analysis (ATS compatibility)
    const atsAnalysis = this.atsCompatibilityService.analyzeATSCompatibility(
      resumeContent,
      sections
    );

    // Keywords analysis
    const keywordScore = jobRequirements 
      ? this.calculateKeywordScore(resumeContent, jobRequirements)
      : this.calculateGeneralKeywordScore(resumeContent);

    // Experience analysis
    const experienceScore = this.calculateExperienceScore(
      resumeContent,
      jobRequirements
    );

    // Skills analysis
    const skillsScore = this.calculateSkillsScore(
      resumeContent,
      jobRequirements
    );

    return {
      content: Math.round(contentAnalysis.overallScore),
      structure: Math.round(atsAnalysis.overallScore),
      keywords: Math.round(keywordScore),
      experience: Math.round(experienceScore),
      skills: Math.round(skillsScore)
    };
  }

  /**
   * Build weighted scoring system based on job description match
   */
  private determineWeights(
    jobDescription?: string,
    jobRequirements?: JobRequirements
  ): CategoryWeights {
    if (!jobDescription && !jobRequirements) {
      return { ...this.defaultWeights };
    }

    // Analyze job type from description or requirements
    const jobType = this.determineJobType(jobDescription, jobRequirements);
    
    // Get job-specific weights
    const specificWeights = this.jobSpecificWeights[jobType];
    
    if (specificWeights) {
      return {
        ...this.defaultWeights,
        ...specificWeights
      };
    }

    return { ...this.defaultWeights };
  }

  /**
   * Determine job type from description and requirements
   */
  private determineJobType(
    jobDescription?: string,
    jobRequirements?: JobRequirements
  ): string {
    const content = (jobDescription || '').toLowerCase();
    const skills = jobRequirements?.requiredSkills.concat(jobRequirements?.preferredSkills || []) || [];
    const allText = content + ' ' + skills.join(' ').toLowerCase();

    // Technical roles
    const technicalKeywords = [
      'developer', 'engineer', 'programmer', 'architect', 'devops',
      'javascript', 'python', 'java', 'react', 'node', 'aws', 'docker'
    ];
    
    // Management roles
    const managementKeywords = [
      'manager', 'director', 'lead', 'supervisor', 'head of',
      'team lead', 'project manager', 'product manager', 'scrum master'
    ];
    
    // Creative roles
    const creativeKeywords = [
      'designer', 'creative', 'artist', 'writer', 'content',
      'marketing', 'brand', 'ui/ux', 'graphic', 'visual'
    ];

    const technicalScore = technicalKeywords.reduce((score, keyword) => 
      score + (allText.includes(keyword) ? 1 : 0), 0
    );
    
    const managementScore = managementKeywords.reduce((score, keyword) => 
      score + (allText.includes(keyword) ? 1 : 0), 0
    );
    
    const creativeScore = creativeKeywords.reduce((score, keyword) => 
      score + (allText.includes(keyword) ? 1 : 0), 0
    );

    if (technicalScore >= managementScore && technicalScore >= creativeScore) {
      return 'technical';
    } else if (managementScore >= creativeScore) {
      return 'management';
    } else if (creativeScore > 0) {
      return 'creative';
    }

    return 'general';
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(
    categoryScores: CategoryScores,
    weights: CategoryWeights
  ): number {
    return (
      categoryScores.content * weights.content +
      categoryScores.structure * weights.structure +
      categoryScores.keywords * weights.keywords +
      categoryScores.experience * weights.experience +
      categoryScores.skills * weights.skills
    );
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(
    resumeContent: ResumeContent,
    jobRequirements: JobRequirements
  ): number {
    const resumeText = this.extractResumeText(resumeContent).toLowerCase();
    const allJobKeywords = [
      ...jobRequirements.requiredSkills,
      ...jobRequirements.preferredSkills,
      ...jobRequirements.keywords
    ];

    if (allJobKeywords.length === 0) {
      return 0;
    }

    let matchedCount = 0;
    let weightedScore = 0;

    // Required skills have higher weight
    for (const skill of jobRequirements.requiredSkills) {
      if (resumeText.includes(skill.toLowerCase())) {
        matchedCount++;
        weightedScore += 2; // Higher weight for required skills
      }
    }

    // Preferred skills have medium weight
    for (const skill of jobRequirements.preferredSkills) {
      if (resumeText.includes(skill.toLowerCase())) {
        matchedCount++;
        weightedScore += 1.5;
      }
    }

    // General keywords have lower weight
    for (const keyword of jobRequirements.keywords) {
      if (resumeText.includes(keyword.toLowerCase())) {
        matchedCount++;
        weightedScore += 1;
      }
    }

    // Calculate score based on weighted matches
    const maxPossibleScore = 
      jobRequirements.requiredSkills.length * 2 +
      jobRequirements.preferredSkills.length * 1.5 +
      jobRequirements.keywords.length * 1;

    return maxPossibleScore > 0 ? (weightedScore / maxPossibleScore) * 100 : 0;
  }

  /**
   * Calculate general keyword score when no job requirements provided
   */
  private calculateGeneralKeywordScore(resumeContent: ResumeContent): number {
    const resumeText = this.extractResumeText(resumeContent).toLowerCase();
    
    // Common professional keywords
    const professionalKeywords = [
      'managed', 'led', 'developed', 'implemented', 'created', 'improved',
      'increased', 'reduced', 'achieved', 'delivered', 'collaborated',
      'analyzed', 'designed', 'optimized', 'streamlined', 'enhanced'
    ];

    const matchedKeywords = professionalKeywords.filter(keyword =>
      resumeText.includes(keyword)
    );

    return Math.min(100, (matchedKeywords.length / professionalKeywords.length) * 100);
  }

  /**
   * Calculate experience relevance score
   */
  private calculateExperienceScore(
    resumeContent: ResumeContent,
    jobRequirements?: JobRequirements
  ): number {
    const experiences = resumeContent.sections.experience;
    
    if (experiences.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let scoreCount = 0;

    for (const experience of experiences) {
      let experienceScore = 50; // Base score

      // Check for quantifiable achievements
      const hasQuantifiableAchievements = experience.achievements.some(achievement =>
        /\d+/.test(achievement) || 
        achievement.toLowerCase().includes('%') ||
        achievement.toLowerCase().includes('increased') ||
        achievement.toLowerCase().includes('reduced')
      );

      if (hasQuantifiableAchievements) {
        experienceScore += 20;
      }

      // Check for relevant keywords if job requirements provided
      if (jobRequirements) {
        const experienceText = `${experience.description} ${experience.achievements.join(' ')}`.toLowerCase();
        const relevantKeywords = [
          ...jobRequirements.requiredSkills,
          ...jobRequirements.preferredSkills
        ];

        const matchedKeywords = relevantKeywords.filter(keyword =>
          experienceText.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          experienceScore += Math.min(30, matchedKeywords.length * 5);
        }
      }

      // Check for leadership indicators
      const leadershipKeywords = ['led', 'managed', 'supervised', 'directed', 'coordinated'];
      const hasLeadership = leadershipKeywords.some(keyword =>
        experience.description.toLowerCase().includes(keyword)
      );

      if (hasLeadership) {
        experienceScore += 10;
      }

      totalScore += Math.min(100, experienceScore);
      scoreCount++;
    }

    return scoreCount > 0 ? totalScore / scoreCount : 0;
  }

  /**
   * Calculate skills relevance score
   */
  private calculateSkillsScore(
    resumeContent: ResumeContent,
    jobRequirements?: JobRequirements
  ): number {
    const resumeSkills = resumeContent.sections.skills.map(skill => skill.toLowerCase());
    
    if (resumeSkills.length === 0) {
      return 0;
    }

    if (!jobRequirements) {
      // General skills assessment
      return Math.min(100, resumeSkills.length * 5);
    }

    const requiredSkills = jobRequirements.requiredSkills.map(skill => skill.toLowerCase());
    const preferredSkills = jobRequirements.preferredSkills.map(skill => skill.toLowerCase());

    let score = 0;
    let maxScore = 0;

    // Required skills matching (higher weight)
    for (const requiredSkill of requiredSkills) {
      maxScore += 10;
      if (resumeSkills.some(skill => skill.includes(requiredSkill) || requiredSkill.includes(skill))) {
        score += 10;
      }
    }

    // Preferred skills matching (lower weight)
    for (const preferredSkill of preferredSkills) {
      maxScore += 5;
      if (resumeSkills.some(skill => skill.includes(preferredSkill) || preferredSkill.includes(skill))) {
        score += 5;
      }
    }

    return maxScore > 0 ? Math.min(100, (score / maxScore) * 100) : 0;
  }

  /**
   * Generate score explanation and breakdown functionality
   */
  private generateScoreExplanation(
    categoryScores: CategoryScores,
    weights: CategoryWeights,
    overallScore: number
  ): ScoreExplanation {
    const explanations: string[] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    // Analyze each category
    Object.entries(categoryScores).forEach(([category, score]) => {
      const weight = weights[category as keyof CategoryWeights];
      const contribution = Math.round(score * weight);

      if (score >= 80) {
        strengths.push(`Strong ${category} performance (${score}/100)`);
      } else if (score < 60) {
        improvements.push(`${category} needs improvement (${score}/100)`);
      }

      explanations.push(
        `${category.charAt(0).toUpperCase() + category.slice(1)}: ${score}/100 ` +
        `(${Math.round(weight * 100)}% weight, contributes ${contribution} points)`
      );
    });

    return {
      overallScore,
      categoryBreakdown: explanations,
      strengths,
      improvements,
      summary: this.generateScoreSummary(overallScore)
    };
  }

  /**
   * Generate detailed score breakdown
   */
  private generateScoreBreakdown(
    categoryScores: CategoryScores,
    weights: CategoryWeights
  ): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      categories: [],
      totalWeightedScore: 0,
      maxPossibleScore: 100
    };

    Object.entries(categoryScores).forEach(([category, score]) => {
      const weight = weights[category as keyof CategoryWeights];
      const weightedScore = score * weight;
      const maxWeightedScore = 100 * weight;

      breakdown.categories.push({
        name: category,
        score,
        weight: Math.round(weight * 100),
        weightedScore: Math.round(weightedScore),
        maxWeightedScore: Math.round(maxWeightedScore),
        percentage: Math.round((score / 100) * 100)
      });

      breakdown.totalWeightedScore += weightedScore;
    });

    breakdown.totalWeightedScore = Math.round(breakdown.totalWeightedScore);

    return breakdown;
  }

  /**
   * Calculate confidence level based on available data
   */
  private calculateConfidenceLevel(
    categoryScores: CategoryScores,
    jobRequirements?: JobRequirements
  ): 'high' | 'medium' | 'low' {
    let confidenceFactors = 0;
    let totalFactors = 5;

    // Factor 1: Job requirements provided
    if (jobRequirements) {
      confidenceFactors++;
    }

    // Factor 2: All category scores are reasonable (not 0 or 100)
    const reasonableScores = Object.values(categoryScores).filter(score => 
      score > 10 && score < 95
    );
    if (reasonableScores.length >= 4) {
      confidenceFactors++;
    }

    // Factor 3: Keyword matching data available
    if (categoryScores.keywords > 0) {
      confidenceFactors++;
    }

    // Factor 4: Experience data available
    if (categoryScores.experience > 0) {
      confidenceFactors++;
    }

    // Factor 5: Skills data available
    if (categoryScores.skills > 0) {
      confidenceFactors++;
    }

    const confidenceRatio = confidenceFactors / totalFactors;

    if (confidenceRatio >= 0.8) return 'high';
    if (confidenceRatio >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Generate score summary message
   */
  private generateScoreSummary(overallScore: number): string {
    if (overallScore >= 90) {
      return 'Excellent match! Your resume aligns very well with the job requirements.';
    } else if (overallScore >= 80) {
      return 'Strong match! Your resume shows good alignment with most requirements.';
    } else if (overallScore >= 70) {
      return 'Good match! Some improvements could strengthen your application.';
    } else if (overallScore >= 60) {
      return 'Moderate match. Several areas need improvement to better align with requirements.';
    } else if (overallScore >= 50) {
      return 'Below average match. Significant improvements needed to meet job requirements.';
    } else {
      return 'Poor match. Major revisions needed to align with job requirements.';
    }
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
export interface CategoryWeights {
  content: number;
  structure: number;
  keywords: number;
  experience: number;
  skills: number;
}

export interface ScoringResult {
  overallScore: number;
  categoryScores: CategoryScores;
  weights: CategoryWeights;
  explanation: ScoreExplanation;
  breakdown: ScoreBreakdown;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ScoreExplanation {
  overallScore: number;
  categoryBreakdown: string[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface ScoreBreakdown {
  categories: CategoryBreakdownItem[];
  totalWeightedScore: number;
  maxPossibleScore: number;
}

export interface CategoryBreakdownItem {
  name: string;
  score: number;
  weight: number; // percentage
  weightedScore: number;
  maxWeightedScore: number;
  percentage: number;
}