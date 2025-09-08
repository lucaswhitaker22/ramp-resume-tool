import { apiClient } from '../utils/api';
import { UploadProgress, Candidate } from '../types';

export interface UploadServiceCallbacks {
  onProgress: (fileName: string, progress: number) => void;
  onStatusChange: (fileName: string, status: UploadProgress['status']) => void;
  onError: (fileName: string, error: string) => void;
  onComplete: (fileName: string, candidate: Candidate) => void;
}

class UploadService {
  private activeUploads = new Map<string, AbortController>();

  async uploadFiles(
    files: File[],
    jobDescriptionId: string,
    callbacks: UploadServiceCallbacks
  ): Promise<void> {
    const uploadPromises = files.map((file) => this.uploadSingleFile(file, jobDescriptionId, callbacks));
    
    try {
      await Promise.allSettled(uploadPromises);
    } catch (error) {
      console.error('Error in batch upload:', error);
    }
  }

  private async uploadSingleFile(
    file: File,
    jobDescriptionId: string,
    callbacks: UploadServiceCallbacks
  ): Promise<void> {
    const fileName = file.name;
    const abortController = new AbortController();
    this.activeUploads.set(fileName, abortController);

    try {
      // Set initial status
      callbacks.onStatusChange(fileName, 'uploading');
      callbacks.onProgress(fileName, 0);

      // Create form data
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDescriptionId', jobDescriptionId);

      // Upload file with progress tracking
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            callbacks.onProgress(fileName, progress);
          }
        },
      });

      if (response.data.success) {
        // Upload completed, now start analysis
        callbacks.onStatusChange(fileName, 'processing');
        callbacks.onProgress(fileName, 100);

        // Start analysis
        const analysisResponse = await apiClient.post('/analysis', {
          resumeId: response.data.data.resumeId,
          jobDescriptionId: jobDescriptionId
        });

        if (analysisResponse.data.success) {
          // Poll for analysis completion
          await this.pollAnalysisStatus(fileName, analysisResponse.data.data.analysisId, callbacks);
        } else {
          throw new Error(analysisResponse.data.error || 'Analysis failed to start');
        }
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        callbacks.onStatusChange(fileName, 'error');
        callbacks.onError(fileName, 'Upload cancelled');
      } else {
        callbacks.onStatusChange(fileName, 'error');
        callbacks.onError(fileName, error.message || 'Upload failed');
      }
    } finally {
      this.activeUploads.delete(fileName);
    }
  }

  private async pollAnalysisStatus(
    fileName: string,
    analysisId: string,
    callbacks: UploadServiceCallbacks
  ): Promise<void> {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await apiClient.get(`/analysis/${analysisId}/status`);
        
        if (response.data.success) {
          const analysis = response.data.data;
          
          if (analysis.status === 'completed') {
            // Get full analysis results
            const fullResponse = await apiClient.get(`/analysis/${analysisId}`);
            if (fullResponse.data.success) {
              callbacks.onStatusChange(fileName, 'completed');
              // Convert analysis result to candidate format for compatibility
              const candidate = {
                id: analysisId,
                name: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
                status: 'completed',
                overallScore: fullResponse.data.data.overallScore,
                categoryScores: fullResponse.data.data.categoryScores,
                recommendations: fullResponse.data.data.recommendations,
                strengths: fullResponse.data.data.strengths,
                improvementAreas: fullResponse.data.data.improvementAreas,
                analyzedAt: fullResponse.data.data.analyzedAt
              };
              callbacks.onComplete(fileName, candidate);
            }
            return;
          } else if (analysis.status === 'failed' || analysis.status === 'error') {
            callbacks.onStatusChange(fileName, 'error');
            callbacks.onError(fileName, analysis.error || 'Analysis failed');
            return;
          }
        }

        attempts++;
        if (attempts >= maxAttempts) {
          callbacks.onStatusChange(fileName, 'error');
          callbacks.onError(fileName, 'Analysis timeout');
          return;
        }

        // Continue polling
        setTimeout(poll, 10000); // Poll every 10 seconds
      } catch (error: any) {
        callbacks.onStatusChange(fileName, 'error');
        callbacks.onError(fileName, error.message || 'Analysis failed');
      }
    };

    await poll();
  }

  cancelUpload(fileName: string): void {
    const abortController = this.activeUploads.get(fileName);
    if (abortController) {
      abortController.abort();
      this.activeUploads.delete(fileName);
    }
  }

  cancelAllUploads(): void {
    this.activeUploads.forEach((controller) => {
      controller.abort();
    });
    this.activeUploads.clear();
  }

  async extractCandidateName(file: File): Promise<string> {
    try {
      // Simple name extraction from filename
      const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      
      // Try to extract name patterns (e.g., "John_Doe_Resume.pdf" -> "John Doe")
      const nameMatch = baseName.match(/^([A-Za-z]+[_\s-]+[A-Za-z]+)/);
      if (nameMatch) {
        return nameMatch[1].replace(/[_-]/g, ' ').trim();
      }

      // Fallback to filename without extension
      return baseName.replace(/[_-]/g, ' ').trim();
    } catch (error) {
      return file.name.replace(/\.[^/.]+$/, '');
    }
  }

  validateFile(file: File, maxSize: number = 10 * 1024 * 1024): string | null {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / 1024 / 1024}MB limit`;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only PDF, DOC, and DOCX files are allowed';
    }

    return null;
  }
}

export const uploadService = new UploadService();