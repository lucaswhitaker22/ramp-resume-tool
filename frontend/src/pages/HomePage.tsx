import React from 'react';
import { Typography, Box, Card, CardContent, Button, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Upload, Assessment, People } from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

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
    </Box>
  );
};

export default HomePage;