import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import JobDescriptionEditor from '../JobDescriptionEditor';
import theme from '../../../theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('JobDescriptionEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct placeholder text', () => {
    renderWithTheme(<JobDescriptionEditor {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/Enter the job description/)).toBeInTheDocument();
  });

  it('displays character count', () => {
    renderWithTheme(
      <JobDescriptionEditor {...defaultProps} value="Test content" showCharacterCount={true} />
    );
    
    expect(screen.getByText('12 / 5,000 characters')).toBeInTheDocument();
  });

  it('shows validation status', () => {
    renderWithTheme(
      <JobDescriptionEditor {...defaultProps} value="" showValidation={true} />
    );
    
    expect(screen.getByText('Start typing to add job description')).toBeInTheDocument();
  });

  it('shows warning for short content', () => {
    renderWithTheme(
      <JobDescriptionEditor {...defaultProps} value="Short" showValidation={true} minLength={50} />
    );
    
    expect(screen.getByText('Add at least 45 more characters')).toBeInTheDocument();
  });

  it('shows success status for valid content', () => {
    const longContent = new Array(101).join('A');
    renderWithTheme(
      <JobDescriptionEditor {...defaultProps} value={longContent} showValidation={true} minLength={50} />
    );
    
    expect(screen.getByText('Job description looks good')).toBeInTheDocument();
  });

  it('calls onChange when text is entered', () => {
    renderWithTheme(<JobDescriptionEditor {...defaultProps} />);
    
    const textArea = screen.getByRole('textbox');
    fireEvent.change(textArea, { target: { value: 'New content' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('New content');
  });

  it('prevents input when max length is reached', () => {
    const maxContent = new Array(101).join('A');
    renderWithTheme(
      <JobDescriptionEditor {...defaultProps} value={maxContent} maxLength={100} />
    );
    
    const textArea = screen.getByRole('textbox');
    fireEvent.change(textArea, { target: { value: maxContent + 'B' } });
    
    // Should not call onChange since max length is reached
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('shows clear button when content exists', () => {
    renderWithTheme(<JobDescriptionEditor {...defaultProps} value="Some content" />);
    
    const clearButton = screen.getByLabelText(/clear all/i);
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).not.toBeDisabled();
  });

  it('clears content when clear button is clicked', () => {
    renderWithTheme(<JobDescriptionEditor {...defaultProps} value="Some content" />);
    
    const clearButton = screen.getByLabelText(/clear all/i);
    fireEvent.click(clearButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('shows save button when onSave is provided', () => {
    renderWithTheme(<JobDescriptionEditor {...defaultProps} onSave={mockOnSave} />);
    
    expect(screen.getByLabelText(/save now/i)).toBeInTheDocument();
  });

  it('shows auto-save elements when enabled', async () => {
    renderWithTheme(
      <JobDescriptionEditor 
        {...defaultProps} 
        value=""
        onSave={mockOnSave}
        autoSave={true}
        autoSaveDelay={100}
      />
    );
    
    // Should show save button when onSave is provided
    expect(screen.getByLabelText(/save now/i)).toBeInTheDocument();
  });

  it('disables all inputs when disabled prop is true', () => {
    renderWithTheme(<JobDescriptionEditor {...defaultProps} disabled={true} />);
    
    const textArea = screen.getByRole('textbox');
    expect(textArea).toBeDisabled();
    
    const clearButton = screen.getByLabelText(/clear all/i);
    expect(clearButton).toBeDisabled();
  });

  it('shows error alert for validation errors', () => {
    const longContent = new Array(6001).join('A'); // Exceeds max length
    renderWithTheme(
      <JobDescriptionEditor 
        {...defaultProps} 
        value={longContent}
        maxLength={5000}
        showValidation={true}
      />
    );
    
    expect(screen.getByText(/cannot exceed 5000 characters/)).toBeInTheDocument();
  });
});