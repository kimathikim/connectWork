import React, { forwardRef } from 'react'
import { LucideIcon } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  error?: boolean
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon: Icon, error, helperText, ...props }, ref) => {
    return (
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          className={`w-full ${
            Icon ? 'pl-10' : 'pl-3'
          } pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-[#CC7357] focus:ring-[#CC7357]'
          } ${className}`}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
