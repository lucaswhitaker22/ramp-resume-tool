import { useState, useCallback, useEffect } from 'react';
import { JobDescription } from '../types';
import { jobDescriptionService } from '../services/jobDescriptionService';

interface UseJobDescriptionReturn {
  jobDescription: JobDescription | null;
  isLoading: boolean;
  error: string | null;
  createJobDescription: (content: string) => Promise<JobDescription | null>;
  updateJobDescription: (id: string, content: string) => Promise<JobDescription | null>;
  loadJobDescription: (id: string) => Promise<void>;
  clearJobDescription: () => void;
  autoSave: (content: string) => Promise<JobDescription | null>;
}

export const useJobDescription = (initialId?: string): UseJobDescriptionReturn => {
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createJobDescription = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await jobDescriptionService.createJobDescription({ content });
      if (response.success && response.data) {
        setJobDescription(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to create job description');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create job description');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateJobDescription = useCallback(async (id: string, content: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await jobDescriptionService.updateJobDescription(id, { content });
      if (response.success && response.data) {
        setJobDescription(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to update job description');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update job description');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadJobDescription = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await jobDescriptionService.getJobDescription(id);
      if (response.success && response.data) {
        setJobDescription(response.data);
      } else {
        setError(response.error || 'Failed to load job description');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job description');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearJobDescription = useCallback(() => {
    setJobDescription(null);
    setError(null);
  }, []);

  const autoSave = useCallback(async (content: string) => {
    try {
      const response = await jobDescriptionService.autoSaveJobDescription(
        jobDescription?.id || null,
        content
      );
      
      if (response.success && response.data) {
        setJobDescription(response.data);
        return response.data;
      } else {
        console.error('Auto-save failed:', response.error);
        return null;
      }
    } catch (err: any) {
      console.error('Auto-save failed:', err.message);
      return null;
    }
  }, [jobDescription?.id]);

  // Load initial job description if ID is provided
  useEffect(() => {
    if (initialId) {
      loadJobDescription(initialId);
    }
  }, [initialId, loadJobDescription]);

  return {
    jobDescription,
    isLoading,
    error,
    createJobDescription,
    updateJobDescription,
    loadJobDescription,
    clearJobDescription,
    autoSave,
  };
};