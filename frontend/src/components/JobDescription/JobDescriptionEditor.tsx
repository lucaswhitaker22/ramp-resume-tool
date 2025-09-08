import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Save,
  ContentPaste,
  Clear,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { JobDescription } from '../../types';

interface JobDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (jobDescription: Partial<JobDescription>) => Promise<void>;
  autoSave?: boolean;
  autoSaveDelay?: number;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  disabled?: boolean;
  showCharacterCount?: boolean;
  showValidation?: boolean;
}

const JobDescriptionEditor: React.FC<JobDescriptionEditorProps> = ({
  value,
  onChange,
  onSave,
  autoSave = true,
  autoSaveDelay = 2000,
  maxLength = 5000,
  minLength = 50,
  placeholder = 'Enter the job description, requirements, qualifications, and any other relevant details...',
  disabled = false,
  showCharacterCount = true,
  showValidation = true,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !onSave || !hasUnsavedChanges || value.length < minLength) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        await onSave({
          description: value,
          updatedAt: new Date().toISOString(),
        });
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch (error: any) {
        setSaveError(error.message || 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [value, autoSave, onSave, autoSaveDelay, hasUnsavedChanges, minLength]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
      setHasUnsavedChanges(true);
      setSaveError(null);
    }
  };

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Clean up pasted text - remove excessive whitespace and normalize line breaks
      const cleanedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      const newValue = value + (value ? '\n\n' : '') + cleanedText;
      if (newValue.length <= maxLength) {
        onChange(newValue);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, [value, onChange, maxLength]);

  const handleClear = () => {
    onChange('');
    setHasUnsavedChanges(true);
  };

  const handleManualSave = async () => {
    if (!onSave || !hasUnsavedChanges) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave({
        description: value,
        updatedAt: new Date().toISOString(),
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const getValidationStatus = () => {
    if (value.length === 0) return { type: 'info', message: 'Start typing to add job description' };
    if (value.length < minLength) return { type: 'warning', message: `Add at least ${minLength - value.length} more characters` };
    if (value.length > maxLength * 0.9) return { type: 'warning', message: `Approaching character limit` };
    return { type: 'success', message: 'Job description looks good' };
  };

  const validation = getValidationStatus();
  const characterCount = value.length;
  const isValid = characterCount >= minLength && characterCount <= maxLength;

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Job Description</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Auto-save status */}
            {autoSave && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isSaving && <LinearProgress sx={{ width: 60, height: 2 }} />}
                {lastSaved && !hasUnsavedChanges && !isSaving && (
                  <Tooltip title={`Last saved: ${lastSaved.toLocaleTimeString()}`}>
                    <CheckCircle color="success" fontSize="small" />
                  </Tooltip>
                )}
                {hasUnsavedChanges && !isSaving && (
                  <Chip label="Unsaved" size="small" color="warning" variant="outlined" />
                )}
              </Box>
            )}

            {/* Action buttons */}
            <Tooltip title="Paste from clipboard">
              <IconButton onClick={handlePaste} disabled={disabled} size="small">
                <ContentPaste />
              </IconButton>
            </Tooltip>
            
            {onSave && (
              <Tooltip title="Save now">
                <IconButton 
                  onClick={handleManualSave} 
                  disabled={disabled || isSaving || !hasUnsavedChanges}
                  size="small"
                >
                  <Save />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Clear all">
              <IconButton onClick={handleClear} disabled={disabled || !value} size="small">
                <Clear />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Text Editor */}
        <TextField
          multiline
          rows={12}
          fullWidth
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: 1.6,
            },
          }}
        />

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          {/* Character count */}
          {showCharacterCount && (
            <Typography 
              variant="caption" 
              color={characterCount > maxLength * 0.9 ? 'error' : 'text.secondary'}
            >
              {characterCount.toLocaleString()} / {maxLength.toLocaleString()} characters
            </Typography>
          )}

          {/* Validation status */}
          {showValidation && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {validation.type === 'success' && <CheckCircle color="success" fontSize="small" />}
              {validation.type === 'warning' && <Warning color="warning" fontSize="small" />}
              <Typography 
                variant="caption" 
                color={
                  validation.type === 'success' ? 'success.main' : 
                  validation.type === 'warning' ? 'warning.main' : 
                  'text.secondary'
                }
              >
                {validation.message}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Error message */}
      {saveError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveError}
        </Alert>
      )}

      {/* Validation error */}
      {showValidation && !isValid && value.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {value.length < minLength 
            ? `Job description must be at least ${minLength} characters long`
            : `Job description cannot exceed ${maxLength} characters`
          }
        </Alert>
      )}
    </Box>
  );
};

export default JobDescriptionEditor;