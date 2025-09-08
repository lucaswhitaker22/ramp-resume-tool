// Common types for the Resume Review Tool

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  fileName: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  overallScore?: number;
  analysisResults?: AnalysisResult;
}

export interface AnalysisResult {
  id: string;
  candidateId: string;
  jobDescriptionId: string;
  overallScore: number;
  skillsMatch: SkillsMatch;
  experienceMatch: ExperienceMatch;
  educationMatch: EducationMatch;
  atsCompatibility: ATSCompatibility;
  recommendations: string[];
  createdAt: string;
}

export interface SkillsMatch {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
}

export interface ExperienceMatch {
  score: number;
  yearsOfExperience: number;
  relevantExperience: number;
  industryMatch: boolean;
}

export interface EducationMatch {
  score: number;
  degreeMatch: boolean;
  fieldOfStudyMatch: boolean;
  institutionPrestige?: number;
}

export interface ATSCompatibility {
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface JobDescription {
  id: string;
  jobDescriptionId?: string; // For backward compatibility
  title?: string;
  company?: string;
  content: string;
  description?: string; // For backward compatibility
  requirements?: string[];
  preferredSkills?: string[];
  experienceLevel?: string;
  extractedRequirements?: {
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: string;
    education: string[];
    certifications: string[];
    keywords: string[];
  };
  contentLength?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}