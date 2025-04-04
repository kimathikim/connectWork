import React, { Fragment } from 'react'
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  initialFocus?: React.RefObject<HTMLElement>
}

export function Dialog({ isOpen, onClose, children, initialFocus }: DialogProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <HeadlessDialog 
        as="div" 
        className="relative z-50" 
        onClose={onClose}
        initialFocus={initialFocus}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {children}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  )
}

export function DialogTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <HeadlessDialog.Title
      as="h3"
      className={`text-lg font-medium leading-6 text-gray-900 ${className}`}
      {...props}
    />
  )
}

export function DialogDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <HeadlessDialog.Description
      className={`mt-2 text-sm text-gray-500 ${className}`}
      {...props}
    />
  )
}

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

export function DialogClose({ className = "", ...props }: DialogCloseProps) {
  return (
    <button
      className={`absolute top-4 right-4 inline-flex items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
      <span className="sr-only">Close</span>
    </button>
  )
}

export function DialogFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-6 flex justify-end space-x-2 ${className}`}
      {...props}
    />
  )
}
