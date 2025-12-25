import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders card with content', () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders card with all sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card description text')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies custom className to Card', () => {
    render(
      <Card className="custom-card" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass('custom-card');
  });

  it('applies custom className to CardHeader', () => {
    render(
      <Card>
        <CardHeader className="custom-header" data-testid="header">
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByTestId('header')).toHaveClass('custom-header');
  });

  it('applies custom className to CardContent', () => {
    render(
      <Card>
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
      </Card>
    );
    expect(screen.getByTestId('content')).toHaveClass('custom-content');
  });

  it('applies custom className to CardFooter', () => {
    render(
      <Card>
        <CardFooter className="custom-footer" data-testid="footer">
          Footer
        </CardFooter>
      </Card>
    );
    expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
  });

  it('has correct base styles', () => {
    render(
      <Card data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass('rounded-lg', 'border', 'bg-card');
  });
});
