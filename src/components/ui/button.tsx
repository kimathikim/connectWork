import React, { ButtonHTMLAttributes, forwardRef } from "react"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg"
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

    const variantStyles = {
      default: "bg-[#CC7357] text-white hover:bg-[#B66347]",
      outline: "border border-gray-300 bg-transparent hover:bg-gray-100",
      ghost: "bg-transparent hover:bg-gray-100",
      link: "bg-transparent underline-offset-4 hover:underline"
    }

    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6 text-lg"
    }

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

    return (
      <button className={combinedClassName} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"