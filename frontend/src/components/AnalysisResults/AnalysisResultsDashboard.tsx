import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  Search as SearchIcon,
  Work as WorkIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AnalysisResult,
  Recommendation,
  FilterOptions,
  SortOptions,
  FeedbackCategory,
  TabConfig,
  CategoryScore,
} from '../../types/analysis';

interface AnalysisResultsDashboardProps {
  analysisResult: AnalysisResult;
  onExportPDF?: () => void;
}

const CATEGORY_COLORS = {
  content: '#2196F3',
  structure: '#4CAF50',
  keywords: '#FF9800',
  experience: '#9C27B0',
  skills: '#F44336',
};

const PRIORITY_COLORS = {
  high: '#F44336',
  medium: '#FF9800',
  low: '#4CAF50',
};

const TAB_CONFIGS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: 'assessment' },
  { id: 'content', label: 'Content', icon: 'description' },
  { id: 'structure', label: 'Structure', icon: 'build' },
  { id: 'keywords', label: 'Keywords', icon: 'search' },
  { id: 'experience', label: 'Experience', icon: 'work' },
  { id: 'skills', label: 'Skills', icon: 'psychology' },
];

export const AnalysisResultsDashboard: React.FC<AnalysisResultsDashboardProps> = ({
  analysisResult,
  onExportPDF,
}) => {
  const [activeTab, setActiveTab] = useState<FeedbackCategory>('overview');
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    priorities: [],
    searchTerm: '',
  });
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'priority',
    direction: 'desc',
  });

  // Prepare data for visualizations
  const categoryScoresData: CategoryScore[] = useMemo(() => {
    return Object.entries(analysisResult.categoryScores).map(([category, score]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      score,
      maxScore: 100,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
    }));
  }, [analysisResult.categoryScores]);

  const overallScoreData = [
    {
      name: 'Score',
      value: analysisResult.overallScore,
      fill: analysisResult.overallScore >= 80 ? '#4CAF50' : 
            analysisResult.overallScore >= 60 ? '#FF9800' : '#F44336',
    },
  ];

  // Filter and sort recommendations
  const filteredAndSortedRecommendations = useMemo(() => {
    let filtered = analysisResult.recommendations;

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(rec => filters.categories.includes(rec.category));
    }

    // Apply priority filter
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(rec => filters.priorities.includes(rec.priority));
    }

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.title.toLowerCase().includes(searchLower) ||
        rec.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOptions.field) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'impact':
          comparison = a.impact.localeCompare(b.impact);
          break;
      }

      return sortOptions.direction === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [analysisResult.recommendations, filters, sortOptions]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: FeedbackCategory) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    const [field, direction] = event.target.value.split('-');
    setSortOptions({
      field: field as SortOptions['field'],
      direction: direction as SortOptions['direction'],
    });
  };

  const getRecommendationsForCategory = (category: FeedbackCategory) => {
    if (category === 'overview') return filteredAndSortedRecommendations;
    return filteredAndSortedRecommendations.filter(rec => rec.category === category);
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Overall Score */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Score
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart data={overallScoreData}>
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  fill={overallScoreData[0].fill}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="progress-label"
                  fontSize="24"
                  fontWeight="bold"
                >
                  {analysisResult.overallScore}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Category Scores */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryScoresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#8884d8">
                  {categoryScoresData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Strengths */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              Strengths
            </Typography>
            {analysisResult.strengths.map((strength, index) => (
              <Alert key={index} severity="success" sx={{ mb: 1 }}>
                {strength}
              </Alert>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Improvement Areas */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="warning.main">
              Areas for Improvement
            </Typography>
            {analysisResult.improvementAreas.map((area, index) => (
              <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                {area}
              </Alert>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderRecommendations = (recommendations: Recommendation[]) => (
    <Box>
      {recommendations.map((recommendation) => (
        <Accordion key={recommendation.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" width="100%">
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {recommendation.title}
              </Typography>
              <Chip
                label={recommendation.priority.toUpperCase()}
                color={
                  recommendation.priority === 'high' ? 'error' :
                  recommendation.priority === 'medium' ? 'warning' : 'success'
                }
                size="small"
                sx={{ mr: 2 }}
              />
              <Chip
                label={recommendation.category.toUpperCase()}
                variant="outlined"
                size="small"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1" paragraph>
              {recommendation.description}
            </Typography>
            
            {recommendation.examples.before && (
              <Box mb={2}>
                <Typography variant="subtitle2" color="error.main">
                  Before:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="body2">
                    {recommendation.examples.before}
                  </Typography>
                </Paper>
              </Box>
            )}
            
            <Box mb={2}>
              <Typography variant="subtitle2" color="success.main">
                {recommendation.examples.before ? 'After:' : 'Example:'}
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="body2">
                  {recommendation.examples.after}
                </Typography>
              </Paper>
            </Box>
            
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Impact:</strong> {recommendation.impact}
              </Typography>
            </Alert>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Resume Analysis Results
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Analyzed on {new Date(analysisResult.analyzedAt).toLocaleDateString()}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          {TAB_CONFIGS.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              value={tab.id}
              icon={
                tab.id === 'overview' ? <AssessmentIcon /> :
                tab.id === 'content' ? <TrendingUpIcon /> :
                tab.id === 'structure' ? <BuildIcon /> :
                tab.id === 'keywords' ? <SearchIcon /> :
                tab.id === 'experience' ? <WorkIcon /> :
                <PsychologyIcon />
              }
            />
          ))}
        </Tabs>
      </Box>

      {activeTab === 'overview' ? (
        renderOverviewTab()
      ) : (
        <Box>
          {/* Filters and Sorting */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search recommendations"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={`${sortOptions.field}-${sortOptions.direction}`}
                  onChange={handleSortChange}
                  label="Sort by"
                >
                  <MenuItem value="priority-desc">Priority (High to Low)</MenuItem>
                  <MenuItem value="priority-asc">Priority (Low to High)</MenuItem>
                  <MenuItem value="category-asc">Category (A to Z)</MenuItem>
                  <MenuItem value="category-desc">Category (Z to A)</MenuItem>
                  <MenuItem value="impact-asc">Impact (A to Z)</MenuItem>
                  <MenuItem value="impact-desc">Impact (Z to A)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Recommendations */}
          {renderRecommendations(getRecommendationsForCategory(activeTab))}
        </Box>
      )}
    </Paper>
  );
};

export default AnalysisResultsDashboard;