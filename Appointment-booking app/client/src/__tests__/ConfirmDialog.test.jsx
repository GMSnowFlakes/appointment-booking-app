import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfirmDialog from '../components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Test"
        message="Test message"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete Item?"
        message="Are you sure you want to delete this item?"
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test message"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    await user.click(screen.getByText('Confirm'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test message"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test message"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    // The backdrop has role="presentation" (no explicit role) and aria-hidden
    // Click the backdrop by its aria-modal=false position
    const allFixedElements = document.querySelectorAll('.fixed.inset-0');
    // The backdrop is the element with bg-black/50
    const backdrop = Array.from(allFixedElements).find(el =>
      el.className.includes('bg-black')
    );
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('renders with danger variant', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Danger Action"
        message="This is dangerous"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Danger Action')).toBeInTheDocument();
  });

  it('renders with primary variant', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Primary Action"
        message="This is primary"
        confirmLabel="Save"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Primary Action')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Warning Action"
        message="This is a warning"
        confirmLabel="Proceed"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByText('Warning Action')).toBeInTheDocument();
  });

  it('disables buttons in loading state', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test message"
        confirmLabel="Deleting"
        cancelLabel="Cancel"
        loading={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    const cancelBtn = screen.getByText('Cancel').closest('button');
    const confirmBtn = screen.getByText(/deleting/i).closest('button');
    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();
  });
});
