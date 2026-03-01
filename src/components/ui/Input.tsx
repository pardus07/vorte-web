"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          type={type}
          id={id}
          className={cn(
            "flex h-11 w-full border border-gray-300 bg-white px-4 text-sm transition-colors",
            "placeholder:text-gray-400",
            "focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
