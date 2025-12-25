import * as React from 'react';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 * Useful for providing accessible labels that shouldn't be visible.
 */
const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  VisuallyHiddenProps
>(({ children, asChild = false }, ref) => (
  <VisuallyHiddenPrimitive.Root ref={ref} asChild={asChild}>
    {children}
  </VisuallyHiddenPrimitive.Root>
));
VisuallyHidden.displayName = 'VisuallyHidden';

export { VisuallyHidden };
