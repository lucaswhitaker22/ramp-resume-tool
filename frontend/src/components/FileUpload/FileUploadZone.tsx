import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { UploadedFile, FileValidationError, UploadConfig } from '@/types/upload';

interface FileUploadZoneProps {
  onFileUpload: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  uploadedFiles: UploadedFile[];
  config?: Partial<UploadConfig>;
  disabled?: boolean;
}

const defaultConfig: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFormats: ['.pdf', '.doc', '.docx', '.txt'],
  maxFiles: 1,
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  onFileRemove,
  uploadedFiles,
  config = {},
  disabled = false,
}) => {
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);
  const finalConfig = { ...defaultConfig, ...config };

  const validateFile = useCallback((file: File): FileValidationError | null => {
    // Check file size
    if (file.size > finalConfig.maxFileSize) {
      return {
        code: 'FILE_TOO_LARGE',
        message: `File size must be less than ${Math.round(finalConfig.maxFileSize / (1024 * 1024))}MB`,
      };
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!finalConfig.acceptedFormats.includes(fileExtension)) {
      return {
        code: 'INVALID_TYPE',
        message: `File type not supported. Accepted formats: ${finalConfig.acceptedFormats.join(', ')}`,
      };
    }

    return null;
  }, [finalConfig]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationErrors([]);
    const errors: FileValidationError[] = [];

    // Check if adding files would exceed max files limit
    if (uploadedFiles.length + acceptedFiles.length > finalConfig.maxFiles) {
      errors.push({
        code: 'INVALID_TYPE',
        message: `Maximum ${finalConfig.maxFiles} file(s) allowed`,
      });
      setValidationErrors(errors);
      return;
    }

    // Validate each file
    const validFiles: UploadedFile[] = [];
    acceptedFiles.forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
      } else {
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadProgress: 0,
          status: 'pending',
        };
        validFiles.push(uploadedFile);
      }
    });

    // Handle rejected files
    rejectedFiles.forEach((rejection) => {
      errors.push({
        code: 'INVALID_TYPE',
        message: `${rejection.file.name}: ${rejection.errors[0]?.message || 'Invalid file'}`,
      });
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    if (validFiles.length > 0) {
      onFileUpload(validFiles);
    }
  }, [uploadedFiles.length, finalConfig, validateFile, onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: finalConfig.maxFiles,
    disabled,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Upload Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            backgroundColor: disabled ? 'background.paper' : 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: isDragActive ? 'primary.main' : 'grey.400',
            }}
          />
          <Typography variant="h6" textAlign="center">
            {isDragActive
              ? 'Drop your resume here'
              : 'Drag & drop your resume here, or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Supported formats: {finalConfig.acceptedFormats.join(', ')}
            <br />
            Maximum file size: {Math.round(finalConfig.maxFileSize / (1024 * 1024))}MB
          </Typography>
        </Box>
      </Paper>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Box mt={2}>
          {validationErrors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Uploaded Files
          </Typography>
          <Stack spacing={2}>
            {uploadedFiles.map((file) => (
              <Paper key={file.id} sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <FileIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="body1" fontWeight="medium">
                      {file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                    {file.status === 'uploading' && (
                      <Box mt={1}>
                        <LinearProgress
                          variant="determinate"
                          value={file.uploadProgress}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {file.uploadProgress}% uploaded
                        </Typography>
                      </Box>
                    )}
                    {file.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {file.error}
                      </Alert>
                    )}
                  </Box>
                  <Chip
                    label={file.status}
                    color={getStatusColor(file.status)}
                    size="small"
                  />
                  <IconButton
                    onClick={() => onFileRemove(file.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};