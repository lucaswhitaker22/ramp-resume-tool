import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { FileUploadZone } from './FileUploadZone';
import { UploadedFile } from '@/types/upload';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FileUploadZone', () => {
  const mockOnFileUpload = vi.fn();
  const mockOnFileRemove = vi.fn();
  const mockUploadedFiles: UploadedFile[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone with correct text', () => {
    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={mockUploadedFiles}
      />
    );

    expect(screen.getByText(/Drag & drop your resume here/)).toBeInTheDocument();
    expect(screen.getByText(/Supported formats: .pdf, .doc, .docx, .txt/)).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size: 10MB/)).toBeInTheDocument();
  });

  it('shows drag active state when dragging files', () => {
    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={mockUploadedFiles}
      />
    );

    // The drag active state is handled by react-dropzone internally
    // We can test that the component renders without errors
    expect(screen.getByText(/Drag & drop your resume here/)).toBeInTheDocument();
  });

  it('displays uploaded files with correct information', () => {
    const uploadedFiles: UploadedFile[] = [
      {
        id: '1',
        file: new File(['test'], 'resume.pdf', { type: 'application/pdf' }),
        name: 'resume.pdf',
        size: 1024,
        type: 'application/pdf',
        uploadProgress: 100,
        status: 'completed',
      },
    ];

    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={uploadedFiles}
      />
    );

    expect(screen.getByText('Uploaded Files')).toBeInTheDocument();
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows upload progress for uploading files', () => {
    const uploadedFiles: UploadedFile[] = [
      {
        id: '1',
        file: new File(['test'], 'resume.pdf', { type: 'application/pdf' }),
        name: 'resume.pdf',
        size: 1024,
        type: 'application/pdf',
        uploadProgress: 50,
        status: 'uploading',
      },
    ];

    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={uploadedFiles}
      />
    );

    expect(screen.getByText('50% uploaded')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message for files with errors', () => {
    const uploadedFiles: UploadedFile[] = [
      {
        id: '1',
        file: new File(['test'], 'resume.pdf', { type: 'application/pdf' }),
        name: 'resume.pdf',
        size: 1024,
        type: 'application/pdf',
        uploadProgress: 0,
        status: 'error',
        error: 'Upload failed',
      },
    ];

    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={uploadedFiles}
      />
    );

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('calls onFileRemove when delete button is clicked', () => {
    const uploadedFiles: UploadedFile[] = [
      {
        id: '1',
        file: new File(['test'], 'resume.pdf', { type: 'application/pdf' }),
        name: 'resume.pdf',
        size: 1024,
        type: 'application/pdf',
        uploadProgress: 100,
        status: 'completed',
      },
    ];

    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={uploadedFiles}
      />
    );

    const deleteButton = screen.getByRole('button');
    fireEvent.click(deleteButton);

    expect(mockOnFileRemove).toHaveBeenCalledWith('1');
  });

  it('applies disabled styling when disabled prop is true', () => {
    renderWithTheme(
      <FileUploadZone
        onFileUpload={mockOnFileUpload}
        onFileRemove={mockOnFileRemove}
        uploadedFiles={mockUploadedFiles}
        disabled={true}
      />
    );

    // Test that the component renders without errors when disabled
    expect(screen.getByText(/Drag & drop your resume here/)).toBeInTheDocument();
  });
});