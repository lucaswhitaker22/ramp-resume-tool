import React, { useState, useMemo } from 'react';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Checkbox,
  FormControlLabel,
  Fab,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ViewModule,
  ViewList,
  Compare,
  CheckCircle,
  Cancel,
  Schedule,
  GetApp,
  MoreVert,
} from '@mui/icons-material';
import CandidateCard from '../components/Candidates/CandidateCard';
import CandidateComparison from '../components/Candidates/CandidateComparison';
import ScoringChart from '../components/Candidates/ScoringChart';
import CandidateFiltersComponent, { CandidateFilters } from '../components/Candidates/CandidateFilters';
import { Candidate } from '../types';

// Mock data for demonstration
const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0123',
    fileName: 'john_smith_resume.pdf',
    uploadedAt: '2024-01-15T10:30:00Z',
    status: 'completed',
    overallScore: 85,
    analysisResults: {
      id: '1',
      candidateId: '1',
      jobDescriptionId: 'job1',
      overallScore: 85,
      skillsMatch: {
        score: 90,
        matchedSkills: ['React', 'TypeScript', 'Node.js', 'AWS'],
        missingSkills: ['Docker', 'Kubernetes'],
        additionalSkills: ['Python', 'MongoDB'],
      },
      experienceMatch: {
        score: 80,
        yearsOfExperience: 5,
        relevantExperience: 4,
        industryMatch: true,
      },
      educationMatch: {
        score: 75,
        degreeMatch: true,
        fieldOfStudyMatch: true,
        institutionPrestige: 8,
      },
      atsCompatibility: {
        score: 88,
        issues: ['Missing keywords in summary'],
        suggestions: ['Add more technical keywords', 'Improve formatting'],
      },
      recommendations: [
        'Strong technical skills match',
        'Good industry experience',
        'Consider for senior role',
      ],
      createdAt: '2024-01-15T10:35:00Z',
    },
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    fileName: 'sarah_johnson_cv.pdf',
    uploadedAt: '2024-01-15T11:00:00Z',
    status: 'completed',
    overallScore: 78,
    analysisResults: {
      id: '2',
      candidateId: '2',
      jobDescriptionId: 'job1',
      overallScore: 78,
      skillsMatch: {
        score: 75,
        matchedSkills: ['JavaScript', 'React', 'CSS'],
        missingSkills: ['TypeScript', 'Node.js', 'AWS'],
        additionalSkills: ['Vue.js', 'Sass'],
      },
      experienceMatch: {
        score: 85,
        yearsOfExperience: 6,
        relevantExperience: 5,
        industryMatch: true,
      },
      educationMatch: {
        score: 70,
        degreeMatch: true,
        fieldOfStudyMatch: false,
        institutionPrestige: 6,
      },
      atsCompatibility: {
        score: 82,
        issues: ['Some formatting issues'],
        suggestions: ['Improve section headers', 'Add more quantified achievements'],
      },
      recommendations: [
        'Solid experience level',
        'Good cultural fit potential',
        'May need technical upskilling',
      ],
      createdAt: '2024-01-15T11:05:00Z',
    },
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    fileName: 'mike_chen_resume.pdf',
    uploadedAt: '2024-01-15T12:00:00Z',
    status: 'completed',
    overallScore: 92,
    analysisResults: {
      id: '3',
      candidateId: '3',
      jobDescriptionId: 'job1',
      overallScore: 92,
      skillsMatch: {
        score: 95,
        matchedSkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker', 'Kubernetes'],
        missingSkills: [],
        additionalSkills: ['GraphQL', 'Redis', 'Elasticsearch'],
      },
      experienceMatch: {
        score: 90,
        yearsOfExperience: 8,
        relevantExperience: 7,
        industryMatch: true,
      },
      educationMatch: {
        score: 85,
        degreeMatch: true,
        fieldOfStudyMatch: true,
        institutionPrestige: 9,
      },
      atsCompatibility: {
        score: 95,
        issues: [],
        suggestions: ['Excellent resume format'],
      },
      recommendations: [
        'Exceptional technical skills',
        'Strong leadership experience',
        'Perfect fit for senior/lead role',
      ],
      createdAt: '2024-01-15T12:05:00Z',
    },
  },
];

const CandidatesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'scatter'>('bar');
  const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);
  
  const [filters, setFilters] = useState<CandidateFilters>({
    search: '',
    status: [],
    scoreRange: [0, 100],
    skillsScoreRange: [0, 100],
    experienceRange: [0, 20],
    sortBy: 'overallScore',
    sortOrder: 'desc',
  });

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    let filtered = mockCandidates.filter(candidate => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          candidate.name.toLowerCase().includes(searchLower) ||
          candidate.email?.toLowerCase().includes(searchLower) ||
          candidate.analysisResults?.skillsMatch.matchedSkills.some(skill => 
            skill.toLowerCase().includes(searchLower)
          );
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(candidate.status)) {
        return false;
      }

      // Score range filter
      const score = candidate.overallScore || 0;
      if (score < filters.scoreRange[0] || score > filters.scoreRange[1]) {
        return false;
      }

      // Skills score filter
      const skillsScore = candidate.analysisResults?.skillsMatch.score || 0;
      if (skillsScore < filters.skillsScoreRange[0] || skillsScore > filters.skillsScoreRange[1]) {
        return false;
      }

      // Experience filter
      const experience = candidate.analysisResults?.experienceMatch.yearsOfExperience || 0;
      if (experience < filters.experienceRange[0] || experience > filters.experienceRange[1]) {
        return false;
      }

      return true;
    });

    // Sort candidates
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'uploadedAt':
          aValue = new Date(a.uploadedAt);
          bValue = new Date(b.uploadedAt);
          break;
        case 'skillsScore':
          aValue = a.analysisResults?.skillsMatch.score || 0;
          bValue = b.analysisResults?.skillsMatch.score || 0;
          break;
        case 'experienceScore':
          aValue = a.analysisResults?.experienceMatch.score || 0;
          bValue = b.analysisResults?.experienceMatch.score || 0;
          break;
        case 'educationScore':
          aValue = a.analysisResults?.educationMatch.score || 0;
          bValue = b.analysisResults?.educationMatch.score || 0;
          break;
        default:
          aValue = a.overallScore || 0;
          bValue = b.overallScore || 0;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [filters]);

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidates(prev => 
      prev.includes(candidate.id) 
        ? prev.filter(id => id !== candidate.id)
        : [...prev, candidate.id]
    );
  };

  const handleStatusChange = (candidateId: string, status: string) => {
    // In a real app, this would make an API call
    console.log(`Changing status of candidate ${candidateId} to ${status}`);
  };

  const handleCompare = () => {
    setComparisonOpen(true);
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} for candidates:`, selectedCandidates);
    setBulkActionAnchor(null);
    setSelectedCandidates([]);
  };

  const selectedCandidateObjects = mockCandidates.filter(c => selectedCandidates.includes(c.id));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Candidates Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and manage candidate applications with AI-powered analysis
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={viewMode === 'grid' ? 'contained' : 'outlined'}
            startIcon={<ViewModule />}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            startIcon={<ViewList />}
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, position: 'sticky', top: 20 }}>
            <CandidateFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              candidateCount={mockCandidates.length}
              filteredCount={filteredCandidates.length}
            />
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          {/* Analytics Chart */}
          <Box sx={{ mb: 3 }}>
            <ScoringChart
              candidates={filteredCandidates}
              chartType={chartType}
              onChartTypeChange={setChartType}
            />
          </Box>

          {/* Bulk Actions */}
          {selectedCandidates.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedCandidates.length === filteredCandidates.length}
                    indeterminate={selectedCandidates.length > 0 && selectedCandidates.length < filteredCandidates.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCandidates(filteredCandidates.map(c => c.id));
                      } else {
                        setSelectedCandidates([]);
                      }
                    }}
                  />
                }
                label={`${selectedCandidates.length} selected`}
              />
              <Button
                variant="outlined"
                startIcon={<Compare />}
                onClick={handleCompare}
                disabled={selectedCandidates.length < 2}
              >
                Compare
              </Button>
              <Button
                variant="outlined"
                startIcon={<MoreVert />}
                onClick={(e) => setBulkActionAnchor(e.currentTarget)}
              >
                Bulk Actions
              </Button>
            </Box>
          )}

          {/* Candidates Grid/List */}
          <Grid container spacing={2}>
            {filteredCandidates.map((candidate) => (
              <Grid 
                item 
                xs={12} 
                sm={viewMode === 'grid' ? 6 : 12} 
                lg={viewMode === 'grid' ? 4 : 12} 
                key={candidate.id}
              >
                <Box sx={{ position: 'relative' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedCandidates.includes(candidate.id)}
                        onChange={() => handleCandidateSelect(candidate)}
                      />
                    }
                    label=""
                    sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
                  />
                  <CandidateCard
                    candidate={candidate}
                    onSelect={handleCandidateSelect}
                    onStatusChange={handleStatusChange}
                    selected={selectedCandidates.includes(candidate.id)}
                    compact={viewMode === 'list'}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>

          {filteredCandidates.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No candidates found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or upload more resumes
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Floating Compare Button */}
      {selectedCandidates.length >= 2 && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCompare}
        >
          <Badge badgeContent={selectedCandidates.length} color="secondary">
            <Compare />
          </Badge>
        </Fab>
      )}

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkActionAnchor}
        open={Boolean(bulkActionAnchor)}
        onClose={() => setBulkActionAnchor(null)}
      >
        <MenuItem onClick={() => handleBulkAction('shortlist')}>
          <ListItemIcon>
            <CheckCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>Shortlist Selected</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('interview')}>
          <ListItemIcon>
            <Schedule fontSize="small" />
          </ListItemIcon>
          <ListItemText>Schedule Interviews</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('reject')}>
          <ListItemIcon>
            <Cancel fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reject Selected</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleBulkAction('export')}>
          <ListItemIcon>
            <GetApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Data</ListItemText>
        </MenuItem>
      </Menu>

      {/* Comparison Dialog */}
      <CandidateComparison
        candidates={selectedCandidateObjects}
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </Box>
  );
};

export default CandidatesPage;