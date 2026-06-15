import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { BusinessProvider } from '../context/BusinessContext';
import AppointmentList from '../components/AppointmentList';

// Mock appointment data
const mockAppointments = [
  {
    id: 1, service_id: 1, service_name: 'Haircut', service_duration: 30, service_price: '35.00',
    date: '2026-07-15', time: '10:00', status: 'confirmed', notes: 'First appointment',
    created_at: '2026-06-11T10:00:00.000Z',
  },
  {
    id: 2, service_id: 2, service_name: 'Massage', service_duration: 60, service_price: '75.00',
    date: '2026-07-20', time: '14:00', status: 'confirmed', notes: null,
    created_at: '2026-06-11T11:00:00.000Z',
  },
  {
    id: 3, service_id: 3, service_name: 'Facial', service_duration: 45, service_price: '55.00',
    date: '2026-06-10', time: '09:00', status: 'cancelled', notes: 'Cancelled',
    created_at: '2026-06-10T09:00:00.000Z',
  },
];

const mockPagination = { page: 1, limit: 10, total: 3, totalPages: 1 };

// Mock auth context value for logged-in user
const mockUser = { id: 2, name: 'Test User', email: 'test@test.com', role: 'customer' };

// Store user in localStorage so AuthContext picks it up
localStorage.setItem('token', 'test-token');
localStorage.setItem('user', JSON.stringify(mockUser));

function Wrapper({ children }) {
  return (
    <ToastProvider>
      <ThemeProvider>
        <BusinessProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BusinessProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}

describe('AppointmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();

    // Default mock - return appointments
    global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';

      // Auth calls
      if (urlStr.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ token: 'test-token', user: mockUser }),
        });
      }

      // Appointments API
      if (urlStr.includes('/api/appointments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            appointments: mockAppointments,
            pagination: mockPagination,
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders the header', async () => {
    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('My Appointments')).toBeInTheDocument();
    });
  });

  it('renders appointments after loading', async () => {
    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    expect(screen.getByText('Massage')).toBeInTheDocument();
    expect(screen.getByText('Facial')).toBeInTheDocument();
  });

  it('shows filter tabs', async () => {
    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  it('shows date range filter inputs', async () => {
    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    // There should be two date inputs
    const dateInputs = screen.getAllByDisplayValue('');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows cancel and reschedule buttons for confirmed upcoming appointments', async () => {
    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      // The appointment on 2026-07-15 should have cancel/reschedule buttons
      const cards = screen.getAllByText(/haircut|massage|facial/i);
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    // Both confirmed appointments should have action buttons
    await waitFor(() => {
      const cancelButtons = screen.getAllByText('Cancel');
      const rescheduleButtons = screen.getAllByText('Reschedule');
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
      expect(rescheduleButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows loading state initially', () => {
    // Make fetch slow
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    // Loading state renders skeleton cards with loading text indicators
    const skeletons = screen.getAllByRole('status', { name: /loading appointment card/i });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no appointments', async () => {
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/appointments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ appointments: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no appointments yet/i)).toBeInTheDocument();
    });
  });

  it('opens cancel dialog when cancel is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    // Wait for appointments to load
    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    // Click Cancel button
    const cancelBtn = screen.getAllByText('Cancel')[0];
    await user.click(cancelBtn);

    // Cancel dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/cancel appointment/i)).toBeInTheDocument();
    });
  });

  it('opens reschedule modal when Reschedule is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    // Wait for appointments to load
    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    // Click Reschedule button
    const rescheduleBtn = screen.getAllByText('Reschedule')[0];
    await user.click(rescheduleBtn);

    // Reschedule modal should appear
    await waitFor(() => {
      expect(screen.getByText(/reschedule appointment/i)).toBeInTheDocument();
    });
  });

  it('shows pagination when there are multiple pages', async () => {
    // Create many appointments to trigger pagination
    const manyAppointments = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      service_id: 1,
      service_name: `Service ${i + 1}`,
      service_duration: 30,
      service_price: '35.00',
      date: '2026-07-15',
      time: '10:00',
      status: 'confirmed',
      notes: null,
      created_at: '2026-06-11T10:00:00.000Z',
    }));

    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/appointments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            appointments: manyAppointments.slice(0, 10),
            pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <Wrapper>
        <AppointmentList />
      </Wrapper>
    );

    await waitFor(() => {
      // Pagination controls
      expect(screen.getByText(/next/i)).toBeInTheDocument();
      expect(screen.getByText(/prev/i)).toBeInTheDocument();
    });

    // Page numbers
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
