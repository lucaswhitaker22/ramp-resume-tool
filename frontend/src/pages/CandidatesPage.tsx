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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button as MuiButton,
  CircularProgress,
  Alert,
  Snackbar,
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
  Refresh,
} from '@mui/icons-material';
import CandidateCard from '../components/Candidates/CandidateCard';
import CandidateComparison from '../components/Candidates/CandidateComparison';
import ScoringChart from '../components/Candidates/ScoringChart';
import CandidateFiltersComponent, { CandidateFilters } from '../components/Candidates/CandidateFilters';
import { useCandidates } from '../hooks/useCandidates';
import { Candidate } from '../types';

const CandidatesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'scatter'>('bar');
  const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const [filters, setFilters] = useState<CandidateFilters>({
    search: '',
    status: [],
    scoreRange: [0, 100],
    skillsScoreRange: [0, 100],
    experienceRange: [0, 20],
    sortBy: 'overallScore',
    sortOrder: 'desc',
  });

  // Use the candidates hook
  const {
    candidates,
    loading,
    error,
    total,
    refetch,
    updateFilters,
    updateCandidateStatus,
    bulkUpdateStatus,
    deleteCandidate,
    bulkDeleteCandidates,
  } = useCandidates({
    ...filters,
    limit: 50, // Load more candidates for better UX
  });

  // Filter candidates locally for real-time filtering
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          candidate.name.toLowerCase().includes(searchLower) ||
          candidate.fileName.toLowerCase().includes(searchLower) ||
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
  }, [candidates, filters]);

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidates(prev => 
      prev.includes(candidate.id) 
        ? prev.filter(id => id !== candidate.id)
        : [...prev, candidate.id]
    );
  };

  const handleStatusChange = async (candidateId: string, status: string) => {
    try {
      await updateCandidateStatus(candidateId, status);
      setSnackbar({
        open: true,
        message: 'Candidate status updated successfully',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update candidate status',
        severity: 'error'
      });
    }
  };

  const handleCompare = () => {
    setComparisonOpen(true);
  };

  const handleBulkAction = async (action: string) => {
    try {
      switch (action) {
        case 'shortlist':
        case 'interview':
        case 'reject':
          await bulkUpdateStatus(selectedCandidates, action);
          setSnackbar({
            open: true,
            message: `Successfully updated ${selectedCandidates.length} candidates`,
            severity: 'success'
          });
          break;
        case 'delete':
          await bulkDeleteCandidates(selectedCandidates);
          setSnackbar({
            open: true,
            message: `Successfully deleted ${selectedCandidates.length} candidates`,
            severity: 'success'
          });
          break;
        case 'export':
          // Handle export - would need to implement export functionality
          setSnackbar({
            open: true,
            message: 'Export functionality coming soon',
            severity: 'success'
          });
          break;
      }
      setBulkActionAnchor(null);
      setSelectedCandidates([]);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Bulk action failed',
        severity: 'error'
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      setSnackbar({
        open: true,
        message: 'Candidates refreshed successfully',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: 'Failed to refresh candidates',
        severity: 'error'
      });
    }
  };

  const handleDeleteCandidate = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;

    try {
      await deleteCandidate(candidateToDelete.id);
      setSnackbar({
        open: true,
        message: 'Candidate deleted successfully',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete candidate',
        severity: 'error'
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCandidateToDelete(null);
  };

  const selectedCandidateObjects = candidates.filter(c => selectedCandidates.includes(c.id));

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
            {total > 0 && ` (${total} total candidates)`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, position: 'sticky', top: 20 }}>
            <CandidateFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              candidateCount={total}
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

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Candidates Grid/List */}
          {!loading && (
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
                      onDelete={handleDeleteCandidate}
                      selected={selectedCandidates.includes(candidate.id)}
                      compact={viewMode === 'list'}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}

          {!loading && filteredCandidates.length === 0 && !error && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No candidates found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {total === 0 
                  ? 'Upload some resumes to get started' 
                  : 'Try adjusting your filters'
                }
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
        <MenuItem onClick={() => handleBulkAction('delete')}>
          <ListItemIcon>
            <Cancel fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Selected</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('export')}>
          <ListItemIcon>
            <GetApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Data</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-candidate-dialog-title"
        aria-describedby="delete-candidate-dialog-description"
      >
        <DialogTitle id="delete-candidate-dialog-title">
          Delete Candidate?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-candidate-dialog-description">
            Are you sure you want to delete "{candidateToDelete?.name}"? This action cannot be undone and will permanently remove their resume and analysis data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleDeleteCancel} color="inherit">
            Cancel
          </MuiButton>
          <MuiButton onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete Candidate
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <CandidateComparison
        candidates={selectedCandidateObjects}
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CandidatesPage;