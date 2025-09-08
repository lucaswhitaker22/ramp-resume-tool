import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fab,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  Search,
  Refresh,
  Analytics,
  Description,
} from '@mui/icons-material';
import { jobDescriptionService } from '../services/jobDescriptionService';

interface JobDescriptionSummary {
  id: string;
  title: string;
  contentLength: number;
  wordCount: number;
  hasRequirements: boolean;
  createdAt: string;
}

interface JobDescriptionStats {
  total: number;
  withRequirements: number;
  avgContentLength: number;
  recentCount: number;
}

const JobDescriptionAdminPage: React.FC = () => {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionSummary[]>([]);
  const [stats, setStats] = useState<JobDescriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [formContent, setFormContent] = useState('');
  const [selectedJobDescription, setSelectedJobDescription] = useState<any>(null);
  
  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuJobDescriptionId, setMenuJobDescriptionId] = useState<string | null>(null);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const fetchJobDescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await jobDescriptionService.getJobDescriptions({
        search: search || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      
      setJobDescriptions(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job descriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await jobDescriptionService.getJobDescriptionStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchJobDescriptions();
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleRefresh = () => {
    fetchJobDescriptions();
    fetchStats();
  };

  const handleCreateJobDescription = async () => {
    try {
      await jobDescriptionService.createJobDescription(formContent);
      setSnackbar({
        open: true,
        message: 'Job description created successfully',
        severity: 'success'
      });
      setCreateDialogOpen(false);
      setFormContent('');
      fetchJobDescriptions();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to create job description',
        severity: 'error'
      });
    }
  };

  const handleEditJobDescription = async () => {
    if (!selectedJobDescription) return;
    
    try {
      await jobDescriptionService.updateJobDescription(selectedJobDescription.id, formContent);
      setSnackbar({
        open: true,
        message: 'Job description updated successfully',
        severity: 'success'
      });
      setEditDialogOpen(false);
      setFormContent('');
      setSelectedJobDescription(null);
      fetchJobDescriptions();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to update job description',
        severity: 'error'
      });
    }
  };

  const handleDeleteJobDescription = async () => {
    if (!selectedJobDescription) return;
    
    try {
      await jobDescriptionService.deleteJobDescription(selectedJobDescription.id);
      setSnackbar({
        open: true,
        message: 'Job description deleted successfully',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setSelectedJobDescription(null);
      fetchJobDescriptions();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete job description',
        severity: 'error'
      });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, jobDescriptionId: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuJobDescriptionId(jobDescriptionId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuJobDescriptionId(null);
  };

  const handleView = async (jobDescriptionId: string) => {
    try {
      const jobDesc = await jobDescriptionService.getJobDescription(jobDescriptionId);
      setSelectedJobDescription(jobDesc);
      setViewDialogOpen(true);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to load job description',
        severity: 'error'
      });
    }
    handleMenuClose();
  };

  const handleEdit = async (jobDescriptionId: string) => {
    try {
      const jobDesc = await jobDescriptionService.getJobDescription(jobDescriptionId);
      setSelectedJobDescription(jobDesc);
      setFormContent(jobDesc.content);
      setEditDialogOpen(true);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to load job description',
        severity: 'error'
      });
    }
    handleMenuClose();
  };

  const handleDelete = (jobDescriptionId: string) => {
    const jobDesc = jobDescriptions.find(jd => jd.id === jobDescriptionId);
    if (jobDesc) {
      setSelectedJobDescription(jobDesc);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Job Description Administration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage job descriptions for candidate analysis and matching
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
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Job Description
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description color="primary" />
                  <Box>
                    <Typography variant="h4">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Job Descriptions
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Analytics color="success" />
                  <Box>
                    <Typography variant="h4">{stats.withRequirements}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      With Requirements
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description color="info" />
                  <Box>
                    <Typography variant="h4">{Math.round(stats.avgContentLength)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg. Length (chars)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Add color="warning" />
                  <Box>
                    <Typography variant="h4">{stats.recentCount}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent (7 days)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search job descriptions..."
          value={search}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      {/* Job Descriptions Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Content Length</TableCell>
                <TableCell>Word Count</TableCell>
                <TableCell>Requirements</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobDescriptions.map((jobDesc) => (
                <TableRow key={jobDesc.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {jobDesc.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{jobDesc.contentLength.toLocaleString()}</TableCell>
                  <TableCell>{jobDesc.wordCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={jobDesc.hasRequirements ? 'Yes' : 'No'}
                      color={jobDesc.hasRequirements ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(jobDesc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, jobDesc.id)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuJobDescriptionId && handleView(menuJobDescriptionId)}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuJobDescriptionId && handleEdit(menuJobDescriptionId)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuJobDescriptionId && handleDelete(menuJobDescriptionId)}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Job Description</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={12}
            placeholder="Enter job description content..."
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {formContent.length} / 10,000 characters
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateJobDescription} 
            variant="contained"
            disabled={!formContent.trim() || formContent.length > 10000}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Job Description</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={12}
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {formContent.length} / 10,000 characters
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditJobDescription} 
            variant="contained"
            disabled={!formContent.trim() || formContent.length > 10000}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Job Description Details</DialogTitle>
        <DialogContent>
          {selectedJobDescription && (
            <Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                {selectedJobDescription.content}
              </Typography>
              {selectedJobDescription.extractedRequirements && (
                <Box>
                  <Typography variant="h6" gutterBottom>Extracted Requirements</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Required Skills:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {selectedJobDescription.extractedRequirements.requiredSkills?.map((skill: string, index: number) => (
                          <Chip key={index} label={skill} size="small" color="primary" />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Preferred Skills:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {selectedJobDescription.extractedRequirements.preferredSkills?.map((skill: string, index: number) => (
                          <Chip key={index} label={skill} size="small" color="secondary" />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Job Description</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this job description? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteJobDescription} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default JobDescriptionAdminPage;