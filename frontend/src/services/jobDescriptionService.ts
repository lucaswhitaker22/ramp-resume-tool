import { apiRequest } from '../utils/api';
import { JobDescription, ApiResponse, PaginatedResponse } from '../types';

export interface CreateJobDescriptionRequest {
  content: string;
}

export interface UpdateJobDescriptionRequest {
  content: string;
}

class JobDescriptionService {
  async createJobDescription(data: CreateJobDescriptionRequest): Promise<ApiResponse<JobDescription>> {
    return apiRequest.post<JobDescription>('/job-description', data);
  }

  async updateJobDescription(id: string, data: UpdateJobDescriptionRequest): Promise<ApiResponse<JobDescription>> {
    return apiRequest.put<JobDescription>(`/job-description/${id}`, data);
  }

  async getJobDescription(id: string): Promise<ApiResponse<JobDescription>> {
    return apiRequest.get<JobDescription>(`/job-description/${id}`);
  }

  async deleteJobDescription(id: string): Promise<ApiResponse<void>> {
    return apiRequest.delete<void>(`/job-description/${id}`);
  }

  async getJobDescriptions(filters: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiRequest.get<PaginatedResponse<any>>(`/job-description?${params.toString()}`);
    return response.data;
  }

  async getJobDescriptionStats(): Promise<{
    total: number;
    withRequirements: number;
    avgContentLength: number;
    recentCount: number;
  }> {
    const response = await apiRequest.get<{
      total: number;
      withRequirements: number;
      avgContentLength: number;
      recentCount: number;
    }>('/job-description/stats');
    return response.data;
  }

  async validateJobDescriptionContent(content: string): Promise<ApiResponse<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    contentInfo: {
      length: number;
      wordCount: number;
      hasRequirements: boolean;
      hasResponsibilities: boolean;
    };
  }>> {
    return apiRequest.post('/job-description/validate', { content });
  }

  // Auto-save functionality
  async autoSaveJobDescription(
    id: string | null,
    content: string
  ): Promise<ApiResponse<JobDescription>> {
    if (id) {
      return this.updateJobDescription(id, { content });
    } else {
      return this.createJobDescription({ content });
    }
  }

  // Extract key information from job description text
  extractJobInfo(description: string): {
    requirements: string[];
    preferredSkills: string[];
    experienceLevel: string;
  } {
    const lines = description.split('\n').map(line => line.trim()).filter(Boolean);
    const requirements: string[] = [];
    const preferredSkills: string[] = [];
    let experienceLevel = 'Mid-level';

    // Simple extraction logic - can be enhanced with NLP
    let currentSection = '';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect sections
      if (lowerLine.includes('requirement') || lowerLine.includes('must have')) {
        currentSection = 'requirements';
        continue;
      } else if (lowerLine.includes('preferred') || lowerLine.includes('nice to have') || lowerLine.includes('bonus')) {
        currentSection = 'preferred';
        continue;
      } else if (lowerLine.includes('experience')) {
        // Extract experience level
        if (lowerLine.includes('senior') || lowerLine.includes('5+') || lowerLine.includes('5 years')) {
          experienceLevel = 'Senior';
        } else if (lowerLine.includes('junior') || lowerLine.includes('entry') || lowerLine.includes('0-2')) {
          experienceLevel = 'Junior';
        } else if (lowerLine.includes('lead') || lowerLine.includes('principal') || lowerLine.includes('architect')) {
          experienceLevel = 'Lead';
        }
      }

      // Extract bullet points or numbered items
      if (line.match(/^[\s]*[-•*]\s+/) || line.match(/^[\s]*\d+[\.)]\s+/)) {
        const item = line.replace(/^[\s]*[-•*\d\.)]+\s*/, '').trim();
        if (item.length > 5) { // Filter out very short items
          if (currentSection === 'requirements') {
            requirements.push(item);
          } else if (currentSection === 'preferred') {
            preferredSkills.push(item);
          } else {
            // Default to requirements if no section is specified
            requirements.push(item);
          }
        }
      }
    }

    return {
      requirements,
      preferredSkills,
      experienceLevel,
    };
  }

  // Validate job description content locally
  validateJobDescriptionLocal(description: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (description.length < 50) {
      errors.push('Job description is too short. Please provide more details.');
    }

    if (description.length > 5000) {
      errors.push('Job description is too long. Please keep it under 5000 characters.');
    }

    const lowerDescription = description.toLowerCase();

    // Check for essential sections
    if (!lowerDescription.includes('requirement') && !lowerDescription.includes('qualification')) {
      warnings.push('Consider adding a requirements or qualifications section.');
    }

    if (!lowerDescription.includes('experience')) {
      warnings.push('Consider specifying the required experience level.');
    }

    if (!lowerDescription.includes('skill')) {
      warnings.push('Consider listing specific skills required for the role.');
    }

    // Suggestions for improvement
    if (description.split('\n').length < 5) {
      suggestions.push('Break down the job description into sections for better readability.');
    }

    if (!description.includes('•') && !description.includes('-') && !description.match(/\d+\./)) {
      suggestions.push('Use bullet points to list requirements and responsibilities.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  // Analyze job description without saving
  async analyzeJobDescriptionContent(content: string): Promise<ApiResponse<{
    extractedRequirements: {
      requiredSkills: string[];
      preferredSkills: string[];
      experienceLevel: string;
      education: string[];
      certifications: string[];
      keywords: string[];
    };
    contentLength: number;
    analysisTimestamp: string;
  }>> {
    return apiRequest.post('/job-description/analyze', { content });
  }

  // Add missing validateJobDescription - alias for local validation
  async validateJobDescription(content: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    return this.validateJobDescriptionLocal(content);
  }
}


export const jobDescriptionService = new JobDescriptionService();