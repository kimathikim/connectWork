import React, { createContext, useContext, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type: ToastType) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`flex items-center p-4 rounded-md shadow-md ${
              toast.type === 'success'
                ? 'bg-green-50 border-l-4 border-green-500'
                : toast.type === 'error'
                ? 'bg-red-50 border-l-4 border-red-500'
                : 'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex-shrink-0 mr-3">
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Info className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <div className="flex-1 mr-2">
              <p
                className={`text-sm font-medium ${
                  toast.type === 'success'
                    ? 'text-green-800'
                    : toast.type === 'error'
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}
              >
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-auto"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Auto-dismiss toasts after 5 seconds
function ToastWithTimer({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return null
}
