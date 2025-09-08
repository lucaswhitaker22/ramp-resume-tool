import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close,
  TrendingUp,
  TrendingDown,
  Remove,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { Candidate } from '../../types';

interface CandidateComparisonProps {
  candidates: Candidate[];
  open: boolean;
  onClose: () => void;
  onStatusChange?: (candidateId: string, status: string) => void;
}

const CandidateComparison: React.FC<CandidateComparisonProps> = ({
  candidates,
  open,
  onClose,
  onStatusChange,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getComparisonIcon = (score1: number, score2: number) => {
    if (score1 > score2) return <TrendingUp color="success" fontSize="small" />;
    if (score1 < score2) return <TrendingDown color="error" fontSize="small" />;
    return <Remove color="action" fontSize="small" />;
  };

  const renderCandidateCard = (candidate: Candidate, index: number) => {
    const analysis = candidate.analysisResults;
    const overallScore = candidate.overallScore || 0;

    return (
      <Card key={candidate.id} sx={{ height: '100%' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="div">
              {candidate.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => onStatusChange?.(candidate.id, 'shortlisted')}
              >
                Shortlist
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={() => onStatusChange?.(candidate.id, 'rejected')}
              >
                Reject
              </Button>
            </Box>
          </Box>

          {/* Overall Score */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Overall Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {index > 0 && getComparisonIcon(overallScore, candidates[0].overallScore || 0)}
                <Typography variant="h5" color={`${getScoreColor(overallScore)}.main`}>
                  {overallScore}%
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallScore}
              color={getScoreColor(overallScore)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {analysis && (
            <>
              {/* Skills Match */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Skills Match
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {index > 0 && getComparisonIcon(
                      analysis.skillsMatch.score,
                      candidates[0].analysisResults?.skillsMatch.score || 0
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {analysis.skillsMatch.score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analysis.skillsMatch.score}
                  color={getScoreColor(analysis.skillsMatch.score)}
                  sx={{ height: 4, borderRadius: 2, mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {analysis.skillsMatch.matchedSkills.slice(0, 3).map((skill, idx) => (
                    <Chip key={idx} label={skill} size="small" color="success" variant="outlined" />
                  ))}
                  {analysis.skillsMatch.matchedSkills.length > 3 && (
                    <Chip
                      label={`+${analysis.skillsMatch.matchedSkills.length - 3} more`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              {/* Experience Match */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Experience Match
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {index > 0 && getComparisonIcon(
                      analysis.experienceMatch.score,
                      candidates[0].analysisResults?.experienceMatch.score || 0
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {analysis.experienceMatch.score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analysis.experienceMatch.score}
                  color={getScoreColor(analysis.experienceMatch.score)}
                  sx={{ height: 4, borderRadius: 2, mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {analysis.experienceMatch.yearsOfExperience} years total experience
                </Typography>
              </Box>

              {/* Education Match */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Education Match
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {index > 0 && getComparisonIcon(
                      analysis.educationMatch.score,
                      candidates[0].analysisResults?.educationMatch.score || 0
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {analysis.educationMatch.score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analysis.educationMatch.score}
                  color={getScoreColor(analysis.educationMatch.score)}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>

              {/* ATS Compatibility */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    ATS Compatibility
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {index > 0 && getComparisonIcon(
                      analysis.atsCompatibility.score,
                      candidates[0].analysisResults?.atsCompatibility.score || 0
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {analysis.atsCompatibility.score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analysis.atsCompatibility.score}
                  color={getScoreColor(analysis.atsCompatibility.score)}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Key Insights
                  </Typography>
                  <List dense>
                    {analysis.recommendations.slice(0, 3).map((rec, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                        <ListItemText
                          primary={rec}
                          primaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Compare Candidates ({candidates.length})
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {candidates.map((candidate, index) => (
            <Grid item xs={12} md={6} lg={4} key={candidate.id}>
              {renderCandidateCard(candidate, index)}
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CandidateComparison;