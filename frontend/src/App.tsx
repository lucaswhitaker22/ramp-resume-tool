import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import CandidatesPage from './pages/CandidatesPage';
import JobDescriptionPage from './pages/JobDescriptionPage';
import JobDescriptionAdminPage from './pages/JobDescriptionAdminPage';

const App: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/job-description" element={<JobDescriptionPage />} />
            <Route path="/job-description/admin" element={<JobDescriptionAdminPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analysis/:id" element={<AnalysisPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
          </Routes>
        </Box>
      </Container>
    </Layout>
  );
};

export default App;