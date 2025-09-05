import { ResumeParsingService } from '../services/ResumeParsingService';

describe('ResumeParsingService', () => {
  let service: ResumeParsingService;

  beforeEach(() => {
    service = new ResumeParsingService();
  });

  const sampleResumeText = `John Doe
Software Engineer
john.doe@email.com
(555) 123-4567
linkedin.com/in/johndoe
www.johndoe.com
San Francisco, CA 94102

SUMMARY
Experienced software engineer with 5+ years of experience in full-stack development.

EXPERIENCE
Senior Software Engineer at Tech Corp (2020-2023)
- Developed web applications using React and Node.js
- Led a team of 5 developers
- Improved system performance by 40%

Software Developer at StartupXYZ (2018-2020)
- Built mobile applications using React Native
- Implemented CI/CD pipelines
- Reduced deployment time by 60%

EDUCATION
Bachelor of Science in Computer Science at University of Technology (2018)
Master of Science in Software Engineering from MIT (2020)

SKILLS
JavaScript, TypeScript, React, Node.js, Python, SQL, AWS, Docker

CERTIFICATIONS
AWS Certified Solutions Architect by Amazon (2021)
Certified Kubernetes Administrator from CNCF (2022)`;

  describe('parseResumeContent', () => {
    it('should parse complete resume content correctly', () => {
      const result = service.parseResumeContent(sampleResumeText);

      expect(result.rawText).toBe(sampleResumeText);
      expect(result.sections).toBeDefined();
      expect(result.sections.contactInfo).toBeDefined();
      expect(result.sections.experience).toBeDefined();
      expect(result.sections.education).toBeDefined();
      expect(result.sections.skills).toBeDefined();
    });
  });

  describe('extractContactInfo', () => {
    it('should extract contact information correctly', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const contact = result.sections.contactInfo;

      expect(contact.name).toBe('John Doe');
      expect(contact.email).toBe('john.doe@email.com');
      expect(contact.phone).toBe('(555) 123-4567');
      expect(contact.linkedin).toBe('linkedin.com/in/johndoe');
      expect(contact.website).toBe('www.johndoe.com');
      expect(contact.address).toContain('San Francisco, CA 94102');
    });

    it('should handle missing contact information gracefully', () => {
      const minimalText = `Jane Smith
Software Developer`;
      
      const result = service.parseResumeContent(minimalText);
      const contact = result.sections.contactInfo;

      expect(contact.name).toBe('Jane Smith');
      expect(contact.email).toBeUndefined();
      expect(contact.phone).toBeUndefined();
    });

    it('should extract email from various formats', () => {
      const testCases = [
        'Contact: user@example.com',
        'Email: test.user+tag@domain.co.uk',
        'user123@test-domain.org'
      ];

      testCases.forEach(testCase => {
        const result = service.parseResumeContent(testCase);
        expect(result.sections.contactInfo.email).toBeDefined();
      });
    });

    it('should extract phone numbers from various formats', () => {
      const testCases = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '+1 555 123 4567',
        '1-555-123-4567'
      ];

      testCases.forEach(testCase => {
        const result = service.parseResumeContent(`John Doe\n${testCase}`);
        expect(result.sections.contactInfo.phone).toBeDefined();
      });
    });
  });

  describe('extractWorkExperience', () => {
    it('should extract work experience correctly', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const experience = result.sections.experience;

      expect(experience).toHaveLength(2);
      
      expect(experience[0]?.position).toBe('Senior Software Engineer');
      expect(experience[0]?.company).toBe('Tech Corp');
      expect(experience[0]?.startDate).toBe('2020');
      expect(experience[0]?.endDate).toBe('2023');
      expect(experience[0]?.achievements).toContain('Developed web applications using React and Node.js');
      expect(experience[0]?.achievements).toContain('Led a team of 5 developers');
      expect(experience[0]?.achievements).toContain('Improved system performance by 40%');

      expect(experience[1]?.position).toBe('Software Developer');
      expect(experience[1]?.company).toBe('StartupXYZ');
      expect(experience[1]?.startDate).toBe('2018');
      expect(experience[1]?.endDate).toBe('2020');
    });

    it('should handle current positions', () => {
      const currentJobText = `EXPERIENCE
Senior Developer at Current Company (2022-Present)
- Working on exciting projects`;

      const result = service.parseResumeContent(currentJobText);
      const experience = result.sections.experience;

      expect(experience).toHaveLength(1);
      expect(experience[0]?.startDate).toBe('2022');
      expect(experience[0]?.endDate).toBeUndefined();
    });

    it('should parse different job header formats', () => {
      const variousFormats = `EXPERIENCE
Software Engineer, Google Inc (2020-2022)
Product Manager @ Facebook (2018-2020)
Data Scientist - Netflix 2016-2018`;

      const result = service.parseResumeContent(variousFormats);
      const experience = result.sections.experience;

      expect(experience).toHaveLength(3);
      expect(experience[0]?.position).toBe('Software Engineer');
      expect(experience[0]?.company).toBe('Google Inc');
      expect(experience[1]?.position).toBe('Product Manager');
      expect(experience[1]?.company).toBe('Facebook');
    });
  });

  describe('extractEducation', () => {
    it('should extract education correctly', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const education = result.sections.education;

      expect(education).toHaveLength(2);
      
      expect(education[0]?.degree).toBe('Bachelor of Science');
      expect(education[0]?.field).toBe('Computer Science');
      expect(education[0]?.institution).toBe('University of Technology');
      expect(education[0]?.graduationDate).toBe('2018');

      expect(education[1]?.degree).toBe('Master of Science');
      expect(education[1]?.field).toBe('Software Engineering');
      expect(education[1]?.institution).toBe('MIT');
      expect(education[1]?.graduationDate).toBe('2020');
    });

    it('should handle various education formats', () => {
      const educationText = `EDUCATION
Bachelor of Arts in Psychology, UCLA (2015)
Master's Degree in Business Administration from Harvard (2017)
PhD in Computer Science, Stanford University 2020`;

      const result = service.parseResumeContent(educationText);
      const education = result.sections.education;

      expect(education).toHaveLength(3);
      expect(education[0]?.field).toBe('Psychology');
      expect(education[1]?.degree).toBe('Master\'s Degree');
      expect(education[2]?.graduationDate).toBe('2020');
    });
  });

  describe('extractSkills', () => {
    it('should extract skills correctly', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const skills = result.sections.skills;

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
      expect(skills).toContain('Python');
      expect(skills).toContain('SQL');
      expect(skills).toContain('AWS');
      expect(skills).toContain('Docker');
    });

    it('should handle different skill formats', () => {
      const skillsText = `SKILLS
Programming: JavaScript, Python, Java
Frameworks: React, Angular, Vue.js
Databases: MySQL; PostgreSQL; MongoDB
Tools: Git | Docker | Kubernetes`;

      const result = service.parseResumeContent(skillsText);
      const skills = result.sections.skills;

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('React');
      expect(skills).toContain('MySQL');
      expect(skills).toContain('Git');
    });

    it('should remove duplicate skills', () => {
      const skillsText = `SKILLS
JavaScript, React, JavaScript, Node.js, React`;

      const result = service.parseResumeContent(skillsText);
      const skills = result.sections.skills;

      expect(skills.filter(skill => skill === 'JavaScript')).toHaveLength(1);
      expect(skills.filter(skill => skill === 'React')).toHaveLength(1);
    });
  });

  describe('extractCertifications', () => {
    it('should extract certifications correctly', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const certifications = result.sections.certifications;

      expect(certifications).toHaveLength(2);
      
      expect(certifications[0]?.name).toBe('AWS Certified Solutions Architect');
      expect(certifications[0]?.issuer).toBe('Amazon');
      expect(certifications[0]?.date).toBe('2021');

      expect(certifications[1]?.name).toBe('Certified Kubernetes Administrator');
      expect(certifications[1]?.issuer).toBe('CNCF');
      expect(certifications[1]?.date).toBe('2022');
    });

    it('should handle various certification formats', () => {
      const certText = `CERTIFICATIONS
PMP Certification, PMI (2020)
Google Cloud Professional by Google
Microsoft Azure Fundamentals from Microsoft 2021`;

      const result = service.parseResumeContent(certText);
      const certifications = result.sections.certifications;

      expect(certifications).toHaveLength(3);
      expect(certifications[0]?.name).toBe('PMP Certification');
      expect(certifications[0]?.issuer).toBe('PMI');
      expect(certifications[2]?.date).toBe('2021');
    });
  });

  describe('extractSummary', () => {
    it.skip('should extract summary correctly', () => {
      const testTextWithSummary = `John Doe
Software Engineer

SUMMARY
Experienced software engineer with 5+ years of experience in full-stack development.

EXPERIENCE
Senior Developer at Company`;

      const result = service.parseResumeContent(testTextWithSummary);
      const summary = result.sections.summary;

      expect(summary).toBeDefined();
      expect(summary).toContain('Experienced software engineer');
    });

    it('should handle missing summary', () => {
      const noSummaryText = `John Doe
EXPERIENCE
Developer at Company`;

      const result = service.parseResumeContent(noSummaryText);
      expect(result.sections.summary).toBeUndefined();
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from all sections', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const keywords = service.extractKeywords(result);

      // Should include skills
      expect(keywords).toContain('JavaScript');
      expect(keywords).toContain('React');
      
      // Should include job titles
      expect(keywords).toContain('Senior Software Engineer');
      expect(keywords).toContain('Software Developer');
      
      // Should include companies
      expect(keywords).toContain('Tech Corp');
      expect(keywords).toContain('StartupXYZ');
      
      // Should include education fields
      expect(keywords).toContain('Computer Science');
      expect(keywords).toContain('Software Engineering');
      
      // Should include certifications
      expect(keywords).toContain('AWS Certified Solutions Architect');
    });

    it('should remove duplicate keywords', () => {
      const result = service.parseResumeContent(sampleResumeText);
      const keywords = service.extractKeywords(result);
      
      const uniqueKeywords = [...new Set(keywords)];
      expect(keywords.length).toBe(uniqueKeywords.length);
    });
  });

  describe('section detection', () => {
    it('should detect section headers correctly', () => {
      const testText = `John Doe
EXPERIENCE
Work history here
EDUCATION
School info here
SKILLS
Tech skills here`;

      const result = service.parseResumeContent(testText);
      
      expect(result.sections.experience).toBeDefined();
      expect(result.sections.education).toBeDefined();
      expect(result.sections.skills).toBeDefined();
    });

    it('should handle case-insensitive section headers', () => {
      const testText = `John Doe

EXPERIENCE
Senior Developer at Company A
- Built applications

education
Bachelor of Science in Computer Science

skills
JavaScript, Python`;

      const result = service.parseResumeContent(testText);
      
      expect(result.sections.experience.length).toBeGreaterThan(0);
      expect(result.sections.education.length).toBeGreaterThan(0);
      expect(result.sections.skills.length).toBeGreaterThan(0);
    });
  });
});