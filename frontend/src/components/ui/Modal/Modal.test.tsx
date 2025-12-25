import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Modal,
} from './Modal';
import { Button } from '../Button/Button';

describe('Dialog Components', () => {
  it('renders dialog when trigger is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogHeader>
          <p>Dialog content here</p>
        </DialogContent>
      </Dialog>
    );

    // Dialog should not be visible initially
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();

    // Click trigger to open dialog
    fireEvent.click(screen.getByText('Open Dialog'));

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog content here')).toBeInTheDocument();
    });
  });

  it('has close button with accessibility label', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    );

    // Check for sr-only close button
    await waitFor(() => {
      expect(screen.getByText('Close')).toHaveClass('sr-only');
    });
  });

  it('renders DialogFooter correctly', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
          <DialogFooter data-testid="footer">
            <Button>Cancel</Button>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });
});

describe('Modal', () => {
  it('renders with title and description', async () => {
    render(
      <Modal
        open={true}
        title="Modal Title"
        description="Modal description text"
      >
        <p>Modal content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal description text')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });
  });

  it('renders with footer', async () => {
    render(
      <Modal
        open={true}
        title="Test Modal"
        footer={<Button>Action</Button>}
      >
        <p>Content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  it('renders with trigger', async () => {
    render(
      <Modal
        title="Triggered Modal"
        trigger={<Button>Open Modal</Button>}
      >
        <p>Triggered content</p>
      </Modal>
    );

    expect(screen.getByText('Open Modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Open Modal'));

    await waitFor(() => {
      expect(screen.getByText('Triggered Modal')).toBeInTheDocument();
      expect(screen.getByText('Triggered content')).toBeInTheDocument();
    });
  });

  it('calls onOpenChange when opened/closed', async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal
        open={false}
        onOpenChange={onOpenChange}
        trigger={<Button>Toggle</Button>}
        title="Test"
      >
        <p>Content</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('Toggle'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('renders without title and description', async () => {
    render(
      <Modal open={true}>
        <p>Just content</p>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByText('Just content')).toBeInTheDocument();
    });
  });
});
