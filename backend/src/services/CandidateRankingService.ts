import { ScoringResult, ScoringEngineService } from './ScoringEngineService';
import { ResumeContent, JobRequirements, CategoryScores } from '@/types/database';
import { ParsedResumeSection } from './ResumeParsingService';

/**
 * Service for ranking candidates and providing hiring recommendations
 */
export class CandidateRankingService {
  private readonly scoringEngineService: ScoringEngineService;

  constructor() {
    this.scoringEngineService = new ScoringEngineService();
  }

  /**
   * Rank multiple candidates based on their compatibility scores
   */
  async rankCandidates(
    candidates: CandidateData[],
    jobRequirements?: JobRequirements,
    jobDescription?: string,
    rankingCriteria?: RankingCriteria
  ): Promise<RankedCandidate[]> {
    // Score all candidates
    const scoredCandidates: ScoredCandidate[] = [];
    
    for (const candidate of candidates) {
      const scoringResult = await this.scoringEngineService.calculateOverallScore(
        candidate.resumeContent,
        candidate.sections,
        jobRequirements,
        jobDescription
      );

      scoredCandidates.push({
        ...candidate,
        scoringResult,
        strengths: this.identifyStrengths(scoringResult),
        weaknesses: this.identifyWeaknesses(scoringResult)
      });
    }

    // Apply ranking algorithm
    const rankedCandidates = this.applyRankingAlgorithm(
      scoredCandidates,
      rankingCriteria || this.getDefaultRankingCriteria()
    );

    // Generate hiring recommendations
    const candidatesWithRecommendations = rankedCandidates.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      hiringRecommendation: this.generateHiringRecommendation(candidate, index, rankedCandidates.length),
      comparativeAnalysis: this.generateComparativeAnalysis(candidate, rankedCandidates)
    }));

    return candidatesWithRecommendations;
  }

  /**
   * Generate hiring recommendations with confidence levels
   */
  generateHiringRecommendation(
    candidate: ScoredCandidate,
    rank: number,
    totalCandidates: number
  ): HiringRecommendation {
    const { overallScore, confidenceLevel } = candidate.scoringResult;
    const percentileRank = ((totalCandidates - rank) / totalCandidates) * 100;

    let recommendation: RecommendationType;
    let confidence: ConfidenceLevel;
    let reasoning: string[];

    // Determine recommendation based on score and rank
    if (overallScore >= 85 && percentileRank >= 80) {
      recommendation = 'strong_hire';
      confidence = confidenceLevel === 'high' ? 'high' : 'medium';
      reasoning = [
        `Excellent overall score of ${overallScore}/100`,
        `Ranks in top ${Math.round(100 - percentileRank)}% of candidates`,
        'Strong alignment with job requirements'
      ];
    } else if (overallScore >= 75 && percentileRank >= 60) {
      recommendation = 'hire';
      confidence = confidenceLevel === 'high' ? 'medium' : 'low';
      reasoning = [
        `Good overall score of ${overallScore}/100`,
        `Above average performance compared to other candidates`,
        'Meets most job requirements'
      ];
    } else if (overallScore >= 65 && percentileRank >= 40) {
      recommendation = 'maybe';
      confidence = 'low';
      reasoning = [
        `Moderate score of ${overallScore}/100`,
        'Some gaps in requirements alignment',
        'Consider for interview to assess fit'
      ];
    } else if (overallScore >= 50) {
      recommendation = 'no_hire';
      confidence = 'medium';
      reasoning = [
        `Below average score of ${overallScore}/100`,
        'Significant gaps in key requirements',
        'Better candidates available'
      ];
    } else {
      recommendation = 'strong_no_hire';
      confidence = 'high';
      reasoning = [
        `Low score of ${overallScore}/100`,
        'Major misalignment with job requirements',
        'Not suitable for this position'
      ];
    }

    // Apply bias detection adjustments
    const biasAdjustments = this.detectAndAdjustForBias(candidate, recommendation);
    if (biasAdjustments.length > 0) {
      confidence = this.lowerConfidence(confidence);
      reasoning.push('Note: Potential bias factors detected - review carefully');
    }

    return {
      recommendation,
      confidence,
      reasoning,
      biasWarnings: biasAdjustments,
      nextSteps: this.generateNextSteps(recommendation, candidate)
    };
  }

  /**
   * Identify candidate strengths based on scoring results
   */
  private identifyStrengths(scoringResult: ScoringResult): CandidateStrength[] {
    const strengths: CandidateStrength[] = [];
    const { categoryScores, explanation } = scoringResult;

    // Identify top-performing categories
    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score >= 80) {
        strengths.push({
          category: category as keyof CategoryScores,
          score,
          description: this.getStrengthDescription(category, score),
          impact: score >= 90 ? 'high' : 'medium'
        });
      }
    });

    // Add specific strengths from explanation
    explanation.strengths.forEach(strength => {
      if (!strengths.some(s => strength.toLowerCase().includes(s.category))) {
        strengths.push({
          category: this.extractCategoryFromText(strength),
          score: this.extractScoreFromText(strength),
          description: strength,
          impact: 'medium'
        });
      }
    });

    return strengths.sort((a, b) => b.score - a.score);
  }

  /**
   * Identify candidate weaknesses based on scoring results
   */
  private identifyWeaknesses(scoringResult: ScoringResult): CandidateWeakness[] {
    const weaknesses: CandidateWeakness[] = [];
    const { categoryScores, explanation } = scoringResult;

    // Identify low-performing categories
    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score < 60) {
        weaknesses.push({
          category: category as keyof CategoryScores,
          score,
          description: this.getWeaknessDescription(category, score),
          severity: score < 40 ? 'high' : score < 50 ? 'medium' : 'low',
          improvementSuggestions: this.getImprovementSuggestions(category, score)
        });
      }
    });

    // Add specific improvements from explanation
    explanation.improvements.forEach(improvement => {
      if (!weaknesses.some(w => improvement.toLowerCase().includes(w.category))) {
        weaknesses.push({
          category: this.extractCategoryFromText(improvement),
          score: this.extractScoreFromText(improvement),
          description: improvement,
          severity: 'medium',
          improvementSuggestions: []
        });
      }
    });

    return weaknesses.sort((a, b) => a.score - b.score);
  }

  /**
   * Apply ranking algorithm with customizable criteria
   */
  private applyRankingAlgorithm(
    candidates: ScoredCandidate[],
    criteria: RankingCriteria
  ): ScoredCandidate[] {
    return candidates.sort((a, b) => {
      // Primary sort: Overall score with weight
      const scoreA = a.scoringResult.overallScore * criteria.overallScoreWeight;
      const scoreB = b.scoringResult.overallScore * criteria.overallScoreWeight;
      
      if (Math.abs(scoreA - scoreB) > 2) {
        return scoreB - scoreA;
      }

      // Secondary sort: Category-specific weights
      let categoryScoreA = 0;
      let categoryScoreB = 0;

      Object.entries(criteria.categoryWeights).forEach(([category, weight]) => {
        const catKey = category as keyof CategoryScores;
        categoryScoreA += a.scoringResult.categoryScores[catKey] * weight;
        categoryScoreB += b.scoringResult.categoryScores[catKey] * weight;
      });

      if (Math.abs(categoryScoreA - categoryScoreB) > 1) {
        return categoryScoreB - categoryScoreA;
      }

      // Tertiary sort: Confidence level
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const confA = confidenceOrder[a.scoringResult.confidenceLevel];
      const confB = confidenceOrder[b.scoringResult.confidenceLevel];

      if (confA !== confB) {
        return confB - confA;
      }

      // Final sort: Diversity considerations (if enabled)
      if (criteria.diversityBoost) {
        const diversityScoreA = this.calculateDiversityScore(a);
        const diversityScoreB = this.calculateDiversityScore(b);
        return diversityScoreB - diversityScoreA;
      }

      return 0;
    });
  }

  /**
   * Generate comparative analysis between candidates
   */
  private generateComparativeAnalysis(
    candidate: ScoredCandidate,
    allCandidates: ScoredCandidate[]
  ): ComparativeAnalysis {
    const candidateIndex = allCandidates.findIndex(c => c.id === candidate.id);
    const totalCandidates = allCandidates.length;

    // Calculate percentile rankings for each category
    const categoryPercentiles: Record<string, number> = {};
    Object.keys(candidate.scoringResult.categoryScores).forEach(category => {
      const catKey = category as keyof CategoryScores;
      const candidateScore = candidate.scoringResult.categoryScores[catKey];
      const betterCount = allCandidates.filter(c => 
        c.scoringResult.categoryScores[catKey] > candidateScore
      ).length;
      categoryPercentiles[category] = ((totalCandidates - betterCount) / totalCandidates) * 100;
    });

    // Find similar candidates (within 10 points overall score)
    const similarCandidates = allCandidates.filter(c => 
      c.id !== candidate.id &&
      Math.abs(c.scoringResult.overallScore - candidate.scoringResult.overallScore) <= 10
    );

    // Identify differentiating factors
    const differentiatingFactors = this.identifyDifferentiatingFactors(
      candidate,
      similarCandidates
    );

    return {
      overallRank: candidateIndex + 1,
      totalCandidates,
      percentileRank: ((totalCandidates - candidateIndex) / totalCandidates) * 100,
      categoryPercentiles,
      similarCandidatesCount: similarCandidates.length,
      differentiatingFactors,
      competitiveAdvantages: this.identifyCompetitiveAdvantages(candidate, allCandidates),
      improvementOpportunities: this.identifyImprovementOpportunities(candidate, allCandidates)
    };
  }

  /**
   * Detect and adjust for potential bias in hiring decisions
   */
  private detectAndAdjustForBias(
    candidate: ScoredCandidate,
    _recommendation: RecommendationType
  ): BiasWarning[] {
    const warnings: BiasWarning[] = [];

    // Check for name bias indicators
    if (this.detectNameBias(candidate.resumeContent.sections.contactInfo?.name)) {
      warnings.push({
        type: 'name_bias',
        description: 'Consider focusing on qualifications rather than name',
        severity: 'medium',
        mitigation: 'Review candidate based solely on skills and experience'
      });
    }

    // Check for education bias
    if (this.detectEducationBias(candidate.resumeContent.sections.education)) {
      warnings.push({
        type: 'education_bias',
        description: 'Avoid overweighting prestigious institutions',
        severity: 'low',
        mitigation: 'Focus on relevant skills and practical experience'
      });
    }

    // Check for experience gap bias
    if (this.detectExperienceGapBias(candidate.resumeContent.sections.experience)) {
      warnings.push({
        type: 'experience_gap_bias',
        description: 'Employment gaps may have valid reasons',
        severity: 'medium',
        mitigation: 'Consider overall experience quality over continuity'
      });
    }

    // Check for overqualification bias
    if (this.detectOverqualificationBias(candidate.scoringResult)) {
      warnings.push({
        type: 'overqualification_bias',
        description: 'High qualifications should not be penalized',
        severity: 'low',
        mitigation: 'Consider candidate motivation and growth potential'
      });
    }

    return warnings;
  }

  /**
   * Generate next steps based on hiring recommendation
   */
  private generateNextSteps(
    recommendation: RecommendationType,
    candidate: ScoredCandidate
  ): string[] {
    const nextSteps: string[] = [];

    switch (recommendation) {
      case 'strong_hire':
        nextSteps.push('Schedule interview immediately');
        nextSteps.push('Prepare competitive offer');
        nextSteps.push('Check references');
        break;

      case 'hire':
        nextSteps.push('Schedule interview');
        nextSteps.push('Assess cultural fit');
        nextSteps.push('Verify key skills through technical assessment');
        break;

      case 'maybe':
        nextSteps.push('Phone screening to assess interest and basic fit');
        nextSteps.push('Focus interview on identified weakness areas');
        nextSteps.push('Compare with other candidates before final decision');
        break;

      case 'no_hire':
        nextSteps.push('Send polite rejection email');
        nextSteps.push('Keep resume on file for future opportunities');
        break;

      case 'strong_no_hire':
        nextSteps.push('Send rejection email');
        nextSteps.push('Do not consider for similar roles');
        break;
    }

    // Add specific next steps based on candidate strengths/weaknesses
    if (candidate.strengths.some(s => s.category === 'skills' && s.impact === 'high')) {
      nextSteps.push('Consider for technical leadership roles');
    }

    if (candidate.weaknesses.some(w => w.category === 'experience' && w.severity === 'high')) {
      nextSteps.push('Consider for junior or mid-level positions instead');
    }

    return nextSteps;
  }

  // Helper methods for bias detection
  private detectNameBias(_name?: string): boolean {
    // Simple heuristic - in real implementation, this would be more sophisticated
    return false; // Placeholder - actual implementation would check for common bias patterns
  }

  private detectEducationBias(_education: any[]): boolean {
    // Check if candidate is from non-prestigious institution but has strong skills
    return false; // Placeholder
  }

  private detectExperienceGapBias(_experience: any[]): boolean {
    // Check for employment gaps that might be unfairly penalized
    return false; // Placeholder
  }

  private detectOverqualificationBias(scoringResult: ScoringResult): boolean {
    // Check if candidate is being penalized for being too qualified
    return scoringResult.overallScore > 95;
  }

  // Helper methods for analysis
  private getDefaultRankingCriteria(): RankingCriteria {
    return {
      overallScoreWeight: 0.6,
      categoryWeights: {
        content: 0.1,
        structure: 0.05,
        keywords: 0.1,
        experience: 0.1,
        skills: 0.05
      },
      diversityBoost: true
    };
  }

  private calculateDiversityScore(_candidate: ScoredCandidate): number {
    // Placeholder for diversity scoring algorithm
    return 0;
  }

  private identifyDifferentiatingFactors(
    candidate: ScoredCandidate,
    similarCandidates: ScoredCandidate[]
  ): string[] {
    const factors: string[] = [];
    
    // Compare category scores to find differentiators
    Object.entries(candidate.scoringResult.categoryScores).forEach(([category, score]) => {
      const catKey = category as keyof CategoryScores;
      const avgSimilarScore = similarCandidates.reduce((sum, c) => 
        sum + c.scoringResult.categoryScores[catKey], 0
      ) / similarCandidates.length;

      if (score > avgSimilarScore + 10) {
        factors.push(`Stronger ${category} performance than similar candidates`);
      } else if (score < avgSimilarScore - 10) {
        factors.push(`Weaker ${category} performance than similar candidates`);
      }
    });

    return factors;
  }

  private identifyCompetitiveAdvantages(
    candidate: ScoredCandidate,
    allCandidates: ScoredCandidate[]
  ): string[] {
    const advantages: string[] = [];
    
    // Find areas where candidate is in top 25%
    Object.entries(candidate.scoringResult.categoryScores).forEach(([category, score]) => {
      const catKey = category as keyof CategoryScores;
      const betterCount = allCandidates.filter(c => 
        c.scoringResult.categoryScores[catKey] > score
      ).length;
      const percentile = ((allCandidates.length - betterCount) / allCandidates.length) * 100;

      if (percentile >= 75) {
        advantages.push(`Top 25% in ${category}`);
      }
    });

    return advantages;
  }

  private identifyImprovementOpportunities(
    candidate: ScoredCandidate,
    allCandidates: ScoredCandidate[]
  ): string[] {
    const opportunities: string[] = [];
    
    // Find areas where candidate is in bottom 25%
    Object.entries(candidate.scoringResult.categoryScores).forEach(([category, score]) => {
      const catKey = category as keyof CategoryScores;
      const betterCount = allCandidates.filter(c => 
        c.scoringResult.categoryScores[catKey] > score
      ).length;
      const percentile = ((allCandidates.length - betterCount) / allCandidates.length) * 100;

      if (percentile <= 25) {
        opportunities.push(`Improvement needed in ${category}`);
      }
    });

    return opportunities;
  }

  // Helper methods for strength/weakness descriptions
  private getStrengthDescription(category: string, score: number): string {
    const descriptions: Record<string, string> = {
      content: `Excellent resume content with clear, impactful descriptions (${score}/100)`,
      structure: `Well-organized and ATS-friendly resume format (${score}/100)`,
      keywords: `Strong keyword alignment with job requirements (${score}/100)`,
      experience: `Relevant and impressive work experience (${score}/100)`,
      skills: `Comprehensive skill set matching job needs (${score}/100)`
    };
    return descriptions[category] || `Strong ${category} performance (${score}/100)`;
  }

  private getWeaknessDescription(category: string, score: number): string {
    const descriptions: Record<string, string> = {
      content: `Resume content needs improvement for clarity and impact (${score}/100)`,
      structure: `Resume formatting could be more ATS-friendly (${score}/100)`,
      keywords: `Limited keyword alignment with job requirements (${score}/100)`,
      experience: `Experience may not fully match job requirements (${score}/100)`,
      skills: `Skill set has gaps compared to job needs (${score}/100)`
    };
    return descriptions[category] || `${category} needs improvement (${score}/100)`;
  }

  private getImprovementSuggestions(category: string, _score: number): string[] {
    const suggestions: Record<string, string[]> = {
      content: [
        'Use more action verbs and quantifiable achievements',
        'Improve clarity and conciseness of descriptions',
        'Add more specific examples of accomplishments'
      ],
      structure: [
        'Use standard section headings',
        'Improve formatting consistency',
        'Ensure ATS-friendly layout'
      ],
      keywords: [
        'Include more relevant industry keywords',
        'Match terminology used in job description',
        'Add technical skills and certifications'
      ],
      experience: [
        'Highlight more relevant work experience',
        'Add quantifiable results and achievements',
        'Include leadership and project management experience'
      ],
      skills: [
        'Add missing technical skills',
        'Include relevant certifications',
        'Highlight transferable skills'
      ]
    };
    return suggestions[category] || [];
  }

  private extractCategoryFromText(text: string): keyof CategoryScores {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('content')) return 'content';
    if (lowerText.includes('structure') || lowerText.includes('format')) return 'structure';
    if (lowerText.includes('keyword')) return 'keywords';
    if (lowerText.includes('experience')) return 'experience';
    if (lowerText.includes('skill')) return 'skills';
    return 'content'; // default
  }

  private extractScoreFromText(text: string): number {
    const match = text.match(/\((\d+)\/100\)/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  private lowerConfidence(confidence: ConfidenceLevel): ConfidenceLevel {
    if (confidence === 'high') return 'medium';
    if (confidence === 'medium') return 'low';
    return 'low';
  }
}

// Type definitions
export interface CandidateData {
  id: string;
  name: string;
  resumeContent: ResumeContent;
  sections: ParsedResumeSection[];
  metadata?: {
    uploadedAt: Date;
    fileName: string;
  };
}

export interface ScoredCandidate extends CandidateData {
  scoringResult: ScoringResult;
  strengths: CandidateStrength[];
  weaknesses: CandidateWeakness[];
}

export interface RankedCandidate extends ScoredCandidate {
  rank: number;
  hiringRecommendation: HiringRecommendation;
  comparativeAnalysis: ComparativeAnalysis;
}

export interface CandidateStrength {
  category: keyof CategoryScores;
  score: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CandidateWeakness {
  category: keyof CategoryScores;
  score: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
  improvementSuggestions: string[];
}

export interface HiringRecommendation {
  recommendation: RecommendationType;
  confidence: ConfidenceLevel;
  reasoning: string[];
  biasWarnings: BiasWarning[];
  nextSteps: string[];
}

export interface ComparativeAnalysis {
  overallRank: number;
  totalCandidates: number;
  percentileRank: number;
  categoryPercentiles: Record<string, number>;
  similarCandidatesCount: number;
  differentiatingFactors: string[];
  competitiveAdvantages: string[];
  improvementOpportunities: string[];
}

export interface BiasWarning {
  type: 'name_bias' | 'education_bias' | 'experience_gap_bias' | 'overqualification_bias';
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface RankingCriteria {
  overallScoreWeight: number;
  categoryWeights: Partial<Record<keyof CategoryScores, number>>;
  diversityBoost: boolean;
}

export type RecommendationType = 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
export type ConfidenceLevel = 'high' | 'medium' | 'low';