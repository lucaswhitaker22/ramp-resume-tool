import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import App from '../App';
import theme from '../theme';

const renderWithProviders = (component: React.ReactElement, initialEntries = ['/']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('App', () => {
  it('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays navigation items', () => {
    renderWithProviders(<App />);
    const navigation = screen.getByRole('banner');
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Job Description' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Resumes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Candidates' })).toBeInTheDocument();
  });

  it('displays home page content by default', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('Streamline your hiring process with AI-powered resume analysis and candidate ranking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Upload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Candidates' })).toBeInTheDocument();
  });
});