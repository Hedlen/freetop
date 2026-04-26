import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlidingLayout } from '../SlidingLayout';

// Mock BrowserEmbedView to avoid complex dependencies
vi.mock('../BrowserEmbedView', () => ({
  BrowserEmbedView: () => <div data-testid="browser-embed" />,
}));

describe('SlidingLayout', () => {
  it('renders children', () => {
    render(
      <SlidingLayout isOpen={false} onClose={vi.fn()}>
        <div data-testid="main-content">Main</div>
      </SlidingLayout>
    );
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('shows side panel when isOpen=true', () => {
    render(
      <SlidingLayout isOpen={true} onClose={vi.fn()} sidePanel={<div data-testid="panel-content">Panel</div>}>
        <div>Main</div>
      </SlidingLayout>
    );
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('hides side panel when isOpen=false', () => {
    render(
      <SlidingLayout isOpen={false} onClose={vi.fn()} sidePanel={<div data-testid="panel-content">Panel</div>}>
        <div>Main</div>
      </SlidingLayout>
    );
    // Panel content should not be in DOM when closed and not animating
    expect(screen.queryByTestId('panel-content')).not.toBeInTheDocument();
  });

  it('does not access window.innerWidth during render (SSR safe)', () => {
    // If window.innerWidth is accessed during render, this would throw in SSR
    // We verify by checking no direct window.innerWidth usage causes errors
    const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    let accessed = false;
    Object.defineProperty(window, 'innerWidth', {
      get() {
        accessed = true;
        return 1024;
      },
      configurable: true,
    });

    render(
      <SlidingLayout isOpen={true} onClose={vi.fn()}>
        <div>Main</div>
      </SlidingLayout>
    );

    // Restore
    if (originalInnerWidth) {
      Object.defineProperty(window, 'innerWidth', originalInnerWidth);
    }

    // window.innerWidth should NOT be accessed during render
    expect(accessed).toBe(false);
  });

  it('applies panelWidth prop as CSS width', () => {
    const { container } = render(
      <SlidingLayout isOpen={true} onClose={vi.fn()} panelWidth="400px" sidePanel={<div>Panel</div>}>
        <div>Main</div>
      </SlidingLayout>
    );
    // Find the panel element with the custom width
    const panelEl = container.querySelector('[style*="400px"]');
    expect(panelEl).toBeTruthy();
  });
});
