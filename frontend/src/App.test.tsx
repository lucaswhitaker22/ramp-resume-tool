import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

const theme = createTheme();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          {component}
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('App', () => {
  it('renders the main heading', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('Resume Review Tool')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderWithProviders(<App />);
    expect(screen.getByText('Automated resume analysis and feedback system')).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    renderWithProviders(<App />);
    expect(screen.getByText(/Welcome to the Resume Review Tool/)).toBeInTheDocument();
  });
});