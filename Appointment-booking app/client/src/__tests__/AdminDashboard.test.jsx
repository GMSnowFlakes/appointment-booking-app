import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { BusinessProvider } from '../context/BusinessContext';
import AdminDashboard from '../components/AdminDashboard';

// ─── Mock Data ──────────────────────────────────

const mockAdminUser = { id: 1, name: 'Admin', email: 'admin@demo.com', role: 'admin' };

const mockTemplateList = [
  { id: 'barbershop', name: 'Barbershop', roleCount: 1, serviceCount: 8, custom: false },
  { id: 'salon', name: 'Salon & Spa', roleCount: 3, serviceCount: 10, custom: false },
  { id: 'custom-consulting', name: 'Custom Consulting', roleCount: 2, serviceCount: 4, custom: true },
];

const mockTemplateDetail = {
  template: {
    roles: [{ title: 'Barber' }, { title: 'Master Barber' }],
    services: [
      { name: 'Classic Haircut', duration: 30, price: 30.00, category: 'Haircuts' },
      { name: 'Beard Trim', duration: 15, price: 15.00, category: 'Grooming' },
    ],
  },
  custom: false,
};

// ─── Helpers ────────────────────────────────────

/**
 * Set up localStorage with an admin user so AuthContext
 * immediately has a logged-in admin (avoids async login).
 */
function setupAdminAuth() {
  localStorage.setItem('token', 'test-admin-token');
  localStorage.setItem('user', JSON.stringify(mockAdminUser));
}

/**
 * Default fetch mock — routes requests to the correct response.
 * Override by calling global.fetch.mockImplementation() again in individual tests.
 */
function defaultFetchMock(url) {
  const urlStr = typeof url === 'string' ? url : url?.url || '';

  // Business settings (called by BusinessProvider on mount)
  if (urlStr === '/api/settings') {
    return Promise.resolve({
      ok: true,
      json: async () => ({ settings: { business_type: 'salon', business_name: 'Test Business', primary_color: '#e11d48', category_colors: {} } }),
    });
  }

  // Template list
  if (urlStr === '/api/admin/templates') {
    return Promise.resolve({
      ok: true,
      json: async () => ({ templates: mockTemplateList }),
    });
  }

  // Disabled templates list
  if (urlStr === '/api/admin/templates/disabled') {
    return Promise.resolve({
      ok: true,
      json: async () => ({ disabled: [] }),
    });
  }

  // Template detail (any /api/admin/templates/:type)
  if (urlStr.startsWith('/api/admin/templates/') && !urlStr.endsWith('/disabled') && !urlStr.endsWith('/import')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockTemplateDetail,
    });
  }

  // Default fallback
  return Promise.resolve({
    ok: true,
    json: async () => ({}),
  });
}

// ─── Wrapper ────────────────────────────────────

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/admin/templates']}>
      <ThemeProvider>
        <ToastProvider>
          <BusinessProvider>
            <AuthProvider>
              <Routes>
                <Route path="admin/:tab" element={children} />
              </Routes>
            </AuthProvider>
          </BusinessProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

// ─── Setup / Teardown ───────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch.mockReset();
  global.fetch.mockImplementation(defaultFetchMock);
  localStorage.clear();
  setupAdminAuth();
});

// ─── Tests ──────────────────────────────────────

describe('AdminDashboard — TemplatesTab', () => {
  it('renders template list after loading', async () => {
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    expect(screen.getByText('Salon & Spa')).toBeInTheDocument();
    expect(screen.getByText('Custom Consulting')).toBeInTheDocument();
  });

  it('shows service and role counts on each template card', async () => {
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/8 services/)).toBeInTheDocument();
    });

    expect(screen.getByText(/1 roles/)).toBeInTheDocument();
  });

  it('opens editor modal with loading state when clicking Edit on a template card', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    // Wait for template cards to render
    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    // Click the Edit button on the barbershop card
    // Defer the template detail fetch so we can observe the loading state
    let resolveDetailFetch;
    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.startsWith('/api/admin/templates/barbershop') && !urlStr.endsWith('/disabled') && !urlStr.endsWith('/import')) {
        return new Promise((resolve) => {
          resolveDetailFetch = () => {
            defaultFetchMock(url, opts).then(resolve);
          };
        });
      }
      return defaultFetchMock(url, opts);
    });

    const editBtns = screen.getAllByText('Edit');
    await user.click(editBtns[0]);

    // The edit modal should appear with "Edit Template" heading
    await waitFor(() => {
      expect(screen.getByText('Edit Template')).toBeInTheDocument();
    });

    // Check that the roles textarea shows "Loading template..." placeholder
    // Use getAllByPlaceholderText since both roles and services textareas have the same placeholder
    const loadingAreas = screen.getAllByPlaceholderText('Loading template...');
    expect(loadingAreas.length).toBe(2);
    expect(loadingAreas[0]).toBeInTheDocument();

    // Resolve the fetch so data loads
    await act(async () => { resolveDetailFetch(); });

    // Wait for the fetch to complete and pre-fill the data
    // Use getAllByDisplayValue with a filter since 'Barber' appears in both
    // the label input (value='Barbershop') and the roles textarea
    const rolesTextarea = (await screen.findAllByDisplayValue(/Barber/))
      .find(el => el.tagName === 'TEXTAREA');
    expect(rolesTextarea).toHaveValue('Barber\nMaster Barber');

    // Verify the services textarea was also pre-filled
    const servicesTextarea = screen.getByDisplayValue(/Classic Haircut/);
    expect(servicesTextarea).toBeInTheDocument();
    expect(servicesTextarea.value).toContain('Beard Trim');
  });

  it('fetches template detail API when editing a template', async () => {
    const fetchSpy = vi.fn(defaultFetchMock);
    global.fetch.mockImplementation(fetchSpy);

    const user = userEvent.setup();
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    // Click the Edit button on the barbershop card
    const editBtns = screen.getAllByText('Edit');
    await user.click(editBtns[0]);

    // Wait for the fetch call to /api/admin/templates/barbershop
    await waitFor(() => {
      const detailCalls = fetchSpy.mock.calls.filter(
        ([url]) => typeof url === 'string' && url === '/api/admin/templates/barbershop'
      );
      expect(detailCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('pre-fills roles as newline-separated text in the editor', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByText('Edit');
    await user.click(editBtns[0]);

    const rolesTextarea = await screen.findByDisplayValue(/Master Barber/);
    expect(rolesTextarea).toHaveValue('Barber\nMaster Barber');
  });

  it('pre-fills services as comma-separated CSV lines in the editor', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByText('Edit');
    await user.click(editBtns[0]);

    // Wait for data and verify services format: "name, duration, price, category"
    const servicesTextarea = await screen.findByDisplayValue(/Classic Haircut/);
    expect(servicesTextarea.value).toContain('Classic Haircut, 30, 30, Haircuts');
    expect(servicesTextarea.value).toContain('Beard Trim, 15, 15, Grooming');
  });

  it('shows normal placeholders when opening new template editor (no loading)', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    // Click "New Template" button
    const newTemplateBtn = screen.getByText('New Template');
    await user.click(newTemplateBtn);

    // Should show "Create New Template" heading
    expect(screen.getByText('Create New Template')).toBeInTheDocument();

    // Should show normal placeholder (not "Loading template...")
    expect(screen.getByPlaceholderText(/One role per line/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/One per line: Name/)).toBeInTheDocument();

    // "Loading template..." should NOT be present
    expect(screen.queryByPlaceholderText('Loading template...')).toBeNull();
  });

  it('sets loading state false when template detail fetch fails', async () => {
    const user = userEvent.setup();

    // Override fetch to fail for template detail
    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.startsWith('/api/admin/templates/barbershop')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Not found' }),
        });
      }
      return defaultFetchMock(url, opts);
    });

    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Barbershop')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByText('Edit');
    await user.click(editBtns[0]);

    // Modal should open with "Edit Template" heading
    await waitFor(() => {
      expect(screen.getByText('Edit Template')).toBeInTheDocument();
    });

    // After fetch failure, loading state clears and normal placeholders show
    // The roles textarea should show the normal placeholder instead of "Loading template..."
    await waitFor(() => {
      // Since the fetch returned !ok, loadingTemplate is set to false
      // and the fields remain empty. The normal placeholder should show.
      const rolesTextarea = screen.getByPlaceholderText(/One role per line/);
      expect(rolesTextarea).toBeInTheDocument();
    });
  });

  // ── Edge Cases ──────────────────────────────────

  it('handles empty template with no services gracefully', async () => {
    const user = userEvent.setup();

    // Override detail response with no services/roles
    global.fetch.mockImplementation((url, opts) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.startsWith('/api/admin/templates/custom-consulting')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            template: { roles: [], services: [] },
            custom: true,
          }),
        });
      }
      return defaultFetchMock(url, opts);
    });

    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Consulting')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByText('Edit');
    // Find the Edit button for Custom Consulting (it's the third card)
    await user.click(editBtns[2]);

    await waitFor(() => {
      expect(screen.getByText('Edit Template')).toBeInTheDocument();
    });

    // After loading completes, roles and services should be empty (no crash)
    await waitFor(() => {
      const rolesTextarea = screen.getByPlaceholderText(/One role per line/);
      expect(rolesTextarea).toHaveValue('');
    });

    const servicesTextarea = screen.getByPlaceholderText(/One per line: Name/);
    expect(servicesTextarea).toHaveValue('');
  });

  it('shows Custom tag on custom template cards', async () => {
    render(
      <Wrapper>
        <AdminDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Consulting')).toBeInTheDocument();
    });

    // Custom tag should appear
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
