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
    
    const lowerContent = content.toLowerCase();
    const lines = lowerContent.split(/\n/);
    
    let currentSection: 'required' | 'preferred' | 'none' = 'none';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) continue;

      // Check for section headers (only at the beginning of lines, not in bullet points)
      if (/^required\s*(skills|qualifications)|^essential|^mandatory/.test(trimmedLine)) {
        currentSection = 'required';
        continue;
      } else if (/^preferred\s*(skills|qualifications)|^nice\s*to\s*have|^bonus|^plus|^ideal|^desirable/.test(trimmedLine)) {
        currentSection = 'preferred';
        continue;
      }

      // Find skills in the line - use simple includes for better matching
      const foundSkills = Array.from(this.skillKeywords).filter(skill => {
        if (skill.length < 3) return false; // Skip very short skills
        
        // Simple case-insensitive matching
        return trimmedLine.includes(skill.toLowerCase());
      });

      if (foundSkills.length > 0) {
        // Check for inline indicators
        const hasRequiredIndicator = this.requirementIndicators.required.some(indicator => 
          trimmedLine.includes(indicator)
        );
        const hasPreferredIndicator = this.requirementIndicators.preferred.some(indicator => 
          trimmedLine.includes(indicator)
        );

        if (hasPreferredIndicator || currentSection === 'preferred') {
          preferredSkills.push(...foundSkills);
        } else if (hasRequiredIndicator || currentSection === 'required') {
          requiredSkills.push(...foundSkills);
        } else {
          // Default to required if no clear section context
          requiredSkills.push(...foundSkills);
        }
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
    
    // Look for explicit year mentions with various patterns
    const yearPatterns = [
      /(\d+)\s*-\s*(\d+)\s*years?\s*(of\s*)?(experience|exp)/g,
      /(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/g,
      /(\d+)\+\s*years/g,
      /experience:\s*(\d+)\s*-\s*(\d+)\s*years/g
    ];

    for (const pattern of yearPatterns) {
      const matches = Array.from(lowerContent.matchAll(pattern));
      if (matches.length > 0) {
        const match = matches[0];
        if (!match) continue;
        
        let years = 0;
        
        if (match[2] && match[1] && !isNaN(parseInt(match[2])) && !isNaN(parseInt(match[1]))) {
          // Range pattern (e.g., "3-5 years") - use the average for classification
          const min = parseInt(match[1]);
          const max = parseInt(match[2]);
          years = Math.floor((min + max) / 2);
        } else if (match[1] && !isNaN(parseInt(match[1]))) {
          // Single number pattern (e.g., "5+ years")
          years = parseInt(match[1]);
        }
        
        if (years > 0) {
          if (years <= 2) return 'entry-level';
          if (years < 5) return 'mid-level';
          return 'senior-level';
        }
      }
    }

    // Look for level keywords with word boundaries
    for (const [keyword, level] of this.experienceLevels) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerContent)) {
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
    
    // Extract individual words from compound phrases
    const allWords = doc.out('array');
    for (const word of allWords) {
      if (typeof word === 'string' && word.length > 3) {
        // Split compound words and phrases
        const individualWords = word.split(/[\s\-_\.]+/).filter(w => w.length > 2);
        keywords.push(...individualWords);
      }
    }
    
    // Remove duplicates and filter out common words
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'are', 'is', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
      'this', 'that', 'these', 'those', 'our', 'your', 'their', 'we', 'you', 'they'
    ]);
    
    const uniqueKeywords = [...new Set(keywords)]
      .filter(keyword => typeof keyword === 'string')
      .filter(keyword => !commonWords.has(keyword.toLowerCase()))
      .filter(keyword => keyword.length > 2)
      .filter(keyword => /^[a-zA-Z]/.test(keyword)) // Start with letter
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
      /salary:\s*\$?(\d{1,6}(?:,\d{3})*)\s*-\s*\$?(\d{1,6}(?:,\d{3})*)/gi,
      /compensation:\s*\$?(\d{1,6}(?:,\d{3})*)\s*-\s*\$?(\d{1,6}(?:,\d{3})*)/gi,
      /(\d{1,6}(?:,\d{3})*)\s*-\s*(\d{1,6}(?:,\d{3})*)\s*(?:usd|dollars?)/gi
    ];

    for (const pattern of salaryPatterns) {
      const match = pattern.exec(lowerContent);
      if (match && match[1] && match[2]) {
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

    const result: {
      salaryRange?: { min?: number; max?: number };
      currency?: string;
      benefits: string[];
    } = {
      benefits: [...new Set(benefits)]
    };

    if (salaryRange) {
      result.salaryRange = salaryRange;
    }
    if (currency) {
      result.currency = currency;
    }

    return result;
  }
}