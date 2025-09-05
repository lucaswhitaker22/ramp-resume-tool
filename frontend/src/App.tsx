import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Resume Review Tool
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          Automated resume analysis and feedback system
        </Typography>
        
        <Routes>
          <Route path="/" element={
            <Box sx={{ mt: 4 }}>
              <Typography variant="body1">
                Welcome to the Resume Review Tool! This application will help you analyze and improve your resume.
              </Typography>
            </Box>
          } />
        </Routes>
      </Box>
    </Container>
  );
}

export default App;