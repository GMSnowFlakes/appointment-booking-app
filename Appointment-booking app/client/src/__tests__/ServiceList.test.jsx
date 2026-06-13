import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BusinessProvider } from '../context/BusinessContext';
import ServiceList from '../components/ServiceList';

const mockServices = [
  { id: 1, name: 'Haircut', description: 'Professional haircut', duration: 30, price: 35.00, category: 'Hair', is_active: 1 },
  { id: 2, name: 'Massage', description: 'Relaxing massage', duration: 60, price: 75.00, category: 'Wellness', is_active: 1 },
  { id: 3, name: 'Facial', description: 'Deep cleansing facial', duration: 45, price: 55.00, category: 'Skincare', is_active: 1 },
];

const mockCategories = ['Hair', 'Wellness', 'Skincare'];

function Wrapper({ children }) {
  return (
    <BusinessProvider>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </BusinessProvider>
  );
}

describe('ServiceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();

    global.fetch.mockImplementation((url) => {
      if (url === '/api/services/categories') {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) });
      }
      if (typeof url === 'string' && url.startsWith('/api/services')) {
        return Promise.resolve({ ok: true, json: async () => ({ services: mockServices }) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('renders loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<Wrapper><ServiceList /></Wrapper>);
    // Loading state renders skeleton elements (no text, just animated placeholders)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders services after loading', async () => {
    render(<Wrapper><ServiceList /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });
    expect(screen.getByText('Massage')).toBeInTheDocument();
    expect(screen.getByText('Facial')).toBeInTheDocument();
  });

  it('renders category headings', async () => {
    render(<Wrapper><ServiceList /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /wellness/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /skincare/i })).toBeInTheDocument();
  });

  it('shows the search input', async () => {
    render(<Wrapper><ServiceList /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search services/i)).toBeInTheDocument();
    });
  });

  it('shows the category filter dropdown', async () => {
    render(<Wrapper><ServiceList /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });
  });

  it('filters by search query', async () => {
    const user = userEvent.setup();
    render(<Wrapper><ServiceList /></Wrapper>);

    await waitFor(() => expect(screen.getByText('Haircut')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search services/i);
    await user.type(searchInput, 'Massage');

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const searchCall = calls.find(c => typeof c[0] === 'string' && c[0].includes('search=Massage'));
      expect(searchCall).toBeTruthy();
    });
  });

  it('shows empty state when no services', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/services/categories') {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ services: [] }) });
    });

    render(<Wrapper><ServiceList /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText(/no services available/i)).toBeInTheDocument();
    });
  });

  it('shows error state on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    render(<Wrapper><ServiceList /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('displays service details correctly', async () => {
    render(<Wrapper><ServiceList /></Wrapper>);

    await waitFor(() => expect(screen.getByText('Haircut')).toBeInTheDocument());
    expect(screen.getByText(/professional haircut/i)).toBeInTheDocument();
    expect(screen.getByText(/30 min/i)).toBeInTheDocument();
    expect(screen.getByText(/\$35\.00/)).toBeInTheDocument();
  });
});
