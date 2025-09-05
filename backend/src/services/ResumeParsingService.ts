import { ContactInfo, WorkExperience, Education, Certification, ResumeContent } from '../types/database';

export interface ParsedResumeSection {
  sectionType: 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'unknown';
  content: string;
  startIndex: number;
  endIndex: number;
}

export class ResumeParsingService {
  private readonly sectionKeywords = {
    contact: ['contact', 'personal information', 'personal details'],
    summary: ['summary', 'profile', 'objective', 'about', 'overview'],
    experience: ['experience', 'work experience', 'employment', 'work history', 'professional experience', 'career'],
    education: ['education', 'academic', 'qualifications', 'degrees'],
    skills: ['skills', 'technical skills', 'competencies', 'technologies', 'expertise'],
    certifications: ['certifications', 'certificates', 'licenses', 'credentials']
  };

  private readonly emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private readonly phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  private readonly linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+/g;
  private readonly websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;

  /**
   * Parse resume content into structured sections
   */
  parseResumeContent(rawText: string): ResumeContent {
    const sections = this.detectSections(rawText);
    
    return {
      rawText,
      sections: {
        contactInfo: this.extractContactInfo(rawText, sections),
        summary: this.extractSummary(sections),
        experience: this.extractWorkExperience(sections),
        education: this.extractEducation(sections),
        skills: this.extractSkills(sections),
        certifications: this.extractCertifications(sections)
      }
    };
  }

  /**
   * Detect and categorize resume sections
   */
  private detectSections(text: string): ParsedResumeSection[] {
    const lines = text.split('\n');
    const sections: ParsedResumeSection[] = [];
    let currentSection: ParsedResumeSection | null = null;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      const lineStartIndex = currentIndex;
      currentIndex += (lines[i]?.length || 0) + 1; // +1 for newline

      if (line.length === 0) continue;

      const detectedSectionType = this.detectSectionType(line);
      
      if (detectedSectionType !== 'unknown') {
        // Save previous section
        if (currentSection) {
          currentSection.endIndex = lineStartIndex - 1;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          sectionType: detectedSectionType,
          content: line,
          startIndex: lineStartIndex,
          endIndex: currentIndex - 1
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += '\n' + line;
        currentSection.endIndex = currentIndex - 1;
      } else {
        // No section detected yet, treat as contact/header info
        currentSection = {
          sectionType: 'contact',
          content: line,
          startIndex: lineStartIndex,
          endIndex: currentIndex - 1
        };
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Detect section type based on line content
   */
  private detectSectionType(line: string): ParsedResumeSection['sectionType'] {
    const lowerLine = line.toLowerCase().trim();
    
    // First check if the line matches section keywords directly
    for (const [sectionType, keywords] of Object.entries(this.sectionKeywords)) {
      if (keywords.some(keyword => lowerLine === keyword || lowerLine.includes(keyword))) {
        return sectionType as ParsedResumeSection['sectionType'];
      }
    }
    
    // Check if line is likely a section header (short, uppercase, or contains keywords)
    const isLikelyHeader = line.length < 50 && (
      line === line.toUpperCase() || 
      line === line.toLowerCase() ||  // Also consider all lowercase as headers
      line.includes(':') ||
      /^[A-Z][A-Z\s]+$/.test(line) ||
      /^[a-z][a-z\s]+$/.test(line)   // All lowercase pattern
    );

    if (isLikelyHeader) {
      // Re-check keywords for likely headers
      for (const [sectionType, keywords] of Object.entries(this.sectionKeywords)) {
        if (keywords.some(keyword => lowerLine.includes(keyword))) {
          return sectionType as ParsedResumeSection['sectionType'];
        }
      }
    }

    return 'unknown';
  }

  /**
   * Extract contact information from resume text
   */
  private extractContactInfo(text: string, sections: ParsedResumeSection[]): ContactInfo {
    // Look for contact info in the first few lines and contact sections
    const contactText = sections
      .filter(s => s.sectionType === 'contact')
      .map(s => s.content)
      .join('\n') || text.substring(0, 500); // First 500 chars if no contact section

    const contactInfo: ContactInfo = {};

    // Extract name (usually first line or first non-empty line)
    const lines = contactText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0]?.trim() || '';
      // Check if first line looks like a name (not email, phone, or URL)
      if (!this.emailRegex.test(firstLine) && 
          !this.phoneRegex.test(firstLine) && 
          !this.websiteRegex.test(firstLine) &&
          firstLine.length < 50) {
        contactInfo.name = firstLine;
      }
    }

    // Extract email
    const emailMatches = contactText.match(this.emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      contactInfo.email = emailMatches[0];
    }

    // Extract phone
    const phoneMatches = contactText.match(this.phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      contactInfo.phone = phoneMatches[0];
    }

    // Extract LinkedIn
    const linkedinMatches = contactText.match(this.linkedinRegex);
    if (linkedinMatches && linkedinMatches.length > 0) {
      contactInfo.linkedin = linkedinMatches[0];
    }

    // Extract website (excluding LinkedIn and email domains)
    const websiteMatches = contactText.match(this.websiteRegex);
    if (websiteMatches && websiteMatches.length > 0) {
      const website = websiteMatches.find(url => 
        !url.includes('linkedin.com') && 
        !url.includes('@') &&
        !url.includes('mailto:') &&
        url.includes('.') &&
        (url.startsWith('www.') || url.startsWith('http'))
      );
      if (website) {
        contactInfo.website = website;
      }
    }

    // Extract address (look for patterns like city, state or full addresses)
    const addressPattern = /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})|([A-Za-z\s]+,\s*[A-Za-z\s]+)/g;
    const addressMatches = contactText.match(addressPattern);
    if (addressMatches && addressMatches.length > 0) {
      // Filter out matches that are part of URLs or emails
      const validAddress = addressMatches.find(addr => 
        !addr.includes('.com') && 
        !addr.includes('.org') && 
        !addr.includes('.net') &&
        !addr.includes('@')
      );
      if (validAddress) {
        contactInfo.address = validAddress;
      }
    }

    return contactInfo;
  }

  /**
   * Extract summary/objective section
   */
  private extractSummary(sections: ParsedResumeSection[]): string | undefined {
    const summarySection = sections.find(s => s.sectionType === 'summary');
    if (summarySection) {
      // Remove the header line and return the content
      const lines = summarySection.content.split('\n');
      const contentLines = lines.slice(1).filter(line => line.trim().length > 0);
      return contentLines.join('\n').trim() || undefined;
    }
    return undefined;
  }

  /**
   * Extract work experience entries
   */
  private extractWorkExperience(sections: ParsedResumeSection[]): WorkExperience[] {
    const experienceSections = sections.filter(s => s.sectionType === 'experience');
    const experiences: WorkExperience[] = [];

    for (const section of experienceSections) {
      const sectionExperiences = this.parseExperienceSection(section.content);
      experiences.push(...sectionExperiences);
    }

    return experiences;
  }

  /**
   * Parse individual experience section
   */
  private parseExperienceSection(content: string): WorkExperience[] {
    const experiences: WorkExperience[] = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    let currentExperience: Partial<WorkExperience> | null = null;
    let descriptionLines: string[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header line
      const line = lines[i]?.trim() || '';
      
      // Check if this line looks like a job title/company line
      if (this.looksLikeJobHeader(line)) {
        // Save previous experience
        if (currentExperience) {
          currentExperience.description = descriptionLines.join('\n').trim();
          currentExperience.achievements = this.extractAchievements(descriptionLines);
          experiences.push(currentExperience as WorkExperience);
        }

        // Parse new job header
        const jobInfo = this.parseJobHeader(line);
        currentExperience = jobInfo;
        descriptionLines = [];
      } else {
        // Add to description
        descriptionLines.push(line);
      }
    }

    // Add final experience
    if (currentExperience) {
      currentExperience.description = descriptionLines.join('\n').trim();
      currentExperience.achievements = this.extractAchievements(descriptionLines);
      experiences.push(currentExperience as WorkExperience);
    }

    return experiences;
  }

  /**
   * Check if line looks like a job header (title at company)
   */
  private looksLikeJobHeader(line: string): boolean {
    // Look for patterns like "Title at Company" or "Title, Company" or dates
    return /\bat\b|\b@\b|,|\d{4}/.test(line) && 
           line.length < 100 && 
           !line.startsWith('-') && 
           !line.startsWith('•');
  }

  /**
   * Parse job header to extract position, company, and dates
   */
  private parseJobHeader(line: string): Partial<WorkExperience> {
    const experience: Partial<WorkExperience> = {};
    
    // Extract dates first
    const datePattern = /(\d{4})\s*[-–]\s*(\d{4}|present|current)/gi;
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const dates = dateMatch[0].split(/[-–]/);
      experience.startDate = dates[0]?.trim() || '';
      const endDateStr = dates[1]?.trim().toLowerCase();
      experience.endDate = endDateStr === 'present' || endDateStr === 'current' ? 
                          undefined : dates[1]?.trim();
    }

    // Remove dates from line for further parsing
    let lineWithoutDates = line.replace(datePattern, '').trim();
    // Also remove parentheses that might contain dates
    lineWithoutDates = lineWithoutDates.replace(/\([^)]*\)/g, '').trim();
    
    // Try to split by common separators
    if (lineWithoutDates.includes(' at ')) {
      const parts = lineWithoutDates.split(' at ');
      experience.position = parts[0]?.trim() || '';
      experience.company = parts[1]?.trim() || 'Unknown';
    } else if (lineWithoutDates.includes(' @ ')) {
      const parts = lineWithoutDates.split(' @ ');
      experience.position = parts[0]?.trim() || '';
      experience.company = parts[1]?.trim() || 'Unknown';
    } else if (lineWithoutDates.includes(', ')) {
      const parts = lineWithoutDates.split(', ');
      experience.position = parts[0]?.trim() || '';
      experience.company = parts[1]?.trim() || 'Unknown';
    } else {
      // Fallback: assume entire line is position
      experience.position = lineWithoutDates;
      experience.company = 'Unknown';
    }

    return experience;
  }

  /**
   * Extract achievements from description lines
   */
  private extractAchievements(lines: string[]): string[] {
    return lines
      .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  /**
   * Extract education entries
   */
  private extractEducation(sections: ParsedResumeSection[]): Education[] {
    const educationSections = sections.filter(s => s.sectionType === 'education');
    const educationEntries: Education[] = [];

    for (const section of educationSections) {
      const entries = this.parseEducationSection(section.content);
      educationEntries.push(...entries);
    }

    return educationEntries;
  }

  /**
   * Parse education section
   */
  private parseEducationSection(content: string): Education[] {
    const entries: Education[] = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i]?.trim() || '';
      if (line.length === 0) continue;

      const education = this.parseEducationLine(line);
      if (education) {
        entries.push(education);
      }
    }

    return entries;
  }

  /**
   * Parse individual education line
   */
  private parseEducationLine(line: string): Education | null {
    // Look for degree patterns
    const degreePattern = /(bachelor|master|phd|doctorate|associate|diploma|certificate)/i;
    const yearPattern = /\b(19|20)\d{2}\b/g;
    
    if (!degreePattern.test(line)) {
      return null;
    }

    const education: Partial<Education> = {};
    
    // Extract year
    const yearMatches = line.match(yearPattern);
    if (yearMatches) {
      education.graduationDate = yearMatches[yearMatches.length - 1]; // Take last year
    }

    // Remove year from line for parsing
    let lineWithoutYear = line.replace(yearPattern, '').trim();
    // Remove parentheses that might contain years
    lineWithoutYear = lineWithoutYear.replace(/\([^)]*\)/g, '').trim();
    
    // Try to parse degree and institution
    const parts = lineWithoutYear.split(/,|\bat\b|\bfrom\b/i);
    if (parts.length >= 2) {
      education.degree = parts[0]?.trim() || '';
      education.institution = parts[1]?.trim() || '';
      
      // Try to extract field from degree
      const fieldMatch = education.degree.match(/in\s+(.+)/i);
      if (fieldMatch) {
        education.field = fieldMatch[1]?.trim() || '';
        education.degree = education.degree.replace(/\s+in\s+.+/i, '').trim();
      }
    } else {
      education.degree = lineWithoutYear;
      education.institution = 'Unknown';
    }

    return {
      institution: education.institution || 'Unknown',
      degree: education.degree || 'Unknown',
      field: education.field || 'Unknown',
      graduationDate: education.graduationDate || undefined
    };
  }

  /**
   * Extract skills from skills sections
   */
  private extractSkills(sections: ParsedResumeSection[]): string[] {
    const skillsSections = sections.filter(s => s.sectionType === 'skills');
    const skills: string[] = [];

    for (const section of skillsSections) {
      const sectionSkills = this.parseSkillsSection(section.content);
      skills.push(...sectionSkills);
    }

    // Remove duplicates and return
    return [...new Set(skills)];
  }

  /**
   * Parse skills section
   */
  private parseSkillsSection(content: string): string[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const skills: string[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i]?.trim() || '';
      
      // Handle colon-separated format (e.g., "Programming: JavaScript, Python")
      if (line.includes(':')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          const skillsPart = parts[1]?.trim() || '';
          const lineSkills = skillsPart
            .split(/[,;|•\-]/)
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0 && skill.length < 50);
          skills.push(...lineSkills);
        }
      } else {
        // Split by common separators
        const lineSkills = line
          .split(/[,;|•\-]/)
          .map(skill => skill.trim())
          .filter(skill => skill.length > 0 && skill.length < 50);
        
        skills.push(...lineSkills);
      }
    }

    return skills;
  }

  /**
   * Extract certifications
   */
  private extractCertifications(sections: ParsedResumeSection[]): Certification[] {
    const certificationSections = sections.filter(s => s.sectionType === 'certifications');
    const certifications: Certification[] = [];

    for (const section of certificationSections) {
      const sectionCertifications = this.parseCertificationsSection(section.content);
      certifications.push(...sectionCertifications);
    }

    return certifications;
  }

  /**
   * Parse certifications section
   */
  private parseCertificationsSection(content: string): Certification[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const certifications: Certification[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i]?.trim() || '';
      if (line.length === 0) continue;

      const certification = this.parseCertificationLine(line);
      if (certification) {
        certifications.push(certification);
      }
    }

    return certifications;
  }

  /**
   * Parse individual certification line
   */
  private parseCertificationLine(line: string): Certification | null {
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const certification: Partial<Certification> = {};

    // Extract date
    const yearMatches = line.match(yearPattern);
    if (yearMatches) {
      certification.date = yearMatches[0];
    }

    // Remove year from line for parsing
    let lineWithoutYear = line.replace(yearPattern, '').trim();
    // Remove parentheses that might contain years
    lineWithoutYear = lineWithoutYear.replace(/\([^)]*\)/g, '').trim();
    
    // Try to parse name and issuer
    const parts = lineWithoutYear.split(/,|\bby\b|\bfrom\b/i);
    if (parts.length >= 2) {
      certification.name = parts[0]?.trim() || '';
      certification.issuer = parts[1]?.trim() || '';
    } else {
      certification.name = lineWithoutYear;
      certification.issuer = 'Unknown';
    }

    return {
      name: certification.name || 'Unknown',
      issuer: certification.issuer || 'Unknown',
      date: certification.date || undefined
    };
  }

  /**
   * Extract keywords and important terms from resume
   */
  extractKeywords(content: ResumeContent): string[] {
    const keywords: string[] = [];
    
    // Add skills
    keywords.push(...content.sections.skills);
    
    // Add job titles
    content.sections.experience.forEach(exp => {
      if (exp.position) {
        keywords.push(exp.position);
      }
    });
    
    // Add company names
    content.sections.experience.forEach(exp => {
      if (exp.company && exp.company !== 'Unknown') {
        keywords.push(exp.company);
      }
    });
    
    // Add education fields
    content.sections.education.forEach(edu => {
      if (edu.field && edu.field !== 'Unknown') {
        keywords.push(edu.field);
      }
    });
    
    // Add certification names
    content.sections.certifications.forEach(cert => {
      if (cert.name && cert.name !== 'Unknown') {
        keywords.push(cert.name);
      }
    });

    // Remove duplicates and return
    return [...new Set(keywords)];
  }
}