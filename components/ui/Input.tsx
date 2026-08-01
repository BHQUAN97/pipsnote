import { forwardRef, type InputHTMLAttributes } from 'react';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`min-h-[44px] rounded-sm border border-gray-line bg-bg px-4 py-2 text-sm text-ink outline-none transition-colors placeholder:text-gray-mid focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 disabled:opacity-50 ${className}`.trim()}
        {...props}
      />
    );
  }
);

export default Input;
