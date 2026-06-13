import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import AuthForm from '../components/AuthForm';

function Wrapper({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

describe('AuthForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  it('renders login mode by default', () => {
    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders register mode', () => {
    render(
      <Wrapper>
        <AuthForm mode="register" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('shows toggle link to switch modes', () => {
    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    const toggleButton = screen.getByText(/register/i);
    expect(toggleButton).toBeInTheDocument();
  });

  it('calls onToggle when toggle link is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    await user.click(screen.getByText(/register/i));
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors for empty fields on submit', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'customer' },
      }),
    });

    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText(/at least 6/i);
    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid email or password' }),
    });

    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText(/at least 6/i);
    await user.type(emailInput, 'wrong@test.com');
    await user.type(passwordInput, 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    render(
      <Wrapper>
        <AuthForm mode="login" onSuccess={mockOnSuccess} onToggle={mockOnToggle} />
      </Wrapper>
    );

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText(/at least 6/i);
    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });
});
