// Database entity interfaces

export interface ResumeEntity {
  id: string;
  filename: string;
  file_size: number;
  content_text?: string;
  uploaded_at: string;
  processed_at?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export interface JobDescriptionEntity {
  id: string;
  content: string;
  extracted_requirements?: string;
  created_at: string;
}

export interface AnalysisResultEntity {
  id: string;
  resume_id: string;
  job_description_id?: string;
  overall_score?: number;
  category_scores?: string; // JSON string
  recommendations?: string; // JSON string
  strengths?: string; // JSON string
  improvement_areas?: string; // JSON string
  analyzed_at: string;
}

// Parsed data models (for application use)

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  linkedin?: string;
  website?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationDate?: string;
  gpa?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  expirationDate?: string;
}

export interface ResumeContent {
  rawText: string;
  sections: {
    contactInfo: ContactInfo;
    summary?: string;
    experience: WorkExperience[];
    education: Education[];
    skills: string[];
    certifications: Certification[];
  };
}

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  education: string[];
  certifications: string[];
  keywords: string[];
}

export interface CategoryScores {
  content: number;
  structure: number;
  keywords: number;
  experience: number;
  skills: number;
}

export interface Recommendation {
  id: string;
  category: 'content' | 'structure' | 'keywords' | 'experience' | 'skills';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  examples?: {
    before?: string;
    after: string;
  };
  impact: string;
}

export interface AnalysisResult {
  id: string;
  resumeId: string;
  jobDescriptionId?: string;
  overallScore: number;
  categoryScores: CategoryScores;
  recommendations: Recommendation[];
  strengths: string[];
  improvementAreas: string[];
  analyzedAt: Date;
}