import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Alert,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ContentPaste as PasteIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { JobDescriptionData, JobDescriptionValidation, JobDescriptionConfig } from '@/types/jobDescription';

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (data: JobDescriptionData) => void;
  config?: Partial<JobDescriptionConfig>;
  disabled?: boolean;
  placeholder?: string;
}

const defaultConfig: JobDescriptionConfig = {
  maxLength: 10000,
  minLength: 50,
  autoSaveDelay: 2000, // 2 seconds
};

export const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSave,
  config = {},
  disabled = false,
  placeholder = 'Paste or type the job description here...',
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<JobDescriptionValidation>({
    isValid: true,
    errors: [],
    warnings: [],
  });
  
  const finalConfig = { ...defaultConfig, ...config };
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const textFieldRef = useRef<HTMLTextAreaElement>();

  // Character count
  const characterCount = value.length;
  const remainingChars = finalConfig.maxLength - characterCount;

  // Validation logic
  const validateContent = useCallback((content: string): JobDescriptionValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (content.length > finalConfig.maxLength) {
      errors.push(`Content exceeds maximum length of ${finalConfig.maxLength} characters`);
    }

    if (content.length > 0 && content.length < finalConfig.minLength) {
      warnings.push(`Content is quite short. Consider adding more details (minimum ${finalConfig.minLength} characters recommended)`);
    }

    if (content.trim().length === 0 && content.length > 0) {
      warnings.push('Content appears to be only whitespace');
    }

    // Check for common job description elements
    const hasRequirements = /requirements?|qualifications?|skills?/i.test(content);
    const hasResponsibilities = /responsibilities?|duties|role|position/i.test(content);
    
    if (content.length > finalConfig.minLength && !hasRequirements) {
      warnings.push('Consider including job requirements or qualifications for better analysis');
    }

    if (content.length > finalConfig.minLength && !hasResponsibilities) {
      warnings.push('Consider including job responsibilities or duties for better analysis');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [finalConfig.maxLength, finalConfig.minLength]);

  // Update validation when content changes
  useEffect(() => {
    const newValidation = validateContent(value);
    setValidation(newValidation);
  }, [value, validateContent]);

  // Auto-save functionality
  useEffect(() => {
    if (!onSave || value.length === 0) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, finalConfig.autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [value, finalConfig.autoSaveDelay]);

  const handleAutoSave = async () => {
    if (!onSave || validation.errors.length > 0) return;

    setIsSaving(true);
    try {
      const jobDescriptionData: JobDescriptionData = {
        content: value,
        characterCount,
        lastSaved: new Date(),
      };
      
      await onSave(jobDescriptionData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    handleAutoSave();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Clean up common formatting issues from clipboard
        const cleanedText = text
          .replace(/\r\n/g, '\n') // Normalize line endings
          .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
          .replace(/\t/g, ' ') // Replace tabs with spaces
          .replace(/ {2,}/g, ' ') // Replace multiple spaces with single space
          .trim();
        
        onChange(cleanedText);
      }
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
    }
  };

  const handleClear = () => {
    onChange('');
    setLastSaved(null);
  };

  const getCharacterCountColor = () => {
    if (remainingChars < 0) return 'error';
    if (remainingChars < 500) return 'warning';
    return 'text.secondary';
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    return date.toLocaleTimeString();
  };

  return (
    <Box>
      {/* Header with actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Job Description
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Paste from clipboard">
            <IconButton
              onClick={handlePasteFromClipboard}
              disabled={disabled}
              size="small"
            >
              <PasteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save now">
            <IconButton
              onClick={handleManualSave}
              disabled={disabled || value.length === 0}
              size="small"
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear content">
            <IconButton
              onClick={handleClear}
              disabled={disabled || value.length === 0}
              size="small"
              color="error"
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Text input */}
      <Paper sx={{ p: 2 }}>
        <TextField
          ref={textFieldRef}
          fullWidth
          multiline
          minRows={8}
          maxRows={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: validation.errors.length > 0 ? 'error.main' : 'grey.300',
              },
            },
          }}
        />

        {/* Character count and status */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography
              variant="caption"
              color={getCharacterCountColor()}
              fontWeight={remainingChars < 0 ? 'bold' : 'normal'}
            >
              {characterCount.toLocaleString()} / {finalConfig.maxLength.toLocaleString()} characters
              {remainingChars < 0 && ` (${Math.abs(remainingChars)} over limit)`}
            </Typography>
            
            {isSaving && (
              <Chip
                label="Saving..."
                size="small"
                color="info"
                variant="outlined"
              />
            )}
            
            {lastSaved && !isSaving && (
              <Typography variant="caption" color="text.secondary">
                Last saved: {formatLastSaved(lastSaved)}
              </Typography>
            )}
          </Box>

          {/* Content quality indicators */}
          <Stack direction="row" spacing={1}>
            {characterCount >= finalConfig.minLength && (
              <Chip
                label="Good length"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
            {validation.warnings.length === 0 && characterCount >= finalConfig.minLength && (
              <Chip
                label="Well structured"
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Validation messages */}
      {validation.errors.length > 0 && (
        <Box mt={2}>
          {validation.errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {validation.warnings.length > 0 && (
        <Box mt={2}>
          {validation.warnings.map((warning, index) => (
            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
              {warning}
            </Alert>
          ))}
        </Box>
      )}

      {/* Help text */}
      {characterCount === 0 && (
        <Box mt={2}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Tips for better analysis:</strong>
              <br />
              • Include job requirements, qualifications, and skills
              <br />
              • Add job responsibilities and duties
              <br />
              • Mention required experience level and education
              <br />
              • Include company information and benefits if available
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};