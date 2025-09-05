import { JobDescriptionAnalysisService } from '../services/JobDescriptionAnalysisService';

describe('JobDescriptionAnalysisService', () => {
  let service: JobDescriptionAnalysisService;

  beforeEach(() => {
    service = new JobDescriptionAnalysisService();
  });

  describe('analyzeJobDescription', () => {
    it('should extract required and preferred skills correctly', async () => {
      const jobDescription = `
        We are looking for a Senior Software Engineer with the following requirements:
        
        Required Skills:
        - Must have 5+ years of experience with JavaScript and React
        - Python programming is essential
        - SQL database knowledge is mandatory
        
        Preferred Skills:
        - AWS experience would be nice to have
        - Docker knowledge is a plus
        - TypeScript experience is preferred
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      expect(result.requiredSkills).toContain('javascript');
      expect(result.requiredSkills).toContain('react');
      expect(result.requiredSkills).toContain('python');
      expect(result.requiredSkills).toContain('sql');

      expect(result.preferredSkills).toContain('aws');
      expect(result.preferredSkills).toContain('docker');
      expect(result.preferredSkills).toContain('typescript');
    });

    it('should extract experience level from years mentioned', async () => {
      const jobDescription1 = 'Looking for a developer with 1-2 years of experience';
      const jobDescription2 = 'Seeking a professional with 5+ years of experience';
      const jobDescription3 = 'Need someone with 8 years of experience';

      const result1 = await service.analyzeJobDescription(jobDescription1);
      const result2 = await service.analyzeJobDescription(jobDescription2);
      const result3 = await service.analyzeJobDescription(jobDescription3);

      expect(result1.experienceLevel).toBe('entry-level');
      expect(result2.experienceLevel).toBe('senior-level');
      expect(result3.experienceLevel).toBe('senior-level');
    });

    it('should extract experience level from keywords', async () => {
      const seniorJob = 'We are hiring a Senior Software Engineer';
      const juniorJob = 'Looking for a Junior Developer';
      const leadJob = 'Seeking a Lead Engineer';

      const seniorResult = await service.analyzeJobDescription(seniorJob);
      const juniorResult = await service.analyzeJobDescription(juniorJob);
      const leadResult = await service.analyzeJobDescription(leadJob);

      expect(seniorResult.experienceLevel).toBe('senior-level');
      expect(juniorResult.experienceLevel).toBe('entry-level');
      expect(leadResult.experienceLevel).toBe('senior-level');
    });

    it('should extract education requirements', async () => {
      const jobDescription = `
        Requirements:
        - Bachelor's degree in Computer Science or related field
        - Master's degree preferred
        - PhD in Machine Learning is a plus
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      expect(result.education).toContain('bachelor');
      expect(result.education).toContain('master');
      expect(result.education).toContain('phd');
      expect(result.education).toContain('computer science');
    });

    it('should extract certification requirements', async () => {
      const jobDescription = `
        Preferred certifications:
        - AWS Certified Solutions Architect
        - PMP certification
        - Scrum Master certification
        - Microsoft Certified Azure Developer
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      expect(result.certifications).toContain('aws certified');
      expect(result.certifications).toContain('pmp');
      expect(result.certifications).toContain('scrum master');
      expect(result.certifications).toContain('microsoft certified');
    });

    it('should extract general keywords', async () => {
      const jobDescription = `
        We are looking for a software engineer to join our development team.
        You will be responsible for building scalable applications using modern technologies.
        Experience with agile methodologies and cloud platforms is important.
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords).toContain('software');
      expect(result.keywords).toContain('development');
      expect(result.keywords).toContain('applications');
    });

    it('should handle empty job description', async () => {
      const result = await service.analyzeJobDescription('');

      expect(result.requiredSkills).toEqual([]);
      expect(result.preferredSkills).toEqual([]);
      expect(result.experienceLevel).toBe('not-specified');
      expect(result.education).toEqual([]);
      expect(result.certifications).toEqual([]);
      expect(result.keywords).toEqual([]);
    });
  });

  describe('parseQualificationSections', () => {
    it('should parse structured job description with sections', async () => {
      const jobDescription = `
        Job Title: Senior Software Engineer
        
        Responsibilities:
        • Design and develop scalable web applications
        • Collaborate with cross-functional teams
        • Mentor junior developers
        
        Required Qualifications:
        • 5+ years of software development experience
        • Proficiency in JavaScript and React
        • Experience with RESTful APIs
        
        Preferred Qualifications:
        • AWS cloud experience
        • Docker containerization knowledge
        • Agile development experience
      `;

      const result = await service.parseQualificationSections(jobDescription);

      expect(result.responsibilities).toHaveLength(3);
      expect(result.responsibilities[0]).toContain('Design and develop scalable web applications');
      
      expect(result.requiredQualifications).toHaveLength(3);
      expect(result.requiredQualifications[0]).toContain('5+ years of software development experience');
      
      expect(result.preferredQualifications).toHaveLength(3);
      expect(result.preferredQualifications[0]).toContain('AWS cloud experience');
    });

    it('should handle job description without clear sections', async () => {
      const jobDescription = `
        We are looking for a developer. You should know JavaScript.
        Experience with React is important. AWS knowledge is nice to have.
      `;

      const result = await service.parseQualificationSections(jobDescription);

      expect(result.responsibilities).toEqual([]);
      expect(result.requiredQualifications).toEqual([]);
      expect(result.preferredQualifications).toEqual([]);
    });
  });

  describe('extractCompensationInfo', () => {
    it('should extract salary range', async () => {
      const jobDescription1 = 'Salary: $80,000 - $120,000 per year';
      const jobDescription2 = 'Compensation: 90000 - 130000 USD annually';

      const result1 = service.extractCompensationInfo(jobDescription1);
      const result2 = service.extractCompensationInfo(jobDescription2);

      expect(result1.salaryRange).toEqual({ min: 80000, max: 120000 });
      expect(result1.currency).toBe('USD');

      expect(result2.salaryRange).toEqual({ min: 90000, max: 130000 });
      expect(result2.currency).toBe('USD');
    });

    it('should extract benefits', async () => {
      const jobDescription = `
        Benefits include:
        - Health insurance
        - Dental and vision coverage
        - 401k retirement plan
        - Flexible schedule
        - Remote work options
        - Stock options
        - Gym membership
      `;

      const result = service.extractCompensationInfo(jobDescription);

      expect(result.benefits).toContain('health insurance');
      expect(result.benefits).toContain('dental');
      expect(result.benefits).toContain('vision');
      expect(result.benefits).toContain('401k');
      expect(result.benefits).toContain('flexible schedule');
      expect(result.benefits).toContain('remote work');
      expect(result.benefits).toContain('stock options');
      expect(result.benefits).toContain('gym membership');
    });

    it('should handle job description without compensation info', async () => {
      const jobDescription = 'We are looking for a great developer to join our team.';

      const result = service.extractCompensationInfo(jobDescription);

      expect(result.salaryRange).toBeUndefined();
      expect(result.currency).toBeUndefined();
      expect(result.benefits).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle job description with mixed case', async () => {
      const jobDescription = `
        REQUIRED SKILLS:
        - JAVASCRIPT and REACT experience
        - Python Programming
        
        preferred qualifications:
        - aws knowledge
        - docker experience
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      expect(result.requiredSkills).toContain('javascript');
      expect(result.requiredSkills).toContain('react');
      expect(result.requiredSkills).toContain('python');
      expect(result.preferredSkills).toContain('aws');
      expect(result.preferredSkills).toContain('docker');
    });

    it('should handle job description with special characters', async () => {
      const jobDescription = `
        Skills needed: JavaScript/TypeScript, React.js, Node.js
        Experience: 3-5 years
        Education: B.S. in Computer Science
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      expect(result.requiredSkills).toContain('javascript');
      expect(result.requiredSkills).toContain('typescript');
      expect(result.requiredSkills).toContain('react');
      expect(result.experienceLevel).toBe('mid-level');
      expect(result.education).toContain('computer science');
    });

    it('should remove duplicate skills', async () => {
      const jobDescription = `
        Required: JavaScript, React, JavaScript programming
        Must have: React experience, JavaScript knowledge
      `;

      const result = await service.analyzeJobDescription(jobDescription);

      const jsCount = result.requiredSkills.filter(skill => skill === 'javascript').length;
      const reactCount = result.requiredSkills.filter(skill => skill === 'react').length;

      expect(jsCount).toBe(1);
      expect(reactCount).toBe(1);
    });
  });
});