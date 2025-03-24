import React, { createContext, useContext, useState } from "react"

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a TabsProvider")
  }
  return context
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Tabs({ defaultValue, value, onValueChange, children, ...props }: TabsProps) {
  const [tabValue, setTabValue] = useState(defaultValue)
  
  const contextValue = {
    value: value !== undefined ? value : tabValue,
    onValueChange: (newValue: string) => {
      setTabValue(newValue)
      onValueChange?.(newValue)
    }
  }
  
  return (
    <TabsContext.Provider value={contextValue}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TabsList({ className = "", children, ...props }: TabsListProps) {
  return (
    <div className={`flex space-x-1 rounded-lg bg-gray-100 p-1 ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children: React.ReactNode
}

export function TabsTrigger({ className = "", value, children, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isSelected = selectedValue === value
  
  return (
    <button
      className={`px-3 py-1.5 text-sm font-medium transition-all rounded-md ${
        isSelected 
          ? "bg-white text-blue-900 shadow-sm" 
          : "text-gray-600 hover:text-blue-900"
      } ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function TabsContent({ className = "", value, children, ...props }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext()
  
  if (selectedValue !== value) {
    return null
  }
  
  return (
    <div className={`mt-2 ${className}`} {...props}>
      {children}
    </div>
  )
}