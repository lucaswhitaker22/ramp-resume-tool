import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Clear, Upload, Person, Email, Phone } from '@mui/icons-material';
import FileUploadZone from '../components/FileUpload/FileUploadZone';
import { useFileUpload } from '../hooks/useFileUpload';
import { jobDescriptionService } from '../services/jobDescriptionService';
import { JobDescription } from '../types';

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

  // Candidate form fields
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [overrideFromFile, setOverrideFromFile] = useState(false);

  // Job description fields
  const [jobDescription, setJobDescription] = useState('');
  const [jobDescriptionId, setJobDescriptionId] = useState<string | null>(null);
  const [availableJobDescriptions, setAvailableJobDescriptions] = useState<JobDescription[]>([]);
  const [showJobDescriptionDialog, setShowJobDescriptionDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isCreatingJobDescription, setIsCreatingJobDescription] = useState(false);
  const [isLoadingJobDescriptions, setIsLoadingJobDescriptions] = useState(false);

  // Load available job descriptions on component mount
  useEffect(() => {
    const loadJobDescriptions = async () => {
      setIsLoadingJobDescriptions(true);
      try {
        const response = await jobDescriptionService.getJobDescriptions();
        if (response.data) {
          setAvailableJobDescriptions(response.data);
        }
      } catch (error) {
        console.error('Failed to load job descriptions:', error);
      } finally {
        setIsLoadingJobDescriptions(false);
      }
    };
    loadJobDescriptions();
  }, []);

  const handleFilesSelected = (files: File[]) => {
    // Validate forms
    if (overrideFromFile && (!candidateName.trim() && !candidateEmail.trim())) {
      // Show error - requires at least name or email when override is enabled
      alert('Please provide at least a name or email when overriding candidate information.');
      return;
    }

    if (!jobDescription.trim()) {
      setPendingFiles(files);
      setShowJobDescriptionDialog(true);
    } else if (!jobDescriptionId && jobDescription.trim()) {
      // Need to create job description first
      setPendingFiles(files);
      setShowJobDescriptionDialog(true);
    } else {
      uploadFiles(files, jobDescriptionId || '');
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
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upload multiple resume files to analyze candidates against your job requirements.
          Supported formats: PDF, DOC, DOCX (max 10MB each).
        </Typography>

        {/* Candidate Information Form */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Candidate Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Provide candidate details to override information extracted from the resume file.
            </Typography>

            {overrideFromFile && candidateName === '' && candidateEmail === '' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please fill in at least the candidate name or email address when overriding file information.
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={overrideFromFile}
                    onChange={(e) => setOverrideFromFile(e.target.checked)}
                  />
                }
                label="Override candidate information from file"
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Candidate Name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  disabled={!overrideFromFile}
                  size="small"
                  sx={{ minWidth: 200 }}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
                <TextField
                  label="Email Address"
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  disabled={!overrideFromFile}
                  size="small"
                  sx={{ minWidth: 250 }}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
                <TextField
                  label="Phone Number"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  disabled={!overrideFromFile}
                  size="small"
                  sx={{ minWidth: 200 }}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

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

      {/* Job Description Selection or Creation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Job Description
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an existing job description or create a new one for resume analysis.
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Job Description</InputLabel>
            <Select
              label="Select Job Description"
              value={jobDescriptionId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId === 'new') {
                  setJobDescriptionId(null);
                  setJobDescription('');
                } else {
                  setJobDescriptionId(selectedId);
                  const selected = availableJobDescriptions.find(jd => jd.id === selectedId);
                  if (selected) {
                    setJobDescription(selected.content);
                  }
                }
              }}
              disabled={isLoadingJobDescriptions}
            >
              {availableJobDescriptions.map((jd) => (
                <MenuItem key={jd.id} value={jd.id}>
                  <Box>
                    <Typography variant="body2">
                      {jd.title || `JD-${jd.id?.slice(-8)}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {jd.content.substring(0, 60)}...
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem value="new">
                <Typography color="primary">
                  + Create New Job Description
                </Typography>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Display selected job description content */}
          {(jobDescriptionId || jobDescription.trim()) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {jobDescriptionId ? 'Selected Job Description:' : 'New Job Description:'}
              </Typography>
              <Box sx={{
                maxHeight: 150,
                overflowY: 'auto',
                p: 1,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  {jobDescription.length > 300
                    ? `${jobDescription.substring(0, 300)}...`
                    : jobDescription || 'No content yet - enter job description below'
                  }
                </Typography>
              </Box>
              {jobDescriptionId && (
                <Button
                  size="small"
                  onClick={() => setShowJobDescriptionDialog(true)}
                  sx={{ mt: 1 }}
                >
                  View Full Job Description
                </Button>
              )}
            </Box>
          )}

          {/* Job description text area */}
          {(!jobDescriptionId || jobDescription.trim()) && (
            <TextField
              sx={{ mt: 2 }}
              multiline
              rows={6}
              fullWidth
              label={jobDescriptionId ? "Edit Job Description" : "Job Description"}
              placeholder="Enter the job description, requirements, and qualifications..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              variant="outlined"
              helperText="Use bullet points to list requirements and responsibilities"
            />
          )}
        </CardContent>
      </Card>

      {/* Job Description Dialog (for viewing/editing selected JD) */}
      <Dialog
        open={showJobDescriptionDialog}
        onClose={handleCancelJobDescription}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {jobDescriptionId ? 'Job Description Details' : 'Create New Job Description'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide or modify the job description to analyze the resumes against.
            This will help match candidates to your specific requirements.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={10}
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
            {isCreatingJobDescription ? 'Creating...' : jobDescriptionId ? 'Update' : 'Start Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadPage;