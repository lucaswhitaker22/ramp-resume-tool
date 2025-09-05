// Export all models
export { BaseModel } from './BaseModel';
export { ResumeModel } from './Resume';
export { JobDescriptionModel } from './JobDescription';
export { AnalysisResultModel } from './AnalysisResult';

// Import models for instance creation
import { ResumeModel } from './Resume';
import { JobDescriptionModel } from './JobDescription';
import { AnalysisResultModel } from './AnalysisResult';

// Create model instances for use throughout the application
export const resumeModel = new ResumeModel();
export const jobDescriptionModel = new JobDescriptionModel();
export const analysisResultModel = new AnalysisResultModel();

// Export types
export * from '@/types/database';