import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { UploadedFile } from '@/types/upload';

interface UploadResponse {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

const uploadFile = async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await axios.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
};

export const useFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const uploadMutation = useMutation({
    mutationFn: ({ file, fileId }: { file: File; fileId: string }) =>
      uploadFile(file, (progress) => {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, uploadProgress: progress, status: 'uploading' as const }
              : f
          )
        );
      }),
    onSuccess: (data, { fileId }) => {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'completed' as const, uploadProgress: 100 }
            : f
        )
      );
    },
    onError: (error: any, { fileId }) => {
      const errorMessage = error.response?.data?.error?.message || 'Upload failed';
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
    },
  });

  const handleFileUpload = useCallback((files: UploadedFile[]) => {
    // Add files to state
    setUploadedFiles((prev) => [...prev, ...files]);

    // Start uploading each file
    files.forEach((uploadedFile) => {
      uploadMutation.mutate({
        file: uploadedFile.file,
        fileId: uploadedFile.id,
      });
    });
  }, [uploadMutation]);

  const handleFileRemove = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  const getCompletedFiles = useCallback(() => {
    return uploadedFiles.filter((f) => f.status === 'completed');
  }, [uploadedFiles]);

  const hasUploadingFiles = uploadedFiles.some((f) => f.status === 'uploading');
  const hasErrorFiles = uploadedFiles.some((f) => f.status === 'error');
  const hasCompletedFiles = uploadedFiles.some((f) => f.status === 'completed');

  return {
    uploadedFiles,
    handleFileUpload,
    handleFileRemove,
    clearFiles,
    getCompletedFiles,
    isUploading: uploadMutation.isPending || hasUploadingFiles,
    hasErrors: hasErrorFiles,
    hasCompletedFiles,
  };
};