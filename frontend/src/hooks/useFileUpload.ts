import { useState, useCallback } from 'react';
import { UploadProgress, Candidate } from '../types';
import { uploadService, UploadServiceCallbacks } from '../services/uploadService';

interface UseFileUploadReturn {
  uploadProgress: UploadProgress[];
  isUploading: boolean;
  completedCandidates: Candidate[];
  uploadFiles: (files: File[], jobDescriptionId: string) => Promise<void>;
  removeFile: (fileName: string) => void;
  clearAll: () => void;
  cancelAllUploads: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [completedCandidates, setCompletedCandidates] = useState<Candidate[]>([]);

  const isUploading = uploadProgress.some(
    (file) => file.status === 'uploading' || file.status === 'processing'
  );

  const updateFileProgress = useCallback((fileName: string, updates: Partial<UploadProgress>) => {
    setUploadProgress((prev) =>
      prev.map((file) =>
        file.fileName === fileName ? { ...file, ...updates } : file
      )
    );
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newFiles: UploadProgress[] = files.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }));

    setUploadProgress((prev) => [...prev, ...newFiles]);
  }, []);

  const uploadFiles = useCallback(
    async (files: File[], jobDescriptionId: string) => {
      // Add files to progress tracking
      addFiles(files);

      // Create callbacks for upload service
      const callbacks: UploadServiceCallbacks = {
        onProgress: (fileName, progress) => {
          updateFileProgress(fileName, { progress });
        },
        onStatusChange: (fileName, status) => {
          updateFileProgress(fileName, { status });
        },
        onError: (fileName, error) => {
          updateFileProgress(fileName, { error, status: 'error' });
        },
        onComplete: (fileName, candidate) => {
          updateFileProgress(fileName, { status: 'completed', progress: 100 });
          setCompletedCandidates((prev) => [...prev, candidate]);
        },
      };

      // Start upload
      await uploadService.uploadFiles(files, jobDescriptionId, callbacks);
    },
    [addFiles, updateFileProgress]
  );

  const removeFile = useCallback((fileName: string) => {
    // Cancel upload if in progress
    uploadService.cancelUpload(fileName);

    // Remove from progress tracking
    setUploadProgress((prev) => prev.filter((file) => file.fileName !== fileName));

    // Remove from completed candidates if exists
    setCompletedCandidates((prev) =>
      prev.filter((candidate) => candidate.fileName !== fileName)
    );
  }, []);

  const clearAll = useCallback(() => {
    uploadService.cancelAllUploads();
    setUploadProgress([]);
    setCompletedCandidates([]);
  }, []);

  const cancelAllUploads = useCallback(() => {
    uploadService.cancelAllUploads();
    setUploadProgress((prev) =>
      prev.map((file) =>
        file.status === 'uploading' || file.status === 'processing'
          ? { ...file, status: 'error', error: 'Upload cancelled' }
          : file
      )
    );
  }, []);

  return {
    uploadProgress,
    isUploading,
    completedCandidates,
    uploadFiles,
    removeFile,
    clearAll,
    cancelAllUploads,
  };
};