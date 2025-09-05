import nlp from 'compromise';
import { JobRequirements } from '@/types/database';

/**
 * Service for analyzing job descriptions and extracting requirements
 */
export class JobDescriptionAnalysisService {
  private readonly skillKeywords: Set<string>;
  private readonly experienceLevels: Map<string, string>;
  private readonly educationKeywords: Set<string>;
  private readonly certificationKeywords: Set<string>;
  private readonly requirementIndicators: {
    required: string[];
    preferred: string[];
  };

  constructor() {
    // Initialize skill keywords (common technical and soft skills)
    this.skillKeywords = new Set([
      // Programming languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
      'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css',
      
      // Frameworks and libraries
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
      'rails', 'asp.net', 'jquery', 'bootstrap', 'tailwind',
      
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite',
      
      // Cloud and DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github', 'gitlab',
      'terraform', 'ansible', 'chef', 'puppet',
      
      // Soft skills
      'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical', 'creative',
      'adaptable', 'organized', 'detail-oriented', 'time-management', 'collaboration',
      
      // Business skills
      'project-management', 'agile', 'scrum', 'kanban', 'waterfall', 'lean', 'six-sigma',
      'data-analysis', 'machine-learning', 'artificial-intelligence', 'blockchain'
    ]);

    // Experience level mapping
    this.experienceLevels = new Map([
      ['entry', 'entry-level'],
      ['junior', 'entry-level'],
      ['associate', 'entry-level'],
      ['mid', 'mid-level'],
      ['intermediate', 'mid-level'],
      ['senior', 'senior-level'],
      ['lead', 'senior-level'],
      ['principal', 'senior-level'],
      ['staff', 'senior-level'],
      ['manager', 'management'],
      ['director', 'management'],
      ['vp', 'executive'],
      ['vice president', 'executive'],
      ['cto', 'executive'],
      ['ceo', 'executive']
    ]);

    // Education keywords
    this.educationKeywords = new Set([
      'bachelor', 'bachelors', 'bs', 'ba', 'bsc', 'beng',
      'master', 'masters', 'ms', 'ma', 'msc', 'meng', 'mba',
      'phd', 'doctorate', 'doctoral',
      'associate', 'diploma', 'certificate',
      'computer science', 'engineering', 'mathematics', 'physics',
      'business', 'marketing', 'finance', 'accounting'
    ]);

    // Certification keywords
    this.certificationKeywords = new Set([
      'aws certified', 'azure certified', 'google cloud certified',
      'pmp', 'scrum master', 'cissp', 'cisa', 'cism',
      'comptia', 'cisco', 'microsoft certified', 'oracle certified',
      'salesforce certified', 'tableau certified'
    ]);

    // Requirement indicators
    this.requirementIndicators = {
      required: [
        'required', 'must have', 'essential', 'mandatory', 'necessary',
        'minimum', 'at least', 'should have', 'need', 'needs'
      ],
      preferred: [
        'preferred', 'nice to have', 'bonus', 'plus', 'advantage',
        'desirable', 'ideal', 'would be great', 'additional'
      ]
    };
  }

  /**
   * Analyze job description and extract structured requirements
   */
  async analyzeJobDescription(content: string): Promise<JobRequirements> {
    const doc = nlp(content.toLowerCase());
    
    const requirements: JobRequirements = {
      requiredSkills: [],
      preferredSkills: [],
      experienceLevel: 'not-specified',
      education: [],
      certifications: [],
      keywords: []
    };

    // Extract skills
    const { requiredSkills, preferredSkills } = this.extractSkills(content);
    requirements.requiredSkills = requiredSkills;
    requirements.preferredSkills = preferredSkills;

    // Extract experience level
    requirements.experienceLevel = this.extractExperienceLevel(content);

    // Extract education requirements
    requirements.education = this.extractEducationRequirements(content);

    // Extract certifications
    requirements.certifications = this.extractCertifications(content);

    // Extract general keywords
    requirements.keywords = this.extractKeywords(doc);

    return requirements;
  }

  /**
   * Extract skills and categorize as required or preferred
   */
  private extractSkills(content: string): { requiredSkills: string[]; preferredSkills: string[] } {
    const requiredSkills: string[] = [];
    const preferredSkills: string[] = [];
    
    const sentences = content.toLowerCase().split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const isRequired = this.requirementIndicators.required.some(indicator => 
        sentence.includes(indicator)
      );
      const isPreferred = this.requirementIndicators.preferred.some(indicator => 
        sentence.includes(indicator)
      );

      // Find skills in the sentence
      const foundSkills = Array.from(this.skillKeywords).filter(skill => 
        sentence.includes(skill)
      );

      if (isRequired && !isPreferred) {
        requiredSkills.push(...foundSkills);
      } else if (isPreferred) {
        preferredSkills.push(...foundSkills);
      } else {
        // Default to required if no clear indicator
        requiredSkills.push(...foundSkills);
      }
    }

    return {
      requiredSkills: [...new Set(requiredSkills)], // Remove duplicates
      preferredSkills: [...new Set(preferredSkills)]
    };
  }

  /**
   * Extract experience level from job description
   */
  private extractExperienceLevel(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // Look for explicit year mentions
    const yearMatches = lowerContent.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/g);
    if (yearMatches) {
      const years = parseInt(yearMatches[0].match(/\d+/)?.[0] || '0');
      if (years <= 2) return 'entry-level';
      if (years <= 5) return 'mid-level';
      return 'senior-level';
    }

    // Look for level keywords
    for (const [keyword, level] of this.experienceLevels) {
      if (lowerContent.includes(keyword)) {
        return level;
      }
    }

    return 'not-specified';
  }

  /**
   * Extract education requirements
   */
  private extractEducationRequirements(content: string): string[] {
    const education: string[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const keyword of this.educationKeywords) {
      if (lowerContent.includes(keyword)) {
        education.push(keyword);
      }
    }

    return [...new Set(education)];
  }

  /**
   * Extract certification requirements
   */
  private extractCertifications(content: string): string[] {
    const certifications: string[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const keyword of this.certificationKeywords) {
      if (lowerContent.includes(keyword)) {
        certifications.push(keyword);
      }
    }

    return [...new Set(certifications)];
  }

  /**
   * Extract general keywords using NLP
   */
  private extractKeywords(doc: any): string[] {
    const keywords: string[] = [];
    
    // Extract nouns (potential skills/technologies)
    const nouns = doc.nouns().out('array');
    keywords.push(...nouns.filter((noun: string) => noun.length > 2));
    
    // Extract verbs (potential actions/responsibilities)
    const verbs = doc.verbs().out('array');
    keywords.push(...verbs.filter((verb: string) => verb.length > 3));
    
    // Extract organizations and places
    const organizations = doc.organizations().out('array');
    keywords.push(...organizations);
    
    // Remove duplicates and filter out common words
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const uniqueKeywords = [...new Set(keywords)]
      .filter(keyword => !commonWords.has(keyword.toLowerCase()))
      .filter(keyword => keyword.length > 2)
      .slice(0, 50); // Limit to top 50 keywords
    
    return uniqueKeywords;
  }

  /**
   * Parse job description and identify qualification sections
   */
  async parseQualificationSections(content: string): Promise<{
    requiredQualifications: string[];
    preferredQualifications: string[];
    responsibilities: string[];
  }> {
    const sections = {
      requiredQualifications: [] as string[],
      preferredQualifications: [] as string[],
      responsibilities: [] as string[]
    };

    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection: keyof typeof sections | null = null;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Identify section headers
      if (lowerLine.includes('required') && (lowerLine.includes('qualification') || lowerLine.includes('skill'))) {
        currentSection = 'requiredQualifications';
        continue;
      } else if (lowerLine.includes('preferred') || lowerLine.includes('nice to have') || lowerLine.includes('bonus')) {
        currentSection = 'preferredQualifications';
        continue;
      } else if (lowerLine.includes('responsibilit') || lowerLine.includes('duties') || lowerLine.includes('role')) {
        currentSection = 'responsibilities';
        continue;
      }
      
      // Add content to current section
      if (currentSection && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line))) {
        const cleanLine = line.replace(/^[•\-*\d\.]\s*/, '').trim();
        if (cleanLine.length > 10) { // Filter out very short items
          sections[currentSection].push(cleanLine);
        }
      }
    }

    return sections;
  }

  /**
   * Extract salary and benefits information
   */
  extractCompensationInfo(content: string): {
    salaryRange?: { min?: number; max?: number };
    currency?: string;
    benefits: string[];
  } {
    const benefits: string[] = [];
    let salaryRange: { min?: number; max?: number } | undefined;
    let currency: string | undefined;

    const lowerContent = content.toLowerCase();

    // Extract salary information
    const salaryPatterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)\s*(?:usd|dollars?)/g
    ];

    for (const pattern of salaryPatterns) {
      const match = pattern.exec(lowerContent);
      if (match) {
        const min = parseInt(match[1].replace(/[,$]/g, ''));
        const max = parseInt(match[2].replace(/[,$]/g, ''));
        salaryRange = { min, max };
        currency = 'USD';
        break;
      }
    }

    // Extract benefits
    const benefitKeywords = [
      'health insurance', 'dental', 'vision', '401k', 'retirement',
      'vacation', 'pto', 'paid time off', 'flexible schedule',
      'remote work', 'work from home', 'stock options', 'equity',
      'bonus', 'gym membership', 'learning budget', 'conference'
    ];

    for (const benefit of benefitKeywords) {
      if (lowerContent.includes(benefit)) {
        benefits.push(benefit);
      }
    }

    return {
      salaryRange,
      currency,
      benefits: [...new Set(benefits)]
    };
  }
}