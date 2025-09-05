export interface JobDescriptionData {
  id?: string;
  content: string;
  lastSaved?: Date;
  characterCount: number;
}

export interface JobDescriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface JobDescriptionConfig {
  maxLength: number;
  minLength: number;
  autoSaveDelay: number; // in milliseconds
}