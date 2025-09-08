import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  MoreVert,
  Person,
  Email,
  Phone,
  School,
  Work,
  Star,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { Candidate } from '../../types';

interface CandidateCardProps {
  candidate: Candidate;
  onSelect?: (candidate: Candidate) => void;
  onStatusChange?: (candidateId: string, status: string) => void;
  onCompare?: (candidate: Candidate) => void;
  selected?: boolean;
  compact?: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onSelect,
  onStatusChange,
  onCompare,
  selected = false,
  compact = false,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (status: string) => {
    onStatusChange?.(candidate.id, status);
    handleMenuClose();
  };

  const handleCardClick = () => {
    onSelect?.(candidate);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'shortlisted':
        return <CheckCircle color="success" fontSize="small" />;
      case 'rejected':
        return <Cancel color="error" fontSize="small" />;
      case 'interview':
        return <Schedule color="info" fontSize="small" />;
      default:
        return <Person color="action" fontSize="small" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shortlisted':
        return 'success';
      case 'rejected':
        return 'error';
      case 'interview':
        return 'info';
      default:
        return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const analysisResults = candidate.analysisResults;
  const overallScore = candidate.overallScore || 0;

  return (
    <Card
      sx={{
        cursor: onSelect ? 'pointer' : 'default',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 2,
        },
        height: compact ? 'auto' : 300,
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: compact ? 32 : 40, height: compact ? 32 : 40 }}>
              {candidate.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant={compact ? 'body1' : 'h6'} component="div">
                {candidate.name}
              </Typography>
              {!compact && (
                <Typography variant="caption" color="text.secondary">
                  {candidate.fileName}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={getStatusIcon(candidate.status)}
              label={candidate.status}
              size="small"
              color={getStatusColor(candidate.status) as any}
              variant="outlined"
            />
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreVert />
            </IconButton>
          </Box>
        </Box>

        {/* Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Score
            </Typography>
            <Typography variant="h6" color={`${getScoreColor(overallScore)}.main`}>
              {overallScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallScore}
            color={getScoreColor(overallScore)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Analysis Details */}
        {!compact && analysisResults && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Work fontSize="small" color="action" />
                <Typography variant="caption">Skills</Typography>
              </Box>
              <Typography variant="caption" fontWeight="medium">
                {analysisResults.skillsMatch.score}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Star fontSize="small" color="action" />
                <Typography variant="caption">Experience</Typography>
              </Box>
              <Typography variant="caption" fontWeight="medium">
                {analysisResults.experienceMatch.score}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <School fontSize="small" color="action" />
                <Typography variant="caption">Education</Typography>
              </Box>
              <Typography variant="caption" fontWeight="medium">
                {analysisResults.educationMatch.score}%
              </Typography>
            </Box>
          </Box>
        )}

        {/* Contact Info */}
        {!compact && (candidate.email || candidate.phone) && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {candidate.email && (
              <Tooltip title={candidate.email}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                    {candidate.email}
                  </Typography>
                </Box>
              </Tooltip>
            )}
            {candidate.phone && (
              <Tooltip title={candidate.phone}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="caption">
                    {candidate.phone}
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Compact mode additional info */}
        {compact && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {new Date(candidate.uploadedAt).toLocaleDateString()}
            </Typography>
            {analysisResults && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={`Skills: ${analysisResults.skillsMatch.score}%`} size="small" variant="outlined" />
                <Chip label={`Exp: ${analysisResults.experienceMatch.score}%`} size="small" variant="outlined" />
              </Box>
            )}
          </Box>
        )}
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => handleStatusChange('shortlisted')}>
          <CheckCircle fontSize="small" sx={{ mr: 1 }} />
          Shortlist
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('interview')}>
          <Schedule fontSize="small" sx={{ mr: 1 }} />
          Schedule Interview
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('rejected')}>
          <Cancel fontSize="small" sx={{ mr: 1 }} />
          Reject
        </MenuItem>
        {onCompare && (
          <MenuItem onClick={() => onCompare(candidate)}>
            <Star fontSize="small" sx={{ mr: 1 }} />
            Compare
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default CandidateCard;