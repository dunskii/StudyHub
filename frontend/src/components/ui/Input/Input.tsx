import * as React from 'react';
import { cn } from '@/lib/utils';
import { getErrorId, getHintId, combineDescribedBy } from '@/lib/a11y';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message to display */
  error?: string;
  /** Hint text to display below the input */
  hint?: string;
  /** Whether the input has an error (alternative to error prop) */
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, id, error, hint, hasError, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = error ? getErrorId(inputId) : undefined;
    const hintId = hint ? getHintId(inputId) : undefined;
    const describedBy = combineDescribedBy(ariaDescribedBy, errorId, hintId);
    const showError = error || hasError;

    return (
      <div className="w-full">
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            showError && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
