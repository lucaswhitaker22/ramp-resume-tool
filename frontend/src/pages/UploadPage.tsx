import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Clear, Upload } from '@mui/icons-material';
import FileUploadZone from '../components/FileUpload/FileUploadZone';
import { useFileUpload } from '../hooks/useFileUpload';
import { jobDescriptionService } from '../services/jobDescriptionService';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    uploadProgress,
    isUploading,
    uploadFiles,
    removeFile,
    clearAll,
    cancelAllUploads,
  } = useFileUpload();

  const [jobDescription, setJobDescription] = useState('');
  const [jobDescriptionId, setJobDescriptionId] = useState<string | null>(null);
  const [showJobDescriptionDialog, setShowJobDescriptionDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isCreatingJobDescription, setIsCreatingJobDescription] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    if (!jobDescription.trim() || !jobDescriptionId) {
      setPendingFiles(files);
      setShowJobDescriptionDialog(true);
    } else {
      uploadFiles(files, jobDescriptionId);
    }
  };

  const handleJobDescriptionSubmit = async () => {
    if (jobDescription.trim() && pendingFiles.length > 0) {
      setIsCreatingJobDescription(true);
      try {
        // Create job description in backend
        const response = await jobDescriptionService.createJobDescription({
          content: jobDescription.trim()
        });

        if (response.success && response.data) {
          const jdId = response.data.jobDescriptionId || response.data.id;
          setJobDescriptionId(jdId);
          setShowJobDescriptionDialog(false);
          uploadFiles(pendingFiles, jdId);
          setPendingFiles([]);
        } else {
          console.error('Failed to create job description:', response.error);
          // TODO: Show error message to user
        }
      } catch (error) {
        console.error('Error creating job description:', error);
        // TODO: Show error message to user
      } finally {
        setIsCreatingJobDescription(false);
      }
    }
  };

  const handleCancelJobDescription = () => {
    setShowJobDescriptionDialog(false);
    setPendingFiles([]);
  };

  const completedCount = uploadProgress.filter((file) => file.status === 'completed').length;
  const errorCount = uploadProgress.filter((file) => file.status === 'error').length;
  const processingCount = uploadProgress.filter(
    (file) => file.status === 'uploading' || file.status === 'processing'
  ).length;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Upload Candidate Resumes
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Upload multiple resume files to analyze candidates against your job requirements.
          Supported formats: PDF, DOC, DOCX (max 10MB each).
        </Typography>

        {/* Current Job Description */}
        {jobDescription && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Current Job Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {jobDescription.length > 200
                      ? `${jobDescription.substring(0, 200)}...`
                      : jobDescription}
                  </Typography>
                </Box>
                <Button
                  startIcon={<Clear />}
                  onClick={() => {
                    setJobDescription('');
                    setJobDescriptionId(null);
                  }}
                  size="small"
                >
                  Change
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Upload Statistics */}
        {uploadProgress.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip
              label={`Total: ${uploadProgress.length}`}
              color="default"
              variant="outlined"
            />
            {completedCount > 0 && (
              <Chip
                label={`Completed: ${completedCount}`}
                color="success"
                variant="outlined"
              />
            )}
            {processingCount > 0 && (
              <Chip
                label={`Processing: ${processingCount}`}
                color="info"
                variant="outlined"
              />
            )}
            {errorCount > 0 && (
              <Chip
                label={`Errors: ${errorCount}`}
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Box>

      {/* File Upload Zone */}
      <FileUploadZone
        onFilesSelected={handleFilesSelected}
        uploadProgress={uploadProgress}
        onRemoveFile={removeFile}
        disabled={isUploading}
      />

      {/* Action Buttons */}
      {uploadProgress.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={clearAll}
            disabled={isUploading}
            startIcon={<Clear />}
          >
            Clear All
          </Button>
          {isUploading && (
            <Button
              variant="outlined"
              color="error"
              onClick={cancelAllUploads}
              startIcon={<Clear />}
            >
              Cancel Uploads
            </Button>
          )}
          {completedCount > 0 && (
            <Button
              variant="contained"
              onClick={() => navigate('/candidates')}
              startIcon={<Upload />}
            >
              View Results ({completedCount})
            </Button>
          )}
        </Box>
      )}

      {/* Success Message */}
      {completedCount > 0 && errorCount === 0 && !isUploading && (
        <Alert severity="success" sx={{ mt: 3 }}>
          Successfully processed {completedCount} resume{completedCount !== 1 ? 's' : ''}!
          You can now view the analysis results.
        </Alert>
      )}

      {/* Job Description Dialog */}
      <Dialog
        open={showJobDescriptionDialog}
        onClose={handleCancelJobDescription}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Job Description Required</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a job description to analyze the resumes against.
            This will help match candidates to your specific requirements.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={8}
            fullWidth
            label="Job Description"
            placeholder="Enter the job description, requirements, and qualifications..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelJobDescription} disabled={isCreatingJobDescription}>
            Cancel
          </Button>
          <Button
            onClick={handleJobDescriptionSubmit}
            variant="contained"
            disabled={!jobDescription.trim() || isCreatingJobDescription}
            startIcon={isCreatingJobDescription ? <CircularProgress size={16} /> : undefined}
          >
            {isCreatingJobDescription ? 'Creating...' : 'Start Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadPage;