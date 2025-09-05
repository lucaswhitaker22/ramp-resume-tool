import { ATSCompatibilityService } from '../services/ATSCompatibilityService';
import { ResumeContent } from '../types/database';
import { ParsedResumeSection } from '../services/ResumeParsingService';

describe('ATSCompatibilityService', () => {
  let service: ATSCompatibilityService;

  beforeEach(() => {
    service = new ATSCompatibilityService();
  });

  describe('analyzeATSCompatibility', () => {
    it('should return high score for well-formatted resume', () => {
      const content: ResumeContent = {
        rawText: `John Smith
john.smith@email.com
(555) 123-4567
linkedin.com/in/johnsmith

SUMMARY
Experienced software developer with 5 years of experience.

EXPERIENCE
Software Developer at Tech Company
2020 - 2023
• Developed web applications using React and Node.js
• Improved system performance by 25%
• Led team of 3 developers

EDUCATION
Bachelor of Science in Computer Science
University of Technology
2020

SKILLS
JavaScript, React, Node.js, Python, SQL`,
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '(555) 123-4567',
            linkedin: 'linkedin.com/in/johnsmith'
          },
          summary: 'Experienced software developer with 5 years of experience.',
          experience: [{
            position: 'Software Developer',
            company: 'Tech Company',
            startDate: '2020',
            endDate: '2023',
            description: '• Developed web applications using React and Node.js\n• Improved system performance by 25%\n• Led team of 3 developers',
            achievements: [
              'Developed web applications using React and Node.js',
              'Improved system performance by 25%',
              'Led team of 3 developers'
            ]
          }],
          education: [{
            institution: 'University of Technology',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            graduationDate: '2020'
          }],
          skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith\njohn.smith@email.com', startIndex: 0, endIndex: 50 },
        { sectionType: 'summary', content: 'SUMMARY\nExperienced software developer', startIndex: 51, endIndex: 100 },
        { sectionType: 'experience', content: 'EXPERIENCE\nSoftware Developer', startIndex: 101, endIndex: 200 },
        { sectionType: 'education', content: 'EDUCATION\nBachelor of Science', startIndex: 201, endIndex: 250 },
        { sectionType: 'skills', content: 'SKILLS\nJavaScript, React', startIndex: 251, endIndex: 300 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.formattingScore).toBeGreaterThan(80);
      expect(result.sectionOrganizationScore).toBeGreaterThan(80);
      expect(result.readabilityScore).toBeGreaterThan(80);
      expect(result.professionalPresentationScore).toBeGreaterThan(80);
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should identify missing required sections', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\njohn.smith@email.com',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com'
          },
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.sectionOrganizationScore).toBeLessThan(50);
      expect(result.issues.some(issue => 
        issue.category === 'organization' && 
        issue.description.includes('Missing required sections')
      )).toBe(true);
    });

    it('should detect complex formatting issues', () => {
      const content: ResumeContent = {
        rawText: `John Smith	
john.smith@email.com    
▪ Complex bullet points
│ Box drawing characters
Multiple    spaces    everywhere`,
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com'
          },
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.formattingScore).toBeLessThanOrEqual(80);
      expect(result.issues.some(issue => 
        issue.category === 'formatting' && 
        issue.description.includes('Complex formatting detected')
      )).toBe(true);
    });

    it('should identify unprofessional email addresses', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\ncoolguy123456@hotmail.com',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'coolguy123456@hotmail.com'
          },
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.professionalPresentationScore).toBeLessThan(90);
      expect(result.issues.some(issue => 
        issue.category === 'presentation' && 
        issue.description.includes('Email address may appear unprofessional')
      )).toBe(true);
    });

    it('should detect insufficient experience descriptions', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\njohn.smith@email.com\n\nEXPERIENCE\nDeveloper at Company\nShort desc',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com'
          },
          summary: undefined,
          experience: [{
            position: 'Developer',
            company: 'Company',
            startDate: '2020',
            endDate: '2023',
            description: 'Short desc',
            achievements: []
          }],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 },
        { sectionType: 'experience', content: 'EXPERIENCE\nDeveloper', startIndex: 51, endIndex: 100 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.readabilityScore).toBeLessThan(90);
      expect(result.issues.some(issue => 
        issue.category === 'readability' && 
        issue.description.includes('insufficient description')
      )).toBe(true);
    });

    it('should detect inconsistent date formatting', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\njohn.smith@email.com',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com'
          },
          summary: undefined,
          experience: [
            {
              position: 'Developer',
              company: 'Company A',
              startDate: '2020',
              endDate: '2023',
              description: 'Worked on projects',
              achievements: []
            },
            {
              position: 'Analyst',
              company: 'Company B',
              startDate: '01/2018',
              endDate: '12/2019',
              description: 'Analyzed data',
              achievements: []
            }
          ],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 },
        { sectionType: 'experience', content: 'EXPERIENCE\nDeveloper', startIndex: 51, endIndex: 100 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.issues.some(issue => 
        issue.category === 'presentation' && 
        issue.description.includes('Inconsistent date formatting')
      )).toBe(true);
    });

    it('should recommend adding LinkedIn profile', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\njohn.smith@email.com\n(555) 123-4567',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '(555) 123-4567'
          },
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.recommendations.some(rec => 
        rec.category === 'presentation' && 
        rec.title.includes('LinkedIn Profile')
      )).toBe(true);
    });

    it('should detect limited use of action verbs', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\njohn.smith@email.com',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com'
          },
          summary: undefined,
          experience: [{
            position: 'Developer',
            company: 'Company',
            startDate: '2020',
            endDate: '2023',
            description: 'Was responsible for coding. Worked on projects. Did some testing.',
            achievements: []
          }],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 },
        { sectionType: 'experience', content: 'EXPERIENCE\nDeveloper', startIndex: 51, endIndex: 100 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.issues.some(issue => 
        issue.category === 'readability' && 
        issue.description.includes('Limited use of strong action verbs')
      )).toBe(true);
    });
  });

  describe('getCompatibilityLevel', () => {
    it('should return correct compatibility levels', () => {
      expect(service.getCompatibilityLevel(95)).toBe('excellent');
      expect(service.getCompatibilityLevel(85)).toBe('good');
      expect(service.getCompatibilityLevel(70)).toBe('fair');
      expect(service.getCompatibilityLevel(50)).toBe('poor');
    });
  });

  describe('getPriorityRecommendations', () => {
    it('should return only high priority recommendations', () => {
      const recommendations = [
        {
          category: 'formatting' as const,
          priority: 'high' as const,
          title: 'High Priority 1',
          description: 'Fix this first'
        },
        {
          category: 'organization' as const,
          priority: 'medium' as const,
          title: 'Medium Priority',
          description: 'Fix this later'
        },
        {
          category: 'readability' as const,
          priority: 'high' as const,
          title: 'High Priority 2',
          description: 'Fix this second'
        }
      ];

      const result = service.getPriorityRecommendations(recommendations);

      expect(result).toHaveLength(2);
      expect(result.every(rec => rec.priority === 'high')).toBe(true);
    });

    it('should limit to 5 recommendations', () => {
      const recommendations = Array.from({ length: 10 }, (_, i) => ({
        category: 'formatting' as const,
        priority: 'high' as const,
        title: `High Priority ${i + 1}`,
        description: `Fix this ${i + 1}`
      }));

      const result = service.getPriorityRecommendations(recommendations);

      expect(result).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty resume content', () => {
      const content: ResumeContent = {
        rawText: '',
        sections: {
          contactInfo: {},
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.overallScore).toBeLessThan(50);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle resume with only contact information', () => {
      const content: ResumeContent = {
        rawText: 'John Smith\njohn.smith@email.com\n(555) 123-4567',
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '(555) 123-4567'
          },
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.sectionOrganizationScore).toBeLessThan(50);
      expect(result.issues.some(issue => 
        issue.description.includes('Missing required sections')
      )).toBe(true);
    });

    it('should handle very long resume', () => {
      const longText = 'A'.repeat(10000); // Very long resume
      const content: ResumeContent = {
        rawText: longText,
        sections: {
          contactInfo: {
            name: 'John Smith',
            email: 'john.smith@email.com'
          },
          summary: undefined,
          experience: [],
          education: [],
          skills: [],
          certifications: []
        }
      };

      const sections: ParsedResumeSection[] = [
        { sectionType: 'contact', content: 'John Smith', startIndex: 0, endIndex: 50 }
      ];

      const result = service.analyzeATSCompatibility(content, sections);

      expect(result.issues.some(issue => 
        issue.category === 'readability' && 
        issue.description.includes('exceeding recommended')
      )).toBe(true);
    });
  });
});