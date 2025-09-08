import { notificationService } from './NotificationService';

export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
  suggestedActions: string[];
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  field: string;
  message: string;
  suggestedActions: string[];
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestedActions: string[];
  value?: any;
}

export interface ValidationInfo {
  field: string;
  message: string;
  suggestedActions: string[];
  value?: any;
}

export class ValidationService {
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // File upload validation rules
    this.addRule('file-upload', {
      field: 'file',
      validator: (file: any) => file && file.size > 0,
      message: 'No file provided or file is empty',
      suggestedActions: [
        'Select a valid resume file',
        'Ensure the file is not corrupted',
        'Try uploading a different file',
      ],
      severity: 'error',
    });

    this.addRule('file-upload', {
      field: 'file.size',
      validator: (file: any) => !file || file.size <= 10 * 1024 * 1024, // 10MB
      message: 'File size exceeds the maximum limit of 10MB',
      suggestedActions: [
        'Compress the file to reduce its size',
        'Convert to a more efficient format (PDF recommended)',
        'Remove unnecessary images or formatting',
      ],
      severity: 'error',
    });

    this.addRule('file-upload', {
      field: 'file.type',
      validator: (file: any) => {
        if (!file || !file.mimetype) return false;
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        return allowedTypes.includes(file.mimetype);
      },
      message: 'File format is not supported',
      suggestedActions: [
        'Convert your resume to PDF format (recommended)',
        'Save as DOC or DOCX from your word processor',
        'Export as plain text if other formats fail',
      ],
      severity: 'error',
    });

    this.addRule('file-upload', {
      field: 'file.name',
      validator: (file: any) => {
        if (!file || !file.originalname) return false;
        // Check for suspicious file extensions
        const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
        const fileName = file.originalname.toLowerCase();
        return !suspiciousExtensions.some(ext => fileName.endsWith(ext));
      },
      message: 'File type appears to be unsafe',
      suggestedActions: [
        'Upload only document files (PDF, DOC, DOCX, TXT)',
        'Ensure the file is a legitimate resume document',
        'Contact support if you believe this is an error',
      ],
      severity: 'error',
    });

    // Job description validation rules
    this.addRule('job-description', {
      field: 'content',
      validator: (content: string) => Boolean(content && content.trim().length >= 50),
      message: 'Job description is too short (minimum 50 characters)',
      suggestedActions: [
        'Include job responsibilities and requirements',
        'Add required skills and qualifications',
        'Provide more details about the role',
      ],
      severity: 'error',
    });

    this.addRule('job-description', {
      field: 'content',
      validator: (content: string) => !content || content.length <= 10000,
      message: 'Job description exceeds maximum length (10,000 characters)',
      suggestedActions: [
        'Focus on the most important requirements',
        'Remove duplicate or unnecessary information',
        'Summarize lengthy sections',
      ],
      severity: 'error',
    });

    this.addRule('job-description', {
      field: 'content',
      validator: (content: string) => {
        if (!content) return true;
        const wordCount = content.trim().split(/\s+/).length;
        return wordCount >= 20;
      },
      message: 'Job description appears to have very few words',
      suggestedActions: [
        'Provide more detailed job requirements',
        'Include responsibilities and qualifications',
        'Add company information if relevant',
      ],
      severity: 'warning',
    });

    this.addRule('job-description', {
      field: 'content',
      validator: (content: string) => {
        if (!content) return true;
        return /requirements?|qualifications?|skills?/i.test(content);
      },
      message: 'Job description may be missing requirements or qualifications section',
      suggestedActions: [
        'Add a requirements or qualifications section',
        'List required skills and experience',
        'Specify education requirements if applicable',
      ],
      severity: 'warning',
    });

    // Email validation rules
    this.addRule('email', {
      field: 'email',
      validator: (email: string) => {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      message: 'Invalid email address format',
      suggestedActions: [
        'Enter a valid email address (user@domain.com)',
        'Check for typos in the email address',
        'Ensure the domain name is correct',
      ],
      severity: 'error',
    });

    // Analysis validation rules
    this.addRule('analysis', {
      field: 'resumeId',
      validator: (resumeId: string) => Boolean(resumeId && resumeId.trim().length > 0),
      message: 'Resume ID is required for analysis',
      suggestedActions: [
        'Upload a resume file first',
        'Ensure the resume was processed successfully',
        'Try uploading the resume again',
      ],
      severity: 'error',
    });
  }

  /**
   * Add a validation rule
   */
  public addRule(category: string, rule: ValidationRule): void {
    if (!this.rules.has(category)) {
      this.rules.set(category, []);
    }
    this.rules.get(category)!.push(rule);
  }

  /**
   * Validate data against rules for a category
   */
  public validate(category: string, data: any): ValidationResult {
    const rules = this.rules.get(category) || [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    for (const rule of rules) {
      try {
        const isValid = rule.validator(this.getFieldValue(data, rule.field));
        
        if (!isValid) {
          const validationItem = {
            field: rule.field,
            message: rule.message,
            suggestedActions: rule.suggestedActions,
            value: this.getFieldValue(data, rule.field),
          };

          switch (rule.severity) {
            case 'error':
              errors.push(validationItem);
              break;
            case 'warning':
              warnings.push(validationItem);
              break;
            case 'info':
              info.push(validationItem);
              break;
          }
        }
      } catch (validationError) {
        console.error(`Validation error for rule ${rule.field}:`, validationError);
        errors.push({
          field: rule.field,
          message: 'Validation check failed',
          suggestedActions: ['Contact support if this issue persists'],
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Validate and send notifications for errors
   */
  public async validateAndNotify(
    category: string,
    data: any,
    analysisId?: string
  ): Promise<ValidationResult> {
    const result = this.validate(category, data);

    // Send notifications for errors if analysisId is provided
    if (analysisId) {
      for (const error of result.errors) {
        notificationService.sendValidationError(
          analysisId,
          error.field,
          error.message,
          error.suggestedActions
        );
      }

      // Send warnings as warning notifications
      for (const warning of result.warnings) {
        notificationService.sendWarning(
          analysisId,
          `Validation Warning: ${warning.field}`,
          warning.message,
          warning.suggestedActions.map(action => ({
            label: action,
            action: 'custom' as const,
            data: { suggestion: action, field: warning.field },
          }))
        );
      }

      // Send info as info notifications
      for (const infoItem of result.info) {
        notificationService.sendInfo(
          analysisId,
          `Information: ${infoItem.field}`,
          infoItem.message,
          3000, // 3 seconds
          infoItem.suggestedActions.map(action => ({
            label: action,
            action: 'custom' as const,
            data: { suggestion: action, field: infoItem.field },
          }))
        );
      }
    }

    return result;
  }

  /**
   * Get field value from data object using dot notation
   */
  private getFieldValue(data: any, fieldPath: string): any {
    if (!data || !fieldPath) {
      return undefined;
    }

    const parts = fieldPath.split('.');
    let value = data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Create validation middleware for Express routes
   */
  public createValidationMiddleware(category: string) {
    return async (req: any, res: any, next: any) => {
      try {
        const analysisId = req.params.analysisId || req.body.analysisId;
        const validationData = { ...req.body, ...req.params, file: req.file };
        
        const result = await this.validateAndNotify(category, validationData, analysisId);
        
        if (!result.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Validation failed',
              details: {
                errors: result.errors,
                warnings: result.warnings,
                info: result.info,
              },
            },
          });
        }

        // Attach validation result to request for use in route handlers
        req.validationResult = result;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Get validation rules for a category
   */
  public getRules(category: string): ValidationRule[] {
    return this.rules.get(category) || [];
  }

  /**
   * Get all validation categories
   */
  public getCategories(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Clear rules for a category
   */
  public clearRules(category: string): void {
    this.rules.delete(category);
  }

  /**
   * Get validation statistics
   */
  public getValidationStats(): {
    totalRules: number;
    rulesByCategory: Record<string, number>;
    rulesBySeverity: Record<string, number>;
  } {
    let totalRules = 0;
    const rulesByCategory: Record<string, number> = {};
    const rulesBySeverity: Record<string, number> = {
      error: 0,
      warning: 0,
      info: 0,
    };

    this.rules.forEach((rules, category) => {
      rulesByCategory[category] = rules.length;
      totalRules += rules.length;

      rules.forEach(rule => {
        const severity = rule.severity;
        rulesBySeverity[severity] = (rulesBySeverity[severity] || 0) + 1;
      });
    });

    return {
      totalRules,
      rulesByCategory,
      rulesBySeverity,
    };
  }
}

// Singleton instance
export const validationService = new ValidationService();