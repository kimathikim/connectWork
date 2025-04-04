import React from 'react'
import { useFormContext, Controller, FieldValues, FieldPath } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  children,
}: {
  name: TName
  children: React.ReactNode
}) => {
  return (
    <FormFieldContext.Provider value={{ name }}>
      {children}
    </FormFieldContext.Provider>
  )
}

export const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  
  if (!fieldContext) {
    throw new Error('useFormField must be used within a FormField')
  }
  
  return fieldContext
}

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function FormItem({ className = '', children, ...props }: FormItemProps) {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {children}
    </div>
  )
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
}

export function FormLabel({ className = '', children, ...props }: FormLabelProps) {
  const { name } = useFormField()
  
  return (
    <label
      htmlFor={name}
      className={`block text-sm font-medium text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  )
}

interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function FormControl({ children, ...props }: FormControlProps) {
  const { name } = useFormField()
  const { formState, getFieldState } = useFormContext()
  const { error } = getFieldState(name, formState)
  
  return (
    <div {...props}>
      {children}
      {error && (
        <div className="flex items-center mt-1 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  )
}

export function FormDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-gray-500 ${className}`}
      {...props}
    >
      {children}
    </p>
  )
}

export function FormMessage({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { name } = useFormField()
  const { formState } = useFormContext()
  const { error } = formState.errors[name] || {}
  
  if (!error) {
    return null
  }
  
  return (
    <p
      className={`text-sm font-medium text-red-500 ${className}`}
      {...props}
    >
      {error.message?.toString() || children}
    </p>
  )
}

export function Form({
  className = '',
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={`space-y-6 ${className}`}
      {...props}
    >
      {children}
    </form>
  )
}
