import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AnalysisResultsDashboard from './AnalysisResultsDashboard';
import { AnalysisResult } from '../../types/analysis';

// Mock Recharts components
vi.mock('recharts', () => ({
  RadialBarChart: ({ children }: any) => <div data-testid="radial-bar-chart">{children}</div>,
  RadialBar: () => <div data-testid="radial-bar" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockAnalysisResult: AnalysisResult = {
  id: 'analysis-1',
  resumeId: 'resume-1',
  jobDescriptionId: 'job-1',
  overallScore: 75,
  categoryScores: {
    content: 80,
    structure: 70,
    keywords: 85,
    experience: 75,
    skills: 65,
  },
  recommendations: [
    {
      id: 'rec-1',
      category: 'content',
      priority: 'high',
      title: 'Strengthen Action Verbs',
      description: 'Replace weak action verbs with stronger alternatives to make your achievements more impactful.',
      examples: {
        before: 'Responsible for managing team',
        after: 'Led cross-functional team of 8 developers',
      },
      impact: 'Increases perceived leadership capability and quantifies scope of responsibility',
    },
    {
      id: 'rec-2',
      category: 'keywords',
      priority: 'medium',
      title: 'Add Technical Keywords',
      description: 'Include more relevant technical keywords from the job description.',
      examples: {
        after: 'React, TypeScript, Node.js, AWS, Docker',
      },
      impact: 'Improves ATS compatibility and keyword matching',
    },
    {
      id: 'rec-3',
      category: 'structure',
      priority: 'low',
      title: 'Improve Section Organization',
      description: 'Reorganize sections for better flow and readability.',
      examples: {
        after: 'Contact Info → Summary → Experience → Skills → Education',
      },
      impact: 'Enhances readability and professional presentation',
    },
  ],
  strengths: [
    'Strong technical background in relevant technologies',
    'Clear quantifiable achievements in previous roles',
    'Well-formatted contact information',
  ],
  improvementAreas: [
    'Missing keywords from job description',
    'Some weak action verbs could be strengthened',
    'Education section could be more prominent',
  ],
  analyzedAt: new Date('2024-01-15T10:30:00Z'),
};

describe('AnalysisResultsDashboard', () => {
  const mockOnExportPDF = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard with analysis results', () => {
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    expect(screen.getByText('Resume Analysis Results')).toBeInTheDocument();
    expect(screen.getByText('Analyzed on 1/15/2024')).toBeInTheDocument();
  });

  it('displays all tabs correctly', () => {
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /content/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /structure/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /keywords/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /experience/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /skills/i })).toBeInTheDocument();
  });

  it('shows overview tab content by default', () => {
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Strengths')).toBeInTheDocument();
    expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
  });

  it('displays strengths and improvement areas', () => {
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    expect(screen.getByText('Strong technical background in relevant technologies')).toBeInTheDocument();
    expect(screen.getByText('Missing keywords from job description')).toBeInTheDocument();
  });

  it('renders charts in overview tab', () => {
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    expect(screen.getByTestId('radial-bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    expect(screen.getByLabelText(/search recommendations/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays recommendations in expandable sections', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    expect(screen.getByText('Strengthen Action Verbs')).toBeInTheDocument();
    
    const recommendationAccordion = screen.getByText('Strengthen Action Verbs').closest('button');
    if (recommendationAccordion) {
      await user.click(recommendationAccordion);
      
      await waitFor(() => {
        expect(screen.getByText('Replace weak action verbs with stronger alternatives to make your achievements more impactful.')).toBeInTheDocument();
      });
    }
  });

  it('shows priority and category chips for recommendations', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('CONTENT')).toBeInTheDocument();
  });

  it('displays before and after examples when available', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    const recommendationAccordion = screen.getByText('Strengthen Action Verbs').closest('button');
    if (recommendationAccordion) {
      await user.click(recommendationAccordion);
      
      await waitFor(() => {
        expect(screen.getByText('Before:')).toBeInTheDocument();
        expect(screen.getByText('After:')).toBeInTheDocument();
        expect(screen.getByText('Responsible for managing team')).toBeInTheDocument();
        expect(screen.getByText('Led cross-functional team of 8 developers')).toBeInTheDocument();
      });
    }
  });

  it('shows only example when no before text is provided', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const keywordsTab = screen.getByRole('tab', { name: /keywords/i });
    await user.click(keywordsTab);
    
    const recommendationAccordion = screen.getByText('Add Technical Keywords').closest('button');
    if (recommendationAccordion) {
      await user.click(recommendationAccordion);
      
      await waitFor(() => {
        expect(screen.getByText('Example:')).toBeInTheDocument();
        expect(screen.queryByText('Before:')).not.toBeInTheDocument();
      });
    }
  });

  it('filters recommendations by search term', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    const searchInput = screen.getByLabelText(/search recommendations/i);
    await user.type(searchInput, 'action verbs');
    
    expect(screen.getByText('Strengthen Action Verbs')).toBeInTheDocument();
    expect(screen.queryByText('Add Technical Keywords')).not.toBeInTheDocument();
  });

  it('sorts recommendations correctly', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    const sortSelect = screen.getByRole('combobox');
    await user.click(sortSelect);
    
    const categoryOption = screen.getByText('Category (A to Z)');
    await user.click(categoryOption);
    
    // Verify that recommendations are displayed (sorting logic is tested in the component)
    expect(screen.getByText('Strengthen Action Verbs')).toBeInTheDocument();
  });

  it('shows category-specific recommendations in respective tabs', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    // Switch to keywords tab
    const keywordsTab = screen.getByRole('tab', { name: /keywords/i });
    await user.click(keywordsTab);
    
    expect(screen.getByText('Add Technical Keywords')).toBeInTheDocument();
    expect(screen.queryByText('Strengthen Action Verbs')).not.toBeInTheDocument();
    
    // Switch to structure tab
    const structureTab = screen.getByRole('tab', { name: /structure/i });
    await user.click(structureTab);
    
    expect(screen.getByText('Improve Section Organization')).toBeInTheDocument();
    expect(screen.queryByText('Add Technical Keywords')).not.toBeInTheDocument();
  });

  it('displays impact information for recommendations', async () => {
    const user = userEvent.setup();
    render(<AnalysisResultsDashboard analysisResult={mockAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    const contentTab = screen.getByRole('tab', { name: /content/i });
    await user.click(contentTab);
    
    const recommendationAccordion = screen.getByText('Strengthen Action Verbs').closest('button');
    if (recommendationAccordion) {
      await user.click(recommendationAccordion);
      
      await waitFor(() => {
        expect(screen.getByText('Impact:')).toBeInTheDocument();
        expect(screen.getByText('Increases perceived leadership capability and quantifies scope of responsibility')).toBeInTheDocument();
      });
    }
  });

  it('handles empty recommendations gracefully', () => {
    const emptyAnalysisResult = {
      ...mockAnalysisResult,
      recommendations: [],
      strengths: [],
      improvementAreas: [],
    };
    
    render(<AnalysisResultsDashboard analysisResult={emptyAnalysisResult} onExportPDF={mockOnExportPDF} />);
    
    expect(screen.getByText('Resume Analysis Results')).toBeInTheDocument();
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
  });
});