import { apiRequest } from '../utils/api';
import { JobDescription, ApiResponse, PaginatedResponse } from '../types';

export interface CreateJobDescriptionRequest {
  title: string;
  company: string;
  description: string;
  requirements?: string[];
  preferredSkills?: string[];
  experienceLevel?: string;
}

export interface UpdateJobDescriptionRequest extends Partial<CreateJobDescriptionRequest> {
  id: string;
}

class JobDescriptionService {
  async createJobDescription(data: CreateJobDescriptionRequest): Promise<ApiResponse<JobDescription>> {
    return apiRequest.post<JobDescription>('/job-descriptions', data);
  }

  async updateJobDescription(data: UpdateJobDescriptionRequest): Promise<ApiResponse<JobDescription>> {
    const { id, ...updateData } = data;
    return apiRequest.put<JobDescription>(`/job-descriptions/${id}`, updateData);
  }

  async getJobDescription(id: string): Promise<ApiResponse<JobDescription>> {
    return apiRequest.get<JobDescription>(`/job-descriptions/${id}`);
  }

  async getJobDescriptions(
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<JobDescription>>> {
    return apiRequest.get<PaginatedResponse<JobDescription>>(
      `/job-descriptions?page=${page}&limit=${limit}`
    );
  }

  async deleteJobDescription(id: string): Promise<ApiResponse<void>> {
    return apiRequest.delete<void>(`/job-descriptions/${id}`);
  }

  async analyzeJobDescription(description: string): Promise<ApiResponse<{
    requirements: string[];
    preferredSkills: string[];
    experienceLevel: string;
    keyTerms: string[];
  }>> {
    return apiRequest.post('/job-descriptions/analyze', { description });
  }

  // Auto-save functionality
  async autoSaveJobDescription(
    id: string | null,
    data: Partial<JobDescription>
  ): Promise<ApiResponse<JobDescription>> {
    if (id) {
      return this.updateJobDescription({ id, ...data });
    } else {
      // Create a new job description with minimal required fields
      const createData: CreateJobDescriptionRequest = {
        title: data.title || 'Untitled Job',
        company: data.company || 'Unknown Company',
        description: data.description || '',
        requirements: data.requirements,
        preferredSkills: data.preferredSkills,
        experienceLevel: data.experienceLevel,
      };
      return this.createJobDescription(createData);
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

  // Validate job description content
  validateJobDescription(description: string): {
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
}

export const jobDescriptionService = new JobDescriptionService();