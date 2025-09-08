import React, { useState, useEffect } from 'react';
import { Typography, Box, Card, CardContent, Button, Grid, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Upload, Assessment, People, Edit, Delete } from '@mui/icons-material';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button as MuiButton } from '@mui/material';
import { jobDescriptionService } from '../services/jobDescriptionService';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [jobDescriptions, setJobDescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchJobDescriptions = async () => {
      setLoading(true);
      console.log('HomePage: Starting to fetch job descriptions...');
      try {
        const response = await jobDescriptionService.getJobDescriptions({ limit: 10 });
        console.log('HomePage: Raw API response:', response);

        // The service already unwraps the ApiResponse, so response is PaginatedResponse directly
        if (response && response.data) {
          const data = response.data;
          console.log('HomePage: Extracted job descriptions:', data);
          console.log('HomePage: Number of job descriptions:', data.length);
          setJobDescriptions(data);

          if (data.length === 0) {
            console.warn('HomePage: No job descriptions found - this might be expected if none exist yet');
          } else {
            console.log('HomePage: First job description sample:', data[0]);
          }
        } else {
          setError('Failed to load job descriptions');
          console.error('HomePage: Failed to load job descriptions: invalid response structure');
        }
      } catch (err: any) {
        setError('Failed to fetch job descriptions');
        console.error('HomePage: Error fetching job descriptions:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDescriptions();
  }, []);

  const handleDeleteClick = (job: any) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    setDeleting(true);
    console.log('HomePage: Deleting job description:', jobToDelete.id);

    try {
      await jobDescriptionService.deleteJobDescription(jobToDelete.id);
      console.log('HomePage: Job description deleted successfully');

      // Refresh the list
      const response = await jobDescriptionService.getJobDescriptions({ limit: 10 });
      if (response && response.data) {
        setJobDescriptions(response.data);
        console.log('HomePage: Job description list refreshed after deletion');
      }
    } catch (error) {
      console.error('HomePage: Error deleting job description:', error);
      setError('Failed to delete job description');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  const features = [
    {
      title: 'Create Job Description',
      description: 'Define job requirements and qualifications for candidate matching',
      icon: <Assessment sx={{ fontSize: 48, color: 'primary.main' }} />,
      action: () => navigate('/job-description'),
      buttonText: 'Create Job',
    },
    {
      title: 'Upload Resumes',
      description: 'Upload multiple candidate resumes for analysis',
      icon: <Upload sx={{ fontSize: 48, color: 'primary.main' }} />,
      action: () => navigate('/upload'),
      buttonText: 'Start Upload',
    },
    {
      title: 'View Candidates',
      description: 'Review analyzed candidates and their scores',
      icon: <People sx={{ fontSize: 48, color: 'primary.main' }} />,
      action: () => navigate('/candidates'),
      buttonText: 'View Candidates',
    },
  ];

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Resume Review Tool
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Streamline your hiring process with AI-powered resume analysis and candidate ranking
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h5" component="h2" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {feature.description}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={feature.action}
                  fullWidth
                >
                  {feature.buttonText}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Job Descriptions Section */}
      {loading && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography>Loading job descriptions...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ mt: 4 }}>
          <Typography color="error">Error: {error}</Typography>
        </Box>
      )}

      {jobDescriptions.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            Existing Job Descriptions
          </Typography>

          <List sx={{ maxWidth: 800, mx: 'auto' }}>
            {jobDescriptions.map((job) => (
              <Card key={job.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemText
                          primary={
                            <Typography variant="h6">
                              {job.title || 'Untitled Job Description'}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {(job.content || '').substring(0, 200)}...
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Created: {new Date(job.createdAt || job.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Button
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/job-description/edit/${job.id}`)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <MuiButton
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteClick(job)}
                          sx={{ mr: 1 }}
                        >
                          Delete
                        </MuiButton>
                        <Button
                          variant="contained"
                          onClick={() => navigate(`/job-description/new?source=${job.id}`)}
                        >
                          Use as Template
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}

      {!loading && jobDescriptions.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No job descriptions found. Create your first one above!
          </Typography>
        </Box>
      )}

      {/* Job Description Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Job Description?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleDeleteCancel} color="inherit">
            Cancel
          </MuiButton>
          <MuiButton onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HomePage;