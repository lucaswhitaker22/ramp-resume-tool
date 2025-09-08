import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import { Candidate } from '../../types';

interface ScoringChartProps {
  candidates: Candidate[];
  chartType?: 'bar' | 'radar' | 'scatter';
  onChartTypeChange?: (type: 'bar' | 'radar' | 'scatter') => void;
}

const ScoringChart: React.FC<ScoringChartProps> = ({
  candidates,
  chartType = 'bar',
  onChartTypeChange,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  // Prepare data for bar chart
  const barChartData = candidates
    .filter(c => c.analysisResults)
    .map(candidate => ({
      name: candidate.name.length > 10 ? candidate.name.substring(0, 10) + '...' : candidate.name,
      fullName: candidate.name,
      overall: candidate.overallScore || 0,
      skills: candidate.analysisResults?.skillsMatch.score || 0,
      experience: candidate.analysisResults?.experienceMatch.score || 0,
      education: candidate.analysisResults?.educationMatch.score || 0,
      ats: candidate.analysisResults?.atsCompatibility.score || 0,
    }))
    .sort((a, b) => b.overall - a.overall);

  // Prepare data for radar chart (average scores)
  const radarChartData = [
    {
      category: 'Skills',
      score: candidates.reduce((sum, c) => sum + (c.analysisResults?.skillsMatch.score || 0), 0) / candidates.length,
    },
    {
      category: 'Experience',
      score: candidates.reduce((sum, c) => sum + (c.analysisResults?.experienceMatch.score || 0), 0) / candidates.length,
    },
    {
      category: 'Education',
      score: candidates.reduce((sum, c) => sum + (c.analysisResults?.educationMatch.score || 0), 0) / candidates.length,
    },
    {
      category: 'ATS',
      score: candidates.reduce((sum, c) => sum + (c.analysisResults?.atsCompatibility.score || 0), 0) / candidates.length,
    },
  ];

  // Prepare data for scatter plot
  const scatterData = candidates
    .filter(c => c.analysisResults)
    .map(candidate => ({
      x: candidate.analysisResults?.skillsMatch.score || 0,
      y: candidate.analysisResults?.experienceMatch.score || 0,
      z: candidate.overallScore || 0,
      name: candidate.name,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="body2" fontWeight="medium">
              {payload[0]?.payload?.fullName || label}
            </Typography>
            {payload.map((entry: any, index: number) => (
              <Typography key={index} variant="caption" sx={{ color: entry.color }}>
                {entry.name}: {entry.value}%
              </Typography>
            ))}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card sx={{ p: 1 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="body2" fontWeight="medium">
              {data.name}
            </Typography>
            <Typography variant="caption">Skills: {data.x}%</Typography><br />
            <Typography variant="caption">Experience: {data.y}%</Typography><br />
            <Typography variant="caption">Overall: {data.z}%</Typography>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="overall" name="Overall" fill="#2196f3" />
        <Bar dataKey="skills" name="Skills" fill="#4caf50" />
        <Bar dataKey="experience" name="Experience" fill="#ff9800" />
        <Bar dataKey="education" name="Education" fill="#9c27b0" />
        <Bar dataKey="ats" name="ATS" fill="#607d8b" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderRadarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={radarChartData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name="Average Score"
          dataKey="score"
          stroke="#2196f3"
          fill="#2196f3"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );

  const renderScatterChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Skills Score"
          domain={[0, 100]}
          label={{ value: 'Skills Score (%)', position: 'insideBottom', offset: -10 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Experience Score"
          domain={[0, 100]}
          label={{ value: 'Experience Score (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<ScatterTooltip />} />
        <Scatter data={scatterData}>
          {scatterData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getScoreColor(entry.z)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Candidate Scoring Analysis
          </Typography>
          {onChartTypeChange && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={(e) => onChartTypeChange(e.target.value as 'bar' | 'radar' | 'scatter')}
              >
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="radar">Radar Chart</MenuItem>
                <MenuItem value="scatter">Scatter Plot</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>

        {chartType === 'bar' && renderBarChart()}
        {chartType === 'radar' && renderRadarChart()}
        {chartType === 'scatter' && renderScatterChart()}

        {/* Legend */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
          {chartType === 'bar' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#2196f3', borderRadius: 1 }} />
                <Typography variant="caption">Overall</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: 1 }} />
                <Typography variant="caption">Skills</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', borderRadius: 1 }} />
                <Typography variant="caption">Experience</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#9c27b0', borderRadius: 1 }} />
                <Typography variant="caption">Education</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#607d8b', borderRadius: 1 }} />
                <Typography variant="caption">ATS</Typography>
              </Box>
            </>
          )}
          {chartType === 'scatter' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: '50%' }} />
                <Typography variant="caption">High Score (80%+)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', borderRadius: '50%' }} />
                <Typography variant="caption">Medium Score (60-79%)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', borderRadius: '50%' }} />
                <Typography variant="caption">Low Score (&lt;60%)</Typography>
              </Box>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ScoringChart;