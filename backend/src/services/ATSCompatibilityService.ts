import { ResumeContent } from '../types/database';
import { ParsedResumeSection } from './ResumeParsingService';

export interface ATSCompatibilityResult {
  overallScore: number;
  formattingScore: number;
  sectionOrganizationScore: number;
  readabilityScore: number;
  professionalPresentationScore: number;
  issues: ATSIssue[];
  recommendations: ATSRecommendation[];
}

export interface ATSIssue {
  category: 'formatting' | 'organization' | 'readability' | 'presentation';
  severity: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
}

export interface ATSRecommendation {
  category: 'formatting' | 'organization' | 'readability' | 'presentation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  example?: string;
}

export class ATSCompatibilityService {
  private readonly requiredSections = ['contact', 'experience', 'education', 'skills'];
  private readonly recommendedSections = ['summary', 'certifications'];
  private readonly maxResumeLength = 2; // pages
  private readonly minExperienceDescriptionLength = 50;
  private readonly maxLineLength = 100;

  /**
   * Analyze resume for ATS compatibility
   */
  analyzeATSCompatibility(content: ResumeContent, sections: ParsedResumeSection[]): ATSCompatibilityResult {
    const formattingAnalysis = this.analyzeFormatting(content);
    const organizationAnalysis = this.analyzeSectionOrganization(content, sections);
    const readabilityAnalysis = this.analyzeReadability(content);
    const presentationAnalysis = this.analyzeProfessionalPresentation(content);

    const issues: ATSIssue[] = [
      ...formattingAnalysis.issues,
      ...organizationAnalysis.issues,
      ...readabilityAnalysis.issues,
      ...presentationAnalysis.issues
    ];

    const recommendations: ATSRecommendation[] = [
      ...formattingAnalysis.recommendations,
      ...organizationAnalysis.recommendations,
      ...readabilityAnalysis.recommendations,
      ...presentationAnalysis.recommendations
    ];

    const overallScore = this.calculateOverallScore([
      formattingAnalysis.score,
      organizationAnalysis.score,
      readabilityAnalysis.score,
      presentationAnalysis.score
    ]);

    return {
      overallScore,
      formattingScore: formattingAnalysis.score,
      sectionOrganizationScore: organizationAnalysis.score,
      readabilityScore: readabilityAnalysis.score,
      professionalPresentationScore: presentationAnalysis.score,
      issues,
      recommendations
    };
  }

  /**
   * Analyze formatting for ATS compatibility
   */
  private analyzeFormatting(content: ResumeContent): {
    score: number;
    issues: ATSIssue[];
    recommendations: ATSRecommendation[];
  } {
    const issues: ATSIssue[] = [];
    const recommendations: ATSRecommendation[] = [];
    let score = 100;

    // Check for complex formatting that ATS might struggle with
    const complexFormattingPatterns = [
      /\t+/g, // Tabs
      /\s{4,}/g, // Multiple spaces
      /[^\x00-\x7F]/g, // Non-ASCII characters
      /[│┌┐└┘├┤┬┴┼]/g, // Box drawing characters
      /[▪▫■□●○]/g // Special bullets
    ];

    let complexFormattingCount = 0;
    complexFormattingPatterns.forEach(pattern => {
      const matches = content.rawText.match(pattern);
      if (matches) {
        complexFormattingCount += matches.length;
      }
    });

    if (complexFormattingCount > 5) {
      score -= 20;
      issues.push({
        category: 'formatting',
        severity: 'high',
        description: 'Complex formatting detected that may not be ATS-friendly',
        impact: 'ATS systems may not parse content correctly, leading to missed keywords'
      });
      recommendations.push({
        category: 'formatting',
        priority: 'high',
        title: 'Simplify Formatting',
        description: 'Use simple formatting with standard bullets (- or •) and avoid complex layouts',
        example: 'Replace special characters with standard bullets: • instead of ▪'
      });
    }

    // Check for proper use of standard fonts (inferred from character usage)
    const unusualCharacters = content.rawText.match(/[^\x00-\x7F]/g);
    if (unusualCharacters && unusualCharacters.length > 5) {
      score -= 10;
      issues.push({
        category: 'formatting',
        severity: 'medium',
        description: 'Non-standard characters detected',
        impact: 'May cause parsing issues in some ATS systems'
      });
      recommendations.push({
        category: 'formatting',
        priority: 'medium',
        title: 'Use Standard Characters',
        description: 'Replace special characters with standard ASCII equivalents',
        example: 'Use standard quotes " instead of curly quotes " "'
      });
    }

    // Check for consistent bullet points
    const bulletPatterns = [/^[-•*]\s/gm, /^\d+\.\s/gm];
    let bulletConsistency = true;
    let primaryBulletType = '';

    bulletPatterns.forEach(pattern => {
      const matches = content.rawText.match(pattern);
      if (matches && matches.length > 0) {
        const bulletType = matches[0]?.charAt(0) || '';
        if (!primaryBulletType) {
          primaryBulletType = bulletType;
        } else if (primaryBulletType !== bulletType) {
          bulletConsistency = false;
        }
      }
    });

    if (!bulletConsistency) {
      score -= 5;
      issues.push({
        category: 'formatting',
        severity: 'low',
        description: 'Inconsistent bullet point formatting',
        impact: 'May appear unprofessional and reduce readability'
      });
      recommendations.push({
        category: 'formatting',
        priority: 'low',
        title: 'Standardize Bullet Points',
        description: 'Use consistent bullet points throughout the resume',
        example: 'Use • for all bullet points instead of mixing •, -, and *'
      });
    }

    // Check for appropriate line length
    const lines = content.rawText.split('\n');
    const longLines = lines.filter(line => line.length > this.maxLineLength);
    if (longLines.length > lines.length * 0.3) {
      score -= 10;
      issues.push({
        category: 'formatting',
        severity: 'medium',
        description: 'Many lines exceed recommended length',
        impact: 'May cause formatting issues when parsed by ATS'
      });
      recommendations.push({
        category: 'formatting',
        priority: 'medium',
        title: 'Optimize Line Length',
        description: 'Keep lines under 100 characters for better ATS parsing',
        example: 'Break long sentences into multiple lines or bullet points'
      });
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Analyze section organization
   */
  private analyzeSectionOrganization(content: ResumeContent, sections: ParsedResumeSection[]): {
    score: number;
    issues: ATSIssue[];
    recommendations: ATSRecommendation[];
  } {
    const issues: ATSIssue[] = [];
    const recommendations: ATSRecommendation[] = [];
    let score = 100;

    // Check for required sections
    const presentSections = sections.map(s => s.sectionType);
    const missingSections = this.requiredSections.filter(section => 
      !presentSections.includes(section as any)
    );

    if (missingSections.length > 0) {
      score -= missingSections.length * 25;
      issues.push({
        category: 'organization',
        severity: 'high',
        description: `Missing required sections: ${missingSections.join(', ')}`,
        impact: 'ATS may not find key information, reducing match scores'
      });
      recommendations.push({
        category: 'organization',
        priority: 'high',
        title: 'Add Missing Sections',
        description: `Include all required sections: ${missingSections.join(', ')}`,
        example: 'Add a "Skills" section with relevant technical and soft skills'
      });
    }

    // Check for recommended sections
    const missingRecommendedSections = this.recommendedSections.filter(section => 
      !presentSections.includes(section as any)
    );

    if (missingRecommendedSections.length > 0) {
      score -= missingRecommendedSections.length * 5;
      recommendations.push({
        category: 'organization',
        priority: 'medium',
        title: 'Consider Adding Recommended Sections',
        description: `Consider adding: ${missingRecommendedSections.join(', ')}`,
        example: 'Add a "Summary" section to highlight key qualifications'
      });
    }

    // Check section order (contact should be first, experience should be early)
    const contactIndex = sections.findIndex(s => s.sectionType === 'contact');
    const experienceIndex = sections.findIndex(s => s.sectionType === 'experience');

    if (contactIndex !== 0) {
      score -= 10;
      issues.push({
        category: 'organization',
        severity: 'medium',
        description: 'Contact information is not at the top of the resume',
        impact: 'ATS may have difficulty locating contact information'
      });
      recommendations.push({
        category: 'organization',
        priority: 'medium',
        title: 'Move Contact Information to Top',
        description: 'Place contact information at the very beginning of your resume',
        example: 'Start with: Name, Phone, Email, LinkedIn, Location'
      });
    }

    if (experienceIndex > 2 && experienceIndex !== -1) {
      score -= 5;
      recommendations.push({
        category: 'organization',
        priority: 'low',
        title: 'Consider Moving Experience Section Earlier',
        description: 'Place work experience near the top after contact info and summary',
        example: 'Order: Contact → Summary → Experience → Education → Skills'
      });
    }

    // Check for section completeness
    if (content.sections.contactInfo && !content.sections.contactInfo.name) {
      score -= 15;
      issues.push({
        category: 'organization',
        severity: 'high',
        description: 'Name not found in contact information',
        impact: 'ATS cannot identify the candidate'
      });
      recommendations.push({
        category: 'organization',
        priority: 'high',
        title: 'Add Your Name',
        description: 'Ensure your full name is clearly visible at the top of the resume',
        example: 'John Smith (as the first line of your resume)'
      });
    }

    if (content.sections.contactInfo && !content.sections.contactInfo.email) {
      score -= 15;
      issues.push({
        category: 'organization',
        severity: 'high',
        description: 'Email address not found',
        impact: 'Recruiters cannot contact you'
      });
      recommendations.push({
        category: 'organization',
        priority: 'high',
        title: 'Add Email Address',
        description: 'Include a professional email address in your contact information',
        example: 'john.smith@email.com'
      });
    }

    if (content.sections.experience.length === 0) {
      score -= 20;
      issues.push({
        category: 'organization',
        severity: 'high',
        description: 'No work experience found',
        impact: 'ATS cannot assess relevant experience'
      });
      recommendations.push({
        category: 'organization',
        priority: 'high',
        title: 'Add Work Experience',
        description: 'Include relevant work experience with job titles, companies, and dates',
        example: 'Software Developer at Tech Company (2020-2023)'
      });
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Analyze readability
   */
  private analyzeReadability(content: ResumeContent): {
    score: number;
    issues: ATSIssue[];
    recommendations: ATSRecommendation[];
  } {
    const issues: ATSIssue[] = [];
    const recommendations: ATSRecommendation[] = [];
    let score = 100;

    // Check resume length
    const wordCount = content.rawText.split(/\s+/).length;
    const estimatedPages = wordCount / 250; // Rough estimate

    if (estimatedPages > this.maxResumeLength && wordCount > 0) {
      score -= 15;
      issues.push({
        category: 'readability',
        severity: 'medium',
        description: `Resume appears to be ${Math.ceil(estimatedPages)} pages, exceeding recommended ${this.maxResumeLength} pages`,
        impact: 'May overwhelm recruiters and ATS systems'
      });
      recommendations.push({
        category: 'readability',
        priority: 'medium',
        title: 'Reduce Resume Length',
        description: `Trim content to fit within ${this.maxResumeLength} pages`,
        example: 'Focus on most recent and relevant experience, remove outdated skills'
      });
    }

    // Check for adequate white space (inferred from line breaks)
    const lines = content.rawText.split('\n');
    const emptyLines = lines.filter(line => line.trim() === '').length;
    const whiteSpaceRatio = emptyLines / lines.length;

    if (whiteSpaceRatio < 0.1) {
      score -= 10;
      issues.push({
        category: 'readability',
        severity: 'medium',
        description: 'Insufficient white space detected',
        impact: 'Dense text is harder to read and may appear cluttered'
      });
      recommendations.push({
        category: 'readability',
        priority: 'medium',
        title: 'Add White Space',
        description: 'Add blank lines between sections and entries for better readability',
        example: 'Leave a blank line between each job entry'
      });
    }

    // Check experience descriptions length
    const shortDescriptions = content.sections.experience.filter(exp => 
      (exp.description?.length || 0) < this.minExperienceDescriptionLength
    );

    if (shortDescriptions.length > 0) {
      score -= shortDescriptions.length * 5;
      issues.push({
        category: 'readability',
        severity: 'medium',
        description: `${shortDescriptions.length} job(s) have insufficient description`,
        impact: 'ATS may not find enough keywords to match job requirements'
      });
      recommendations.push({
        category: 'readability',
        priority: 'medium',
        title: 'Expand Job Descriptions',
        description: 'Provide detailed descriptions for each role with specific achievements',
        example: 'Add 2-4 bullet points describing key responsibilities and accomplishments'
      });
    }

    // Check for action verbs in experience
    const actionVerbs = [
      'achieved', 'managed', 'led', 'developed', 'created', 'implemented', 'improved',
      'increased', 'reduced', 'optimized', 'designed', 'built', 'delivered', 'executed'
    ];

    let actionVerbCount = 0;
    const experienceText = content.sections.experience
      .map(exp => exp.description || '')
      .join(' ')
      .toLowerCase();

    actionVerbs.forEach(verb => {
      if (experienceText.includes(verb)) {
        actionVerbCount++;
      }
    });

    if (actionVerbCount < 3) {
      score -= 10;
      issues.push({
        category: 'readability',
        severity: 'medium',
        description: 'Limited use of strong action verbs',
        impact: 'Weak language may not effectively communicate achievements'
      });
      recommendations.push({
        category: 'readability',
        priority: 'medium',
        title: 'Use Strong Action Verbs',
        description: 'Start bullet points with powerful action verbs',
        example: 'Instead of "Was responsible for..." use "Managed team of 5 developers..."'
      });
    }

    // Check for quantifiable achievements
    const numberPattern = /\d+/g;
    const numbersInExperience = experienceText.match(numberPattern);
    const quantifiableCount = numbersInExperience ? numbersInExperience.length : 0;

    if (quantifiableCount < content.sections.experience.length) {
      score -= 10;
      recommendations.push({
        category: 'readability',
        priority: 'medium',
        title: 'Add Quantifiable Results',
        description: 'Include numbers, percentages, and metrics to demonstrate impact',
        example: 'Increased sales by 25% or Managed team of 8 people'
      });
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Analyze professional presentation
   */
  private analyzeProfessionalPresentation(content: ResumeContent): {
    score: number;
    issues: ATSIssue[];
    recommendations: ATSRecommendation[];
  } {
    const issues: ATSIssue[] = [];
    const recommendations: ATSRecommendation[] = [];
    let score = 100;

    // Check email professionalism
    const email = content.sections.contactInfo?.email;
    if (email) {
      const unprofessionalPatterns = [
        /\d{4,}/g, // Long numbers
        /(sexy|hot|cool|awesome|ninja|rockstar|guru)/i,
        /[._]{2,}/g, // Multiple dots or underscores
        /@(yahoo|hotmail|aol)/i // Less professional email providers
      ];

      let unprofessionalCount = 0;
      unprofessionalPatterns.forEach(pattern => {
        if (pattern.test(email)) {
          unprofessionalCount++;
        }
      });

      if (unprofessionalCount > 0) {
        score -= 15;
        issues.push({
          category: 'presentation',
          severity: 'medium',
          description: 'Email address may appear unprofessional',
          impact: 'May create negative first impression with recruiters'
        });
        recommendations.push({
          category: 'presentation',
          priority: 'medium',
          title: 'Use Professional Email',
          description: 'Use a simple, professional email format',
          example: 'firstname.lastname@gmail.com or firstnamelastname@gmail.com'
        });
      }
    }

    // Check for consistent date formatting
    const dates: string[] = [];
    content.sections.experience.forEach(exp => {
      if (exp.startDate) dates.push(exp.startDate);
      if (exp.endDate) dates.push(exp.endDate);
    });
    content.sections.education.forEach(edu => {
      if (edu.graduationDate) dates.push(edu.graduationDate);
    });

    const dateFormats = new Set();
    dates.forEach(date => {
      if (/^\d{4}$/.test(date)) dateFormats.add('year');
      if (/^\d{1,2}\/\d{4}$/.test(date)) dateFormats.add('month/year');
      if (/^\w+\s+\d{4}$/.test(date)) dateFormats.add('month year');
    });

    if (dateFormats.size > 1) {
      score -= 5;
      issues.push({
        category: 'presentation',
        severity: 'low',
        description: 'Inconsistent date formatting',
        impact: 'May appear careless and reduce professional appearance'
      });
      recommendations.push({
        category: 'presentation',
        priority: 'low',
        title: 'Standardize Date Format',
        description: 'Use consistent date format throughout the resume',
        example: 'Use MM/YYYY format: 01/2020 - 12/2022'
      });
    }

    // Check for appropriate capitalization
    const sections = [
      content.sections.contactInfo?.name,
      ...content.sections.experience.map(exp => exp.position),
      ...content.sections.experience.map(exp => exp.company),
      ...content.sections.education.map(edu => edu.degree),
      ...content.sections.education.map(edu => edu.institution)
    ].filter(Boolean);

    let capitalizationIssues = 0;
    sections.forEach(section => {
      if (section) {
        // Check for all caps (except for acronyms)
        if (section === section.toUpperCase() && section.length > 5) {
          capitalizationIssues++;
        }
        // Check for all lowercase
        if (section === section.toLowerCase() && section.length > 3) {
          capitalizationIssues++;
        }
      }
    });

    if (capitalizationIssues > 0) {
      score -= capitalizationIssues * 3;
      issues.push({
        category: 'presentation',
        severity: 'low',
        description: 'Inappropriate capitalization detected',
        impact: 'May appear unprofessional'
      });
      recommendations.push({
        category: 'presentation',
        priority: 'low',
        title: 'Fix Capitalization',
        description: 'Use proper title case for names, positions, and institutions',
        example: 'Software Developer instead of SOFTWARE DEVELOPER or software developer'
      });
    }

    // Check for skills organization
    if (content.sections.skills.length > 15) {
      score -= 5;
      recommendations.push({
        category: 'presentation',
        priority: 'low',
        title: 'Organize Skills Section',
        description: 'Group skills by category (Technical, Languages, etc.) for better presentation',
        example: 'Technical Skills: JavaScript, Python, React\nLanguages: English (Native), Spanish (Fluent)'
      });
    }

    // Check for LinkedIn profile
    if (!content.sections.contactInfo?.linkedin) {
      score -= 5;
      recommendations.push({
        category: 'presentation',
        priority: 'low',
        title: 'Add LinkedIn Profile',
        description: 'Include your LinkedIn profile URL in contact information',
        example: 'linkedin.com/in/yourname'
      });
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Calculate overall score from component scores
   */
  private calculateOverallScore(scores: number[]): number {
    const weights = [0.3, 0.3, 0.25, 0.15]; // formatting, organization, readability, presentation
    let weightedSum = 0;
    let totalWeight = 0;

    scores.forEach((score, index) => {
      const weight = weights[index] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Get ATS compatibility level based on score
   */
  getCompatibilityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Get priority recommendations based on issues
   */
  getPriorityRecommendations(recommendations: ATSRecommendation[]): ATSRecommendation[] {
    return recommendations
      .filter(rec => rec.priority === 'high')
      .slice(0, 5); // Top 5 priority recommendations
  }
}