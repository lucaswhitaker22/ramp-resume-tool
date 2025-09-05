import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { JobDescriptionData } from '@/types/jobDescription';

interface SaveJobDescriptionRequest {
  content: string;
}

interface SaveJobDescriptionResponse {
  id: string;
  content: string;
  savedAt: string;
}

const saveJobDescription = async (data: SaveJobDescriptionRequest): Promise<SaveJobDescriptionResponse> => {
  // This would typically make an API call to save the job description
  // For now, we'll simulate the API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `jd_${Date.now()}`,
        content: data.content,
        savedAt: new Date().toISOString(),
      });
    }, 500);
  });
};

export const useJobDescription = (initialValue: string = '') => {
  const [jobDescription, setJobDescription] = useState(initialValue);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveMutation = useMutation({
    mutationFn: saveJobDescription,
    onSuccess: (data) => {
      setLastSaved(new Date(data.savedAt));
    },
    onError: (error) => {
      console.error('Failed to save job description:', error);
    },
  });

  const handleChange = useCallback((value: string) => {
    setJobDescription(value);
  }, []);

  const handleSave = useCallback(async (data: JobDescriptionData) => {
    if (data.content.trim().length === 0) return;
    
    await saveMutation.mutateAsync({
      content: data.content,
    });
  }, [saveMutation]);

  const clearJobDescription = useCallback(() => {
    setJobDescription('');
    setLastSaved(null);
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    if (!lastSaved) return jobDescription.length > 0;
    // This is a simplified check - in a real app you'd compare with the last saved content
    return true;
  }, [jobDescription, lastSaved]);

  return {
    jobDescription,
    handleChange,
    handleSave,
    clearJobDescription,
    lastSaved,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    hasUnsavedChanges: hasUnsavedChanges(),
  };
};