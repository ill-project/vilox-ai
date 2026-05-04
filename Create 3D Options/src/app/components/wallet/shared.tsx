import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[16px] bg-[#111827] border border-[#1F2937] text-white shadow-sm overflow-hidden",
        "relative before:absolute before:inset-0 before:bg-white/[0.03] before:pointer-events-none",
        "backdrop-blur-md",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card"

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: "bg-[#4F7CFF] text-white hover:bg-[#4F7CFF]/90 hover:shadow-[0_0_15px_rgba(79,124,255,0.4)] border border-[#4F7CFF]/20",
      secondary: "bg-[#111827] text-white hover:bg-[#1F2937] border border-[#1F2937] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
      danger: "bg-[#FF4D4D] text-white hover:bg-[#FF4D4D]/90 hover:shadow-[0_0_15px_rgba(255,77,77,0.4)] border border-[#FF4D4D]/20",
      ghost: "bg-transparent text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50 border border-transparent"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[12px] px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F7CFF] focus:ring-offset-2 focus:ring-offset-[#0B0F1A] disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
);
Button.displayName = "Button"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-[12px] border border-[#1F2937] bg-[#0E1628] px-3 py-2 text-sm text-white placeholder:text-[#9CA3AF]",
          "focus:outline-none focus:ring-1 focus:ring-[#4F7CFF] focus:border-[#4F7CFF] transition-all",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-11 w-full appearance-none rounded-[12px] border border-[#1F2937] bg-[#0E1628] px-3 py-2 text-sm text-white",
          "focus:outline-none focus:ring-1 focus:ring-[#4F7CFF] focus:border-[#4F7CFF] transition-all",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
Select.displayName = "Select"

export const Badge = ({ className, variant = 'default', children, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'success' | 'warning' | 'error' | 'default' }) => {
  const variants = {
    success: "bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    error: "bg-[#FF4D4D]/10 text-[#FF4D4D] border-[#FF4D4D]/20",
    default: "bg-[#1F2937] text-[#9CA3AF] border-[#1F2937]"
  }

  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props}>
      {children}
    </div>
  )
}
