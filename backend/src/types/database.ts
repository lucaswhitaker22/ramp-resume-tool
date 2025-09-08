// Database entity interfaces

export interface ResumeEntity {
  id: string;
  filename: string;
  file_size: number;
  content_text: string | null;
  candidate_name: string;
  uploaded_at: string;
  processed_at: string | null;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export interface JobDescriptionEntity {
  id: string;
  content: string;
  extracted_requirements: string | null;
  created_at: string;
}

export interface AnalysisResultEntity {
  id: string;
  resume_id: string;
  job_description_id: string | null;
  overall_score: number | null;
  category_scores: string | null; // JSON string
  recommendations: string | null; // JSON string
  strengths: string | null; // JSON string
  improvement_areas: string | null; // JSON string
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
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
  endDate?: string | undefined;
  description: string;
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationDate?: string | undefined;
  gpa?: string | undefined;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string | undefined;
  expirationDate?: string | undefined;
}

export interface ResumeContent {
  rawText: string;
  sections: {
    contactInfo: ContactInfo;
    summary?: string | undefined;
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  analyzedAt: Date;
}