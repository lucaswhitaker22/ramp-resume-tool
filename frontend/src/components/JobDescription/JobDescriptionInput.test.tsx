import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { JobDescriptionInput } from './JobDescriptionInput';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    readText: vi.fn(),
  },
});

describe('JobDescriptionInput', () => {
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct initial state', () => {
    renderWithTheme(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Job Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste or type the job description here/)).toBeInTheDocument();
    expect(screen.getByText('0 / 10,000 characters')).toBeInTheDocument();
  });

  it('displays character count correctly', () => {
    const testValue = 'This is a test job description';
    
    renderWithTheme(
      <JobDescriptionInput
        value={testValue}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(`${testValue.length} / 10,000 characters`)).toBeInTheDocument();
  });

  it('calls onChange when text is entered', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
      />
    );

    const textField = screen.getByRole('textbox');
    await user.type(textField, 'T');

    expect(mockOnChange).toHaveBeenCalledWith('T');
  });

  it('shows validation warning for short content', () => {
    const shortContent = 'Short';
    
    renderWithTheme(
      <JobDescriptionInput
        value={shortContent}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Content is quite short/)).toBeInTheDocument();
  });

  it('shows validation error when content exceeds max length', () => {
    const longContent = 'a'.repeat(10001);
    
    renderWithTheme(
      <JobDescriptionInput
        value={longContent}
        onChange={mockOnChange}
        config={{ maxLength: 10000 }}
      />
    );

    expect(screen.getByText(/Content exceeds maximum length/)).toBeInTheDocument();
    expect(screen.getByText(/1 over limit/)).toBeInTheDocument();
  });

  it('shows quality indicators for good content', () => {
    const goodContent = 'This is a comprehensive job description with requirements and responsibilities that meets the minimum length criteria for proper analysis.';
    
    renderWithTheme(
      <JobDescriptionInput
        value={goodContent}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Good length')).toBeInTheDocument();
  });

  it('clears content when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <JobDescriptionInput
        value="Some content"
        onChange={mockOnChange}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear content/i });
    await user.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('handles paste from clipboard', async () => {
    const user = userEvent.setup();
    const clipboardText = 'Pasted job description content';
    
    // Mock clipboard readText
    navigator.clipboard.readText = vi.fn().mockResolvedValue(clipboardText);
    
    renderWithTheme(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
      />
    );

    const pasteButton = screen.getByRole('button', { name: /paste from clipboard/i });
    await user.click(pasteButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(clipboardText);
    });
  });

  it('shows help text when content is empty', () => {
    renderWithTheme(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Tips for better analysis:')).toBeInTheDocument();
    expect(screen.getByText(/Include job requirements, qualifications, and skills/)).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    renderWithTheme(
      <JobDescriptionInput
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const textField = screen.getByRole('textbox');
    expect(textField).toBeDisabled();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithTheme(
      <JobDescriptionInput
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save now/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      content: 'Test content',
      characterCount: 12,
      lastSaved: expect.any(Date),
    });
  });

  it('shows warnings for missing job description elements', () => {
    const contentWithoutRequirements = 'This is a job description but it lacks specific requirements and qualifications that would help with analysis.';
    
    renderWithTheme(
      <JobDescriptionInput
        value={contentWithoutRequirements}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/Consider including job responsibilities or duties/)).toBeInTheDocument();
  });
});