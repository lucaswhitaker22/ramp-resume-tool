import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  InsertDriveFile,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { UploadProgress } from '../../types';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  uploadProgress: UploadProgress[];
  onRemoveFile: (fileName: string) => void;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  disabled?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  uploadProgress,
  onRemoveFile,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = ['.pdf', '.doc', '.docx'],
  disabled = false,
}) => {
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const newErrors: string[] = [];

      // Handle rejected files
      rejectedFiles.forEach((rejection) => {
        const { file, errors } = rejection;
        errors.forEach((error: any) => {
          switch (error.code) {
            case 'file-too-large':
              newErrors.push(`${file.name}: File is too large (max ${maxFileSize / 1024 / 1024}MB)`);
              break;
            case 'file-invalid-type':
              newErrors.push(`${file.name}: Invalid file type. Allowed: ${allowedFileTypes.join(', ')}`);
              break;
            default:
              newErrors.push(`${file.name}: ${error.message}`);
          }
        });
      });

      // Check for duplicate files
      const existingFileNames = uploadProgress.map((p) => p.fileName);
      const duplicateFiles = acceptedFiles.filter((file) =>
        existingFileNames.includes(file.name)
      );

      duplicateFiles.forEach((file) => {
        newErrors.push(`${file.name}: File already exists`);
      });

      const uniqueFiles = acceptedFiles.filter(
        (file) => !existingFileNames.includes(file.name)
      );

      setErrors(newErrors);

      if (uniqueFiles.length > 0) {
        onFilesSelected(uniqueFiles);
      }
    },
    [onFilesSelected, uploadProgress, maxFileSize, allowedFileTypes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: maxFileSize,
    disabled,
    multiple: true,
  });

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InsertDriveFile color="action" />;
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
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
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <CloudUpload
            sx={{
              fontSize: 48,
              color: isDragActive ? 'primary.main' : 'text.secondary',
              mb: 2,
            }}
          />
          <Typography variant="h6" gutterBottom>
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag & drop resume files here, or click to select'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: {allowedFileTypes.join(', ')} (max {maxFileSize / 1024 / 1024}MB each)
          </Typography>
        </Box>
      </Paper>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* File List */}
      {uploadProgress.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Files ({uploadProgress.length})
          </Typography>
          <Paper variant="outlined">
            <List>
              {uploadProgress.map((file, index) => (
                <ListItem key={file.fileName} divider={index < uploadProgress.length - 1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getStatusIcon(file.status)}
                  </Box>
                  <ListItemText
                    primary={file.fileName}
                    secondary={
                      <React.Fragment>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={file.status}
                            size="small"
                            color={getStatusColor(file.status)}
                            variant="outlined"
                          />
                          {file.status === 'uploading' || file.status === 'processing' ? (
                            <Typography variant="caption" component="span">
                              {file.progress}%
                            </Typography>
                          ) : null}
                        </Box>
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <LinearProgress
                            variant="determinate"
                            value={file.progress}
                            sx={{ width: '100%' }}
                          />
                        )}
                        {file.error && (
                          <Typography variant="caption" color="error" component="div">
                            {file.error}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => onRemoveFile(file.fileName)}
                      disabled={file.status === 'uploading' || file.status === 'processing'}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default FileUploadZone;