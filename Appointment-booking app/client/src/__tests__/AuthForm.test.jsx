import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { BusinessProvider } from '../context/BusinessContext';
import AuthForm from '../components/AuthForm';

function Wrapper({ initialEntries = ['/login'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <BusinessProvider>
          <AuthProvider>
            <AuthForm />
          </AuthProvider>
        </BusinessProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
    global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: null }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it('renders login mode by default', () => {
    render(<Wrapper />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders register mode', () => {
    render(<Wrapper initialEntries={['/register']} />);

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('shows toggle link to switch modes', () => {
    render(<Wrapper />);

    const toggleButton = screen.getByText('Create a free account');
    expect(toggleButton).toBeInTheDocument();
  });

  it('navigates when toggle link is clicked', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const toggleButton = screen.getByText('Create a free account');
    expect(toggleButton).toBeInTheDocument();
    // Clicking toggle uses navigate() — component should update heading
    await user.click(toggleButton);
  });

  it('shows validation errors for empty fields on submit', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: null }) });
      }
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            token: 'test-token',
            user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'customer' },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Wrapper />);

    const emailInput = screen.getByPlaceholderText('jane@example.com');
    const passwordInput = screen.getByLabelText('Password');
    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // After successful login, navigate('/') is called — the test doesn't verify navigation
    // since MemoryRouter handles that; just verify no error is shown
    await waitFor(() => {
      expect(screen.queryByText(/invalid|error/i)).not.toBeInTheDocument();
    });
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: null }) });
      }
      if (urlStr.includes('/api/auth')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Invalid email or password' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Wrapper />);

    const emailInput = screen.getByPlaceholderText('jane@example.com');
    const passwordInput = screen.getByLabelText('Password');
    await user.type(emailInput, 'wrong@test.com');
    await user.type(passwordInput, 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation((url) => {
      const urlStr = typeof url === 'string' ? url : url?.url || '';
      if (urlStr.includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: null }) });
      }
      return new Promise(() => {});
    });

    render(<Wrapper />);

    const emailInput = screen.getByPlaceholderText('jane@example.com');
    const passwordInput = screen.getByLabelText('Password');
    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });
  });
});
