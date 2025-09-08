import { apiClient } from '../utils/api';
import { Candidate, ApiResponse, PaginatedResponse } from '../types';

export interface CandidatesFilters {
  search?: string;
  status?: string[];
  scoreRange?: [number, number];
  skillsScoreRange?: [number, number];
  experienceRange?: [number, number];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CandidateStats {
  total: number;
  byStatus: Record<string, number>;
  averageScore: number;
  topSkills: Array<{ skill: string; count: number }>;
}

class CandidatesService {
  /**
   * Get all candidates with optional filtering and pagination
   */
  async getCandidates(filters: CandidatesFilters = {}): Promise<PaginatedResponse<Candidate>> {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status?.length) params.append('status', filters.status.join(','));
      if (filters.scoreRange) {
        params.append('minScore', filters.scoreRange[0].toString());
        params.append('maxScore', filters.scoreRange[1].toString());
      }
      if (filters.skillsScoreRange) {
        params.append('minSkillsScore', filters.skillsScoreRange[0].toString());
        params.append('maxSkillsScore', filters.skillsScoreRange[1].toString());
      }
      if (filters.experienceRange) {
        params.append('minExperience', filters.experienceRange[0].toString());
        params.append('maxExperience', filters.experienceRange[1].toString());
      }
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get<ApiResponse<PaginatedResponse<Candidate>>>(
        `/candidates?${params.toString()}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch candidates');
      }
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
      throw new Error(error.message || 'Failed to fetch candidates');
    }
  }

  /**
   * Get a single candidate by ID
   */
  async getCandidate(candidateId: string): Promise<Candidate> {
    try {
      const response = await apiClient.get<ApiResponse<Candidate>>(`/candidates/${candidateId}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Candidate not found');
      }
    } catch (error: any) {
      console.error('Error fetching candidate:', error);
      throw new Error(error.message || 'Failed to fetch candidate');
    }
  }

  /**
   * Update candidate status
   */
  async updateCandidateStatus(candidateId: string, status: string): Promise<void> {
    try {
      const response = await apiClient.patch<ApiResponse<void>>(`/candidates/${candidateId}/status`, {
        status
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update candidate status');
      }
    } catch (error: any) {
      console.error('Error updating candidate status:', error);
      throw new Error(error.message || 'Failed to update candidate status');
    }
  }

  /**
   * Bulk update candidate statuses
   */
  async bulkUpdateStatus(candidateIds: string[], status: string): Promise<void> {
    try {
      const response = await apiClient.patch<ApiResponse<void>>('/candidates/bulk/status', {
        candidateIds,
        status
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to bulk update candidate statuses');
      }
    } catch (error: any) {
      console.error('Error bulk updating candidate statuses:', error);
      throw new Error(error.message || 'Failed to bulk update candidate statuses');
    }
  }

  /**
   * Delete a candidate
   */
  async deleteCandidate(candidateId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/candidates/${candidateId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete candidate');
      }
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      throw new Error(error.message || 'Failed to delete candidate');
    }
  }

  /**
   * Bulk delete candidates
   */
  async bulkDeleteCandidates(candidateIds: string[]): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>('/candidates/bulk', {
        data: { candidateIds }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to bulk delete candidates');
      }
    } catch (error: any) {
      console.error('Error bulk deleting candidates:', error);
      throw new Error(error.message || 'Failed to bulk delete candidates');
    }
  }

  /**
   * Get candidate statistics
   */
  async getCandidateStats(): Promise<CandidateStats> {
    try {
      const response = await apiClient.get<ApiResponse<CandidateStats>>('/candidates/stats');

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch candidate statistics');
      }
    } catch (error: any) {
      console.error('Error fetching candidate stats:', error);
      throw new Error(error.message || 'Failed to fetch candidate statistics');
    }
  }

  /**
   * Export candidates data
   */
  async exportCandidates(
    candidateIds: string[],
    format: 'csv' | 'excel' | 'pdf' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await apiClient.post('/candidates/export', {
        candidateIds,
        format
      }, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error: any) {
      console.error('Error exporting candidates:', error);
      throw new Error(error.message || 'Failed to export candidates');
    }
  }

  /**
   * Re-analyze a candidate's resume
   */
  async reanalyzeCandidate(candidateId: string, jobDescriptionId?: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(`/candidates/${candidateId}/reanalyze`, {
        jobDescriptionId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to start re-analysis');
      }
    } catch (error: any) {
      console.error('Error re-analyzing candidate:', error);
      throw new Error(error.message || 'Failed to start re-analysis');
    }
  }
}

export const candidatesService = new CandidatesService();