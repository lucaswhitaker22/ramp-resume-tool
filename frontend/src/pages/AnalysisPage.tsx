import React from 'react';
import { Typography, Box } from '@mui/material';
import { useParams } from 'react-router-dom';

const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom>
        Analysis Results
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Analysis page for ID: {id} will be implemented in future subtasks.
      </Typography>
    </Box>
  );
};

export default AnalysisPage;