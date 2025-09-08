import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Slider,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  Clear,
  FilterList,
} from '@mui/icons-material';

export interface CandidateFilters {
  search: string;
  status: string[];
  scoreRange: [number, number];
  skillsScoreRange: [number, number];
  experienceRange: [number, number];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface CandidateFiltersProps {
  filters: CandidateFilters;
  onFiltersChange: (filters: CandidateFilters) => void;
  candidateCount: number;
  filteredCount: number;
}

const CandidateFiltersComponent: React.FC<CandidateFiltersProps> = ({
  filters,
  onFiltersChange,
  candidateCount,
  filteredCount,
}) => {
  const handleFilterChange = (key: keyof CandidateFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    handleFilterChange('status', newStatuses);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      status: [],
      scoreRange: [0, 100],
      skillsScoreRange: [0, 100],
      experienceRange: [0, 20],
      sortBy: 'overallScore',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.status.length > 0 ||
    filters.scoreRange[0] !== 0 ||
    filters.scoreRange[1] !== 100 ||
    filters.skillsScoreRange[0] !== 0 ||
    filters.skillsScoreRange[1] !== 100 ||
    filters.experienceRange[0] !== 0 ||
    filters.experienceRange[1] !== 20;

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'default' },
    { value: 'processing', label: 'Processing', color: 'info' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'shortlisted', label: 'Shortlisted', color: 'success' },
    { value: 'interview', label: 'Interview', color: 'info' },
    { value: 'rejected', label: 'Rejected', color: 'error' },
  ];

  const sortOptions = [
    { value: 'overallScore', label: 'Overall Score' },
    { value: 'name', label: 'Name' },
    { value: 'uploadedAt', label: 'Upload Date' },
    { value: 'skillsScore', label: 'Skills Score' },
    { value: 'experienceScore', label: 'Experience Score' },
    { value: 'educationScore', label: 'Education Score' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList />
          <Typography variant="h6">
            Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ({filteredCount} of {candidateCount} candidates)
          </Typography>
        </Box>
        {hasActiveFilters && (
          <Button
            size="small"
            startIcon={<Clear />}
            onClick={clearAllFilters}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        label="Search candidates"
        placeholder="Search by name, email, or skills..."
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: filters.search && (
            <IconButton
              size="small"
              onClick={() => handleFilterChange('search', '')}
            >
              <Clear />
            </IconButton>
          ),
        }}
      />

      {/* Quick Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {statusOptions.map((status) => (
          <Chip
            key={status.value}
            label={status.label}
            color={filters.status.includes(status.value) ? status.color as any : 'default'}
            variant={filters.status.includes(status.value) ? 'filled' : 'outlined'}
            onClick={() => handleStatusToggle(status.value)}
            size="small"
          />
        ))}
      </Box>

      {/* Advanced Filters */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2">Advanced Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Overall Score Range */}
            <Box>
              <Typography variant="body2" gutterBottom>
                Overall Score: {filters.scoreRange[0]}% - {filters.scoreRange[1]}%
              </Typography>
              <Slider
                value={filters.scoreRange}
                onChange={(_, value) => handleFilterChange('scoreRange', value)}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />
            </Box>

            {/* Skills Score Range */}
            <Box>
              <Typography variant="body2" gutterBottom>
                Skills Score: {filters.skillsScoreRange[0]}% - {filters.skillsScoreRange[1]}%
              </Typography>
              <Slider
                value={filters.skillsScoreRange}
                onChange={(_, value) => handleFilterChange('skillsScoreRange', value)}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />
            </Box>

            {/* Experience Range */}
            <Box>
              <Typography variant="body2" gutterBottom>
                Years of Experience: {filters.experienceRange[0]} - {filters.experienceRange[1]} years
              </Typography>
              <Slider
                value={filters.experienceRange}
                onChange={(_, value) => handleFilterChange('experienceRange', value)}
                valueLabelDisplay="auto"
                min={0}
                max={20}
                marks={[
                  { value: 0, label: '0' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20+' },
                ]}
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Sorting */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={filters.sortBy}
            label="Sort by"
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={filters.sortOrder}
            label="Order"
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
          >
            <MenuItem value="desc">High to Low</MenuItem>
            <MenuItem value="asc">Low to High</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default CandidateFiltersComponent;