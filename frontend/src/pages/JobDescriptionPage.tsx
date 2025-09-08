import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Save, Analytics } from '@mui/icons-material';
import JobDescriptionEditor from '../components/JobDescription/JobDescriptionEditor';
import { useJobDescription } from '../hooks/useJobDescription';
import { jobDescriptionService } from '../services/jobDescriptionService';
import { JobDescription } from '../types';

const JobDescriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobDescription, isLoading, error, createJobDescription, autoSave } = useJobDescription();
  
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<{
    requirements: string[];
    preferredSkills: string[];
    experienceLevel: string;
    keyTerms: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !company.trim() || !description.trim()) {
      return;
    }

    const result = await createJobDescription({
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
    });

    if (result) {
      navigate('/upload');
    }
  };

  const handleAutoSave = async (data: Partial<JobDescription>) => {
    if (jobDescription && data.description) {
      await autoSave(data);
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await jobDescriptionService.analyzeJobDescription(description);
      if (response.success && response.data) {
        setAnalysis(response.data);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validation = jobDescriptionService.validateJobDescription(description);
  const extractedInfo = jobDescriptionService.extractJobInfo(description);

  const canSave = title.trim() && company.trim() && validation.isValid;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Job Description
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create a detailed job description to analyze candidate resumes against your specific requirements.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Main Editor */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ mb: 3 }}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Job Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g., Tech Corp Inc."
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>

          <JobDescriptionEditor
            value={description}
            onChange={setDescription}
            onSave={handleAutoSave}
            autoSave={true}
            showCharacterCount={true}
            showValidation={true}
          />

          {/* Validation Messages */}
          {validation.errors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Please fix the following issues:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Suggestions for improvement:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Analytics />}
              onClick={handleAnalyze}
              disabled={!description.trim() || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={!canSave || isLoading}
            >
              Save & Continue
            </Button>
          </Box>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          {/* Extracted Information */}
          {(extractedInfo.requirements.length > 0 || extractedInfo.preferredSkills.length > 0) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Extracted Information
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Experience Level
                  </Typography>
                  <Chip label={extractedInfo.experienceLevel} size="small" />
                </Box>

                {extractedInfo.requirements.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Requirements ({extractedInfo.requirements.length})
                    </Typography>
                    <List dense>
                      {extractedInfo.requirements.slice(0, 5).map((req, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={req}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                      {extractedInfo.requirements.length > 5 && (
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={`... and ${extractedInfo.requirements.length - 5} more`}
                            primaryTypographyProps={{ variant: 'body2', style: { fontStyle: 'italic' } }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}

                {extractedInfo.preferredSkills.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Preferred Skills ({extractedInfo.preferredSkills.length})
                    </Typography>
                    <List dense>
                      {extractedInfo.preferredSkills.slice(0, 5).map((skill, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={skill}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                      {extractedInfo.preferredSkills.length > 5 && (
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={`... and ${extractedInfo.preferredSkills.length - 5} more`}
                            primaryTypographyProps={{ variant: 'body2', style: { fontStyle: 'italic' } }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Analysis Results */}
          {analysis && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AI Analysis
                </Typography>
                
                {analysis.keyTerms.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Key Terms
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {analysis.keyTerms.slice(0, 10).map((term, index) => (
                        <Chip key={index} label={term} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  This analysis will be used to match candidates against your job requirements.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tips for Better Results
              </Typography>
              <List dense>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Use bullet points for requirements"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Specify required experience level"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="List specific technical skills"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Include both must-have and nice-to-have qualifications"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default JobDescriptionPage;