import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ContentDetailModal } from '../ContentDetailModal';

// Mock useGifCache hook
jest.mock('../../_hooks/useGifCache', () => ({
  useGifCache: () => ({
    getCachedUrl: jest.fn(() => null),
    preloadGif: jest.fn(() => Promise.resolve()),
    getCacheStats: jest.fn(() => ({ size: 0, totalSize: 0, hitRate: 0 })),
  }),
}));

describe('ContentDetailModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    content: 'Test content',
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    const onClose = jest.fn();
    render(<ContentDetailModal {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
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
    const video = screen.getByRole('application'); // video element
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
    fireEvent.error(image);
    
    // Should show retry button after max retries
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
    
    const image = screen.getByAltText('图片');
    fireEvent.loadStart(image);
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // loading spinner
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
    
    // Simulate multiple failures to reach retry limit
    for (let i = 0; i < 3; i++) {
      fireEvent.error(image);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await waitFor(() => {
      const retryButton = screen.getByText('重新加载');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      // Should clear error and attempt reload
    });
  });
});