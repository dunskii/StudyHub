import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps {
  /** The ID of the element to skip to (without the #) */
  targetId: string;
  /** The text to display in the skip link */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Skip link component for keyboard navigation.
 * Allows keyboard users to skip directly to main content.
 * Should be placed at the beginning of the page.
 */
const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  children = 'Skip to main content',
  className,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden by default
        'sr-only',
        // Visible when focused
        'focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:px-4 focus:py-2 focus:rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'font-medium text-sm',
        className
      )}
    >
      {children}
    </a>
  );
};
SkipLink.displayName = 'SkipLink';

export { SkipLink };
