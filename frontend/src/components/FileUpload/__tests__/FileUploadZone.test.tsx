import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import FileUploadZone from '../FileUploadZone';
import theme from '../../../theme';
import { UploadProgress } from '../../../types';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FileUploadZone', () => {
  const mockOnFilesSelected = vi.fn();
  const mockOnRemoveFile = vi.fn();

  const defaultProps = {
    onFilesSelected: mockOnFilesSelected,
    uploadProgress: [],
    onRemoveFile: mockOnRemoveFile,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone with correct text', () => {
    renderWithTheme(<FileUploadZone {...defaultProps} />);
    
    expect(screen.getByText('Drag & drop resume files here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: .pdf, .doc, .docx (max 10MB each)')).toBeInTheDocument();
  });

  it('displays file list when upload progress is provided', () => {
    const uploadProgress: UploadProgress[] = [
      {
        fileName: 'resume1.pdf',
        progress: 50,
        status: 'uploading',
      },
      {
        fileName: 'resume2.pdf',
        progress: 100,
        status: 'completed',
      },
    ];

    renderWithTheme(
      <FileUploadZone {...defaultProps} uploadProgress={uploadProgress} />
    );

    expect(screen.getByText('Files (2)')).toBeInTheDocument();
    expect(screen.getByText('resume1.pdf')).toBeInTheDocument();
    expect(screen.getByText('resume2.pdf')).toBeInTheDocument();
    expect(screen.getByText('uploading')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows progress bar for uploading files', () => {
    const uploadProgress: UploadProgress[] = [
      {
        fileName: 'resume1.pdf',
        progress: 75,
        status: 'uploading',
      },
    ];

    renderWithTheme(
      <FileUploadZone {...defaultProps} uploadProgress={uploadProgress} />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message for failed uploads', () => {
    const uploadProgress: UploadProgress[] = [
      {
        fileName: 'resume1.pdf',
        progress: 0,
        status: 'error',
        error: 'Upload failed',
      },
    ];

    renderWithTheme(
      <FileUploadZone {...defaultProps} uploadProgress={uploadProgress} />
    );

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('calls onRemoveFile when delete button is clicked', () => {
    const uploadProgress: UploadProgress[] = [
      {
        fileName: 'resume1.pdf',
        progress: 100,
        status: 'completed',
      },
    ];

    renderWithTheme(
      <FileUploadZone {...defaultProps} uploadProgress={uploadProgress} />
    );

    const deleteButton = screen.getByTestId('DeleteIcon').closest('button');
    fireEvent.click(deleteButton!);

    expect(mockOnRemoveFile).toHaveBeenCalledWith('resume1.pdf');
  });

  it('disables delete button for uploading files', () => {
    const uploadProgress: UploadProgress[] = [
      {
        fileName: 'resume1.pdf',
        progress: 50,
        status: 'uploading',
      },
    ];

    renderWithTheme(
      <FileUploadZone {...defaultProps} uploadProgress={uploadProgress} />
    );

    const deleteButton = screen.getByTestId('DeleteIcon').closest('button');
    expect(deleteButton).toBeDisabled();
  });

  it('shows disabled state when disabled prop is true', () => {
    renderWithTheme(<FileUploadZone {...defaultProps} disabled={true} />);
    
    const uploadZone = screen.getByText('Drag & drop resume files here, or click to select').closest('div');
    expect(uploadZone?.parentElement).toHaveStyle('opacity: 0.6');
  });
});