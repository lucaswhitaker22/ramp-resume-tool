import nlp from 'compromise';
import Sentiment from 'sentiment';
import { ResumeContent, JobRequirements } from '@/types/database';
import { ATSCompatibilityService, ATSCompatibilityResult } from './ATSCompatibilityService';
import { ParsedResumeSection } from './ResumeParsingService';

/**
 * Service for analyzing resume content quality and effectiveness
 */
export class ResumeContentAnalysisService {
  private readonly sentiment: Sentiment;
  private readonly strongActionVerbs: Set<string>;
  private readonly weakActionVerbs: Set<string>;
  private readonly quantifiableIndicators: string[];
  private readonly clarityIndicators: {
    positive: string[];
    negative: string[];
  };
  private readonly atsCompatibilityService: ATSCompatibilityService;

  constructor() {
    this.sentiment = new Sentiment();
    this.atsCompatibilityService = new ATSCompatibilityService();

    // Strong action verbs that show impact and leadership
    this.strongActionVerbs = new Set([
      'achieved', 'accelerated', 'accomplished', 'advanced', 'analyzed', 'architected',
      'automated', 'built', 'created', 'delivered', 'designed', 'developed', 'directed',
      'drove', 'enhanced', 'established', 'executed', 'expanded', 'generated', 'implemented',
      'improved', 'increased', 'initiated', 'innovated', 'launched', 'led', 'managed',
      'optimized', 'orchestrated', 'pioneered', 'produced', 'reduced', 'resolved',
      'spearheaded', 'streamlined', 'strengthened', 'transformed', 'upgraded'
    ]);

    // Weak action verbs that should be replaced
    this.weakActionVerbs = new Set([
      'did', 'made', 'worked', 'helped', 'assisted', 'participated', 'involved',
      'responsible', 'duties', 'tasks', 'handled', 'dealt', 'used', 'utilized',
      'familiar', 'experienced', 'knowledgeable', 'worked on', 'worked with'
    ]);

    // Indicators of quantifiable achievements
    this.quantifiableIndicators = [
      '%', 'percent', 'percentage', '$', 'dollar', 'million', 'thousand', 'billion',
      'increased', 'decreased', 'reduced', 'improved', 'grew', 'generated', 'saved',
      'hours', 'days', 'weeks', 'months', 'years', 'times faster', 'x faster',
      'team of', 'budget of', 'revenue of', 'sales of', 'users', 'customers', 'clients'
    ];

    // Clarity indicators
    this.clarityIndicators = {
      positive: [
        'specifically', 'precisely', 'exactly', 'clearly', 'directly', 'successfully',
        'effectively', 'efficiently', 'systematically', 'strategically', 'proactively'
      ],
      negative: [
        'various', 'multiple', 'several', 'many', 'some', 'different', 'numerous',
        'stuff', 'things', 'etc', 'and so on', 'among others', 'including but not limited to'
      ]
    };
  }

  /**
   * Analyze resume content for overall quality and effectiveness
   */
  async analyzeResumeContent(
    resumeContent: ResumeContent, 
    sections: ParsedResumeSection[], 
    jobRequirements?: JobRequirements
  ): Promise<{
    overallScore: number;
    actionVerbAnalysis: ActionVerbAnalysis;
    quantifiableAchievements: QuantifiableAchievementAnalysis;
    keywordMatching: KeywordMatchingAnalysis;
    clarityAndImpact: ClarityAndImpactAnalysis;
    atsCompatibility: ATSCompatibilityResult;
    recommendations: ContentRecommendation[];
  }> {
    const actionVerbAnalysis = this.analyzeActionVerbs(resumeContent);
    const quantifiableAchievements = this.analyzeQuantifiableAchievements(resumeContent);
    const keywordMatching = jobRequirements 
      ? this.analyzeKeywordMatching(resumeContent, jobRequirements)
      : this.getDefaultKeywordAnalysis();
    const clarityAndImpact = this.analyzeClarityAndImpact(resumeContent);
    const atsCompatibility = this.atsCompatibilityService.analyzeATSCompatibility(resumeContent, sections);

    const overallScore = this.calculateOverallContentScore(
      actionVerbAnalysis,
      quantifiableAchievements,
      keywordMatching,
      clarityAndImpact,
      atsCompatibility
    );

    const recommendations = this.generateContentRecommendations(
      actionVerbAnalysis,
      quantifiableAchievements,
      keywordMatching,
      clarityAndImpact,
      atsCompatibility
    );

    return {
      overallScore,
      actionVerbAnalysis,
      quantifiableAchievements,
      keywordMatching,
      clarityAndImpact,
      atsCompatibility,
      recommendations
    };
  }

  /**
   * Analyze action verb strength and provide suggestions
   */
  private analyzeActionVerbs(resumeContent: ResumeContent): ActionVerbAnalysis {
    const allText = this.extractAllText(resumeContent);
    const doc = nlp(allText);
    const verbs = doc.verbs().out('array');

    const strongVerbs: string[] = [];
    const weakVerbs: string[] = [];
    const suggestions: ActionVerbSuggestion[] = [];

    for (const verb of verbs) {
      const lowerVerb = verb.toLowerCase();
      
      // Try different forms of the verb
      const verbForms = [
        lowerVerb,
        lowerVerb.replace(/ed$/, ''),
        lowerVerb.replace(/ing$/, ''),
        lowerVerb.replace(/s$/, ''),
        lowerVerb.replace(/d$/, '')
      ];
      
      let isStrong = false;
      let isWeak = false;
      let matchedForm = '';
      
      for (const form of verbForms) {
        if (this.strongActionVerbs.has(form)) {
          isStrong = true;
          matchedForm = form;
          break;
        } else if (this.weakActionVerbs.has(form)) {
          isWeak = true;
          matchedForm = form;
          break;
        }
      }
      
      if (isStrong) {
        strongVerbs.push(verb);
      } else if (isWeak) {
        weakVerbs.push(verb);
        const suggestion = this.getActionVerbSuggestion(matchedForm);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    const score = this.calculateActionVerbScore(strongVerbs.length, weakVerbs.length, verbs.length);

    return {
      score,
      strongVerbs: [...new Set(strongVerbs)],
      weakVerbs: [...new Set(weakVerbs)],
      totalVerbs: verbs.length,
      suggestions
    };
  }

  /**
   * Analyze quantifiable achievements in resume
   */
  private analyzeQuantifiableAchievements(resumeContent: ResumeContent): QuantifiableAchievementAnalysis {
    const achievements: QuantifiableAchievement[] = [];
    const missingQuantification: string[] = [];

    // Analyze work experience for quantifiable achievements
    for (const experience of resumeContent.sections.experience) {
      const experienceText = `${experience.description} ${experience.achievements.join(' ')}`;
      
      const quantified = this.findQuantifiableElements(experienceText);
      if (quantified.length > 0) {
        achievements.push({
          section: 'experience',
          company: experience.company,
          achievements: quantified
        });
      } else {
        // Check if this experience could benefit from quantification
        if (this.couldBenefitFromQuantification(experienceText)) {
          missingQuantification.push(`${experience.company} - ${experience.position}`);
        }
      }
    }

    const score = this.calculateQuantificationScore(achievements.length, missingQuantification.length);

    return {
      score,
      quantifiedAchievements: achievements,
      missingQuantification,
      suggestions: this.generateQuantificationSuggestions(missingQuantification)
    };
  }

  /**
   * Analyze keyword matching against job requirements
   */
  private analyzeKeywordMatching(resumeContent: ResumeContent, jobRequirements: JobRequirements): KeywordMatchingAnalysis {
    const resumeText = this.extractAllText(resumeContent).toLowerCase();
    const allJobKeywords = [
      ...jobRequirements.requiredSkills,
      ...jobRequirements.preferredSkills,
      ...jobRequirements.keywords
    ];

    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const keyword of allJobKeywords) {
      if (resumeText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    }

    const score = this.calculateKeywordMatchScore(matchedKeywords.length, allJobKeywords.length);

    return {
      score,
      matchedKeywords: [...new Set(matchedKeywords)],
      missingKeywords: [...new Set(missingKeywords)],
      totalJobKeywords: allJobKeywords.length,
      matchPercentage: Math.round((matchedKeywords.length / allJobKeywords.length) * 100)
    };
  }

  /**
   * Analyze content clarity and impact
   */
  private analyzeClarityAndImpact(resumeContent: ResumeContent): ClarityAndImpactAnalysis {
    const allText = this.extractAllText(resumeContent);
    const sentimentResult = this.sentiment.analyze(allText);
    
    const clarityScore = this.calculateClarityScore(allText);
    const impactScore = this.calculateImpactScore(allText, sentimentResult);
    
    const overallScore = Math.round((clarityScore + impactScore) / 2);

    return {
      score: overallScore,
      clarityScore,
      impactScore,
      sentimentScore: sentimentResult.score,
      wordCount: allText.split(/\s+/).length,
      readabilityIssues: this.identifyReadabilityIssues(allText),
      impactIndicators: this.findImpactIndicators(allText)
    };
  }

  /**
   * Extract all text from resume content
   */
  private extractAllText(resumeContent: ResumeContent): string {
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

  /**
   * Find quantifiable elements in text
   */
  private findQuantifiableElements(text: string): string[] {
    const quantified: string[] = [];
    const lowerText = text.toLowerCase();

    for (const indicator of this.quantifiableIndicators) {
      if (lowerText.includes(indicator)) {
        // Extract the sentence containing the quantifiable element
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(indicator)) {
            quantified.push(sentence.trim());
            break;
          }
        }
      }
    }

    return [...new Set(quantified)];
  }

  /**
   * Check if text could benefit from quantification
   */
  private couldBenefitFromQuantification(text: string): boolean {
    const benefitIndicators = [
      'improved', 'increased', 'reduced', 'managed', 'led', 'developed',
      'created', 'implemented', 'optimized', 'streamlined', 'enhanced',
      'helped', 'assisted', 'worked', 'participated', 'contributed',
      'supported', 'collaborated', 'delivered', 'built', 'designed'
    ];

    return benefitIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  }

  /**
   * Calculate action verb score
   */
  private calculateActionVerbScore(strongCount: number, weakCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    
    const strongRatio = strongCount / totalCount;
    const weakPenalty = (weakCount / totalCount) * 0.5;
    
    return Math.max(0, Math.min(100, Math.round((strongRatio - weakPenalty) * 100)));
  }

  /**
   * Calculate quantification score
   */
  private calculateQuantificationScore(quantifiedCount: number, missingCount: number): number {
    const totalOpportunities = quantifiedCount + missingCount;
    if (totalOpportunities === 0) return 100;
    
    return Math.round((quantifiedCount / totalOpportunities) * 100);
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatchScore(matchedCount: number, totalCount: number): number {
    if (totalCount === 0) return 100;
    return Math.round((matchedCount / totalCount) * 100);
  }

  /**
   * Calculate clarity score
   */
  private calculateClarityScore(text: string): number {
    const lowerText = text.toLowerCase();
    let score = 70; // Base score

    // Positive indicators
    for (const indicator of this.clarityIndicators.positive) {
      if (lowerText.includes(indicator)) {
        score += 2;
      }
    }

    // Negative indicators
    for (const indicator of this.clarityIndicators.negative) {
      if (lowerText.includes(indicator)) {
        score -= 3;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate impact score
   */
  private calculateImpactScore(text: string, sentimentResult: any): number {
    let score = 50; // Base score

    // Sentiment contribution
    if (sentimentResult.score > 0) {
      score += Math.min(20, sentimentResult.score * 2);
    }

    // Impact words
    const impactWords = [
      'achieved', 'delivered', 'exceeded', 'successful', 'significant',
      'major', 'critical', 'key', 'essential', 'innovative'
    ];

    const lowerText = text.toLowerCase();
    for (const word of impactWords) {
      if (lowerText.includes(word)) {
        score += 3;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate overall content score
   */
  private calculateOverallContentScore(
    actionVerbs: ActionVerbAnalysis,
    quantifiable: QuantifiableAchievementAnalysis,
    keywords: KeywordMatchingAnalysis,
    clarity: ClarityAndImpactAnalysis,
    atsCompatibility: ATSCompatibilityResult
  ): number {
    const weights = {
      actionVerbs: 0.2,
      quantifiable: 0.2,
      keywords: 0.2,
      clarity: 0.2,
      atsCompatibility: 0.2
    };

    return Math.round(
      actionVerbs.score * weights.actionVerbs +
      quantifiable.score * weights.quantifiable +
      keywords.score * weights.keywords +
      clarity.score * weights.clarity +
      atsCompatibility.overallScore * weights.atsCompatibility
    );
  }

  /**
   * Get action verb suggestion
   */
  private getActionVerbSuggestion(weakVerb: string): ActionVerbSuggestion | null {
    const suggestions: Record<string, string[]> = {
      'did': ['achieved', 'accomplished', 'executed', 'delivered'],
      'made': ['created', 'developed', 'built', 'produced'],
      'worked': ['collaborated', 'contributed', 'participated', 'engaged'],
      'helped': ['assisted', 'supported', 'facilitated', 'enabled'],
      'responsible': ['managed', 'oversaw', 'directed', 'led'],
      'handled': ['managed', 'processed', 'resolved', 'addressed'],
      'used': ['utilized', 'leveraged', 'applied', 'implemented']
    };

    const alternatives = suggestions[weakVerb];
    if (!alternatives) return null;

    return {
      weakVerb,
      suggestions: alternatives,
      example: `Instead of "${weakVerb}", try "${alternatives[0]}"`
    };
  }

  /**
   * Generate quantification suggestions
   */
  private generateQuantificationSuggestions(missingQuantification: string[]): string[] {
    return missingQuantification.map(item => 
      `Add specific metrics to ${item} (e.g., percentages, dollar amounts, time saved, team size)`
    );
  }

  /**
   * Identify readability issues
   */
  private identifyReadabilityIssues(text: string): string[] {
    const issues: string[] = [];
    
    // Check for overly long sentences
    const sentences = text.split(/[.!?]+/);
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
    if (longSentences.length > 0) {
      issues.push(`${longSentences.length} sentences are too long (over 25 words)`);
    }

    // Check for passive voice indicators
    const passiveIndicators = ['was', 'were', 'been', 'being'];
    const passiveCount = passiveIndicators.reduce((count, indicator) => 
      count + (text.toLowerCase().match(new RegExp(`\\b${indicator}\\b`, 'g')) || []).length, 0
    );
    
    if (passiveCount > 5) {
      issues.push('Consider reducing passive voice usage');
    }

    return issues;
  }

  /**
   * Find impact indicators in text
   */
  private findImpactIndicators(text: string): string[] {
    const indicators = [
      'increased', 'improved', 'reduced', 'saved', 'generated',
      'achieved', 'exceeded', 'delivered', 'launched', 'created'
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const indicator of indicators) {
      if (lowerText.includes(indicator)) {
        found.push(indicator);
      }
    }

    return [...new Set(found)];
  }

  /**
   * Get default keyword analysis when no job requirements provided
   */
  private getDefaultKeywordAnalysis(): KeywordMatchingAnalysis {
    return {
      score: 0,
      matchedKeywords: [],
      missingKeywords: [],
      totalJobKeywords: 0,
      matchPercentage: 0
    };
  }

  /**
   * Generate content recommendations
   */
  private generateContentRecommendations(
    actionVerbs: ActionVerbAnalysis,
    quantifiable: QuantifiableAchievementAnalysis,
    keywords: KeywordMatchingAnalysis,
    clarity: ClarityAndImpactAnalysis,
    atsCompatibility: ATSCompatibilityResult
  ): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = [];

    // Action verb recommendations
    if (actionVerbs.score < 70) {
      recommendations.push({
        category: 'action-verbs',
        priority: 'high',
        title: 'Strengthen Action Verbs',
        description: 'Replace weak action verbs with stronger alternatives to show impact',
        examples: actionVerbs.suggestions.slice(0, 3).map(s => s.example)
      });
    }

    // Quantification recommendations
    if (quantifiable.score < 60) {
      recommendations.push({
        category: 'quantification',
        priority: 'high',
        title: 'Add Quantifiable Achievements',
        description: 'Include specific numbers, percentages, and metrics to demonstrate impact',
        examples: quantifiable.suggestions.slice(0, 2)
      });
    }

    // Keyword recommendations
    if (keywords.score < 50 && keywords.totalJobKeywords > 0) {
      recommendations.push({
        category: 'keywords',
        priority: 'medium',
        title: 'Improve Keyword Matching',
        description: 'Include more relevant keywords from the job description',
        examples: keywords.missingKeywords.slice(0, 5).map(k => `Consider adding: ${k}`)
      });
    }

    // Clarity recommendations
    if (clarity.score < 60) {
      recommendations.push({
        category: 'clarity',
        priority: 'medium',
        title: 'Improve Content Clarity',
        description: 'Make your achievements more specific and impactful',
        examples: clarity.readabilityIssues.slice(0, 2)
      });
    }

    // ATS Compatibility recommendations
    if (atsCompatibility.overallScore < 80) {
      const priorityATSRecommendations = this.atsCompatibilityService.getPriorityRecommendations(atsCompatibility.recommendations);
      
      priorityATSRecommendations.forEach(atsRec => {
        recommendations.push({
          category: 'ats-compatibility',
          priority: atsRec.priority,
          title: atsRec.title,
          description: atsRec.description,
          examples: atsRec.example ? [atsRec.example] : []
        });
      });
    }

    return recommendations;
  }
}

// Type definitions
export interface ActionVerbAnalysis {
  score: number;
  strongVerbs: string[];
  weakVerbs: string[];
  totalVerbs: number;
  suggestions: ActionVerbSuggestion[];
}

export interface ActionVerbSuggestion {
  weakVerb: string;
  suggestions: string[];
  example: string;
}

export interface QuantifiableAchievementAnalysis {
  score: number;
  quantifiedAchievements: QuantifiableAchievement[];
  missingQuantification: string[];
  suggestions: string[];
}

export interface QuantifiableAchievement {
  section: string;
  company: string;
  achievements: string[];
}

export interface KeywordMatchingAnalysis {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalJobKeywords: number;
  matchPercentage: number;
}

export interface ClarityAndImpactAnalysis {
  score: number;
  clarityScore: number;
  impactScore: number;
  sentimentScore: number;
  wordCount: number;
  readabilityIssues: string[];
  impactIndicators: string[];
}

export interface ContentRecommendation {
  category: 'action-verbs' | 'quantification' | 'keywords' | 'clarity' | 'ats-compatibility';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  examples: string[];
}