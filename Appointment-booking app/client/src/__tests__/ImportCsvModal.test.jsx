import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import ImportCsvModal from '../components/ImportCsvModal';

// ─── Helpers ───────────────────────────────────────

/** Create a mock CSV File with the given name and approximate size. */
function createMockFile(name = 'test.csv', bytes = 1024) {
  // Pad content to reach desired byte size
  const content = 'a,b,c\n' + Array(bytes - 6 > 0 ? bytes - 6 : 0).fill('x').join('');
  return new File([content], name, { type: 'text/csv' });
}

// Preserve originals for cleanup
const origCreateObjectURL = URL.createObjectURL;
const origRevokeObjectURL = URL.revokeObjectURL;

// ─── Test wrapper ──────────────────────────────────

function Wrapper({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

// ─── Default props ─────────────────────────────────

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  endpoint: '/api/import/appointments',
  templateEndpoint: '/api/import/appointments/template',
  title: 'Import Appointments',
  description: 'Upload a CSV file to bulk-create appointments.',
  onImported: vi.fn(),
};

// ─── Setup / Teardown ──────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch.mockReset();

  // Auth provider calls on mount; handle common auth urls
  global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
    if (urlStr.includes('/api/auth')) {
      // Auth endpoint calls: login, register, or me — all succeed
      return Promise.resolve({
        ok: true,
        json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
      });
    }
    return Promise.reject(new Error('Unexpected fetch: ' + urlStr));
  });
});

afterEach(() => {
  // Restore URL mocks if they were stubbed by any test
  URL.createObjectURL = origCreateObjectURL;
  URL.revokeObjectURL = origRevokeObjectURL;
});

// ─── Tests ─────────────────────────────────────────

describe('ImportCsvModal', () => {
  // ── Basic Rendering ──────────────────────────────

  it('renders nothing when open is false', () => {
    const { container } = render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} open={false} />
      </Wrapper>
    );
    expect(container.querySelector('[data-testid="import-csv-modal"]')).toBeNull();
  });

  it('renders the modal with title and description when open', () => {
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Import Appointments')).toBeInTheDocument();
    expect(screen.getByText('Upload a CSV file to bulk-create appointments.')).toBeInTheDocument();
  });

  it('shows the file upload area in its empty state', () => {
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Upload a CSV file')).toBeInTheDocument();
    expect(screen.getByText('Click to browse or drag & drop')).toBeInTheDocument();
  });

  it('shows the download template link when templateEndpoint is provided', () => {
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Download sample CSV template')).toBeInTheDocument();
  });

  it('hides template link when templateEndpoint is not provided', () => {
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} templateEndpoint={null} />
      </Wrapper>
    );

    expect(screen.queryByText('Download sample CSV template')).toBeNull();
  });

  it('shows Cancel and disabled Import CSV buttons initially', () => {
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    const importBtn = screen.getByTestId('import-btn');
    expect(importBtn).toBeInTheDocument();
    expect(importBtn).toBeDisabled();
  });

  // ── File Selection ───────────────────────────────

  it('shows file name after selecting a file', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    // Use a file with enough content so file.size / 1024 >= 1
    const file = createMockFile('my-appointments.csv', 2048);
    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), file);
    });

    expect(screen.getByTestId('file-name')).toHaveTextContent('my-appointments.csv');
    // The size display rounds to one decimal e.g. "2.0 KB"
    expect(screen.getByTestId('file-selected')).toHaveTextContent(/KB/);
  });

  it('enables the import button after selecting a file', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });

    const importBtn = screen.getByTestId('import-btn');
    expect(importBtn).not.toBeDisabled();
  });

  // ── Import Flow ──────────────────────────────────

  it('shows success results after a successful import', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Import complete: 2 created, 0 failed',
            results: { success: 2, failed: 0, errors: [] },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-results')).toBeInTheDocument();
    });

    expect(screen.getByTestId('result-success-count')).toHaveTextContent('2 created successfully');
    expect(screen.queryByTestId('result-failed-count')).toBeNull();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows failed count and error list when import has errors', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Import complete: 1 created, 2 failed',
            results: {
              success: 1, failed: 2,
              errors: [
                'Row 2: "customer_email" is required',
                'Row 3: Service "Nonexistent" not found',
              ],
            },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-results')).toBeInTheDocument();
    });

    expect(screen.getByTestId('result-success-count')).toHaveTextContent('1 created successfully');
    expect(screen.getByTestId('result-failed-count')).toHaveTextContent('2 failed');

    // Error list items
    expect(screen.getByTestId('result-error-0')).toHaveTextContent('Row 2');
    expect(screen.getByTestId('result-error-1')).toHaveTextContent('Row 3');
    expect(screen.getByText(/Errors \(2\)/)).toBeInTheDocument();
  });

  it('calls onImported callback on successful import', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Import complete',
            results: { success: 1, failed: 0, errors: [] },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onImported={onImported} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error state when import API returns an error', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'CSV file is missing required columns' }),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-error')).toHaveTextContent('CSV file is missing required columns');
  });

  it('shows error state when import throws a network error', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.reject(new Error('Network failure'));
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-error')).toHaveTextContent('Network failure');
  });

  // ── Results View Interactions ────────────────────

  it('calls onClose when Done button is clicked in results view', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Import complete',
            results: { success: 1, failed: 0, errors: [] },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} />
      </Wrapper>
    );

    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('done-btn')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('done-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Template Download ────────────────────────────

  it('downloads template via fetchWithAuth when template link is clicked', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' });
    const createObjectURL = vi.fn(() => 'blob:test-url');
    const revokeObjectURL = vi.fn();

    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/template')) {
        return Promise.resolve({
          ok: true,
          blob: async () => mockBlob,
          json: async () => ({}),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} />
      </Wrapper>
    );

    await user.click(screen.getByTestId('download-template-btn'));

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
    });
  });

  // ── State Reset ──────────────────────────────────

  it('resets state when modal is reopened', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' } }),
        });
      }
      if (urlStr.includes('/api/import') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: 'Import complete',
            results: { success: 1, failed: 0, errors: [] },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected: ' + urlStr));
    });

    const { rerender } = render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} open={true} />
      </Wrapper>
    );

    // Upload & import
    await act(async () => {
      await user.upload(screen.getByTestId('file-input'), createMockFile());
    });
    await user.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-results')).toBeInTheDocument();
    });

    // Close modal (set open=false to trigger effect cleanup)
    rerender(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} open={false} />
      </Wrapper>
    );

    // Re-open (open=false → open=true triggers the useEffect)
    rerender(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} open={true} />
      </Wrapper>
    );

    // Should be back to file upload state — no results, no file, button disabled
    expect(screen.queryByTestId('import-results')).toBeNull();
    expect(screen.getByText('Upload a CSV file')).toBeInTheDocument();
    expect(screen.getByTestId('import-btn')).toBeDisabled();
  });

  // ── Close Actions ────────────────────────────────

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} />
      </Wrapper>
    );

    await user.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} />
      </Wrapper>
    );

    await user.click(screen.getByTestId('modal-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Wrapper>
        <ImportCsvModal {...defaultProps} onClose={onClose} />
      </Wrapper>
    );

    await user.click(screen.getByTestId('cancel-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
