export interface AnalysisResult {
  id: string;
  resumeId: string;
  jobDescriptionId?: string;
  overallScore: number;
  categoryScores: {
    content: number;
    structure: number;
    keywords: number;
    experience: number;
    skills: number;
  };
  recommendations: Recommendation[];
  strengths: string[];
  improvementAreas: string[];
  analyzedAt: Date;
}

export interface Recommendation {
  id: string;
  category: 'content' | 'structure' | 'keywords' | 'experience' | 'skills';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  examples: {
    before?: string;
    after: string;
  };
  impact: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  color: string;
}

export interface FilterOptions {
  categories: string[];
  priorities: string[];
  searchTerm: string;
}

export interface SortOptions {
  field: 'priority' | 'category' | 'impact';
  direction: 'asc' | 'desc';
}

export type FeedbackCategory = 'overview' | 'content' | 'structure' | 'keywords' | 'experience' | 'skills';

export interface TabConfig {
  id: FeedbackCategory;
  label: string;
  icon?: string;
  count?: number;
}