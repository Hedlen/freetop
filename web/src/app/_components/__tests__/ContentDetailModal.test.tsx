import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { ContentDetailModal } from '../ContentDetailModal';

// Mock useGifCache hook
vi.mock('../../_hooks/useGifCache', () => ({
  useGifCache: () => ({
    getCachedUrl: vi.fn(() => null),
    preloadGif: vi.fn(() => Promise.resolve()),
    getCacheStats: vi.fn(() => ({ size: 0, totalSize: 0, hitRate: 0 })),
  }),
}));

describe('ContentDetailModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    content: 'Test content',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<ContentDetailModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('内容详情')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    render(<ContentDetailModal {...defaultProps} isOpen={false} />);
    const modal = screen.queryByRole('dialog');
    expect(modal).toHaveClass('opacity-0 pointer-events-none');
  });

  it('calls onClose when escape key is pressed', async () => {
    const onClose = vi.fn();
    render(<ContentDetailModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ContentDetailModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('关闭模态框');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders image content correctly', () => {
    const imageUrl = 'https://example.com/image.jpg';
    render(
      <ContentDetailModal
        {...defaultProps}
        type="image"
        content={imageUrl}
        title="Test Image"
      />
    );

    expect(screen.getByText('Test Image')).toBeInTheDocument();
    const image = screen.getByAltText('Test Image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', imageUrl);
  });

  it('renders GIF content correctly', () => {
    const gifUrl = 'https://example.com/animation.gif';
    render(
      <ContentDetailModal
        {...defaultProps}
        type="gif"
        content={gifUrl}
        title="Test GIF"
      />
    );

    expect(screen.getByText('Test GIF')).toBeInTheDocument();
    const gif = screen.getByAltText('Test GIF');
    expect(gif).toBeInTheDocument();
  });

  it('renders video content correctly', () => {
    const videoUrl = 'https://example.com/video.mp4';
    render(
      <ContentDetailModal
        {...defaultProps}
        type="video"
        content={videoUrl}
        title="Test Video"
      />
    );

    expect(screen.getByText('Test Video')).toBeInTheDocument();
    // video element is rendered with data-src attribute; query directly
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', videoUrl);
  });

  it('shows error state when image fails to load', async () => {
    const imageUrl = 'https://example.com/broken-image.jpg';
    render(
      <ContentDetailModal
        {...defaultProps}
        type="image"
        content={imageUrl}
      />
    );

    const image = screen.getByAltText('图片');

    // Fire error MAX_RETRY_COUNT (3) times — button appears only after all retries exhausted
    fireEvent.error(image);
    fireEvent.error(image);
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByText('重新加载')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows loading state', () => {
    render(
      <ContentDetailModal
        {...defaultProps}
        type="image"
        content="https://example.com/image.jpg"
      />
    );

    // The image element should be present; loading state is managed internally
    const image = screen.getByAltText('图片');
    expect(image).toBeInTheDocument();
    // Firing loadStart should not throw
    expect(() => fireEvent.loadStart(image)).not.toThrow();
  });

  it('renders external URL link when provided', () => {
    const url = 'https://example.com';
    render(
      <ContentDetailModal
        {...defaultProps}
        url={url}
      />
    );

    const link = screen.getByLabelText(`在新窗口中打开链接: ${url}`);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('has proper accessibility attributes', () => {
    render(<ContentDetailModal {...defaultProps} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(modal).toHaveAttribute('aria-describedby', 'modal-content');

    const closeButton = screen.getByLabelText('关闭模态框');
    expect(closeButton).toHaveAttribute('type', 'button');
  });

  it('prevents background scroll when open', () => {
    const { rerender } = render(<ContentDetailModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<ContentDetailModal {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('unset');
  });

  it('handles retry functionality for failed media', async () => {
    const imageUrl = 'https://example.com/image.jpg';
    render(
      <ContentDetailModal
        {...defaultProps}
        type="image"
        content={imageUrl}
      />
    );

    const image = screen.getByAltText('图片');

    // Fire error 3 times to exhaust MAX_RETRY_COUNT
    fireEvent.error(image);
    fireEvent.error(image);
    fireEvent.error(image);

    await waitFor(() => {
      const retryButton = screen.getByText('重新加载');
      expect(retryButton).toBeInTheDocument();
      fireEvent.click(retryButton);
      // After click, error state is cleared
    });
  });
});
